import { NextResponse } from "next/server";

type ParsedRow = {
  date: string;
  type: string;
  amount: string;
  note: string;
  memberName: string;
  error?: string;
};

type NormalizationResponse = {
  rows: Array<{
    date?: unknown;
    type?: unknown;
    amount?: unknown;
    note?: unknown;
    memberName?: unknown;
  }>;
  warnings?: unknown;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 24_000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeRows(rawRows: NormalizationResponse["rows"]): ParsedRow[] {
  return rawRows.slice(0, 500).map((row) => {
    const date = typeof row.date === "string" ? row.date.trim() : "";
    const type = typeof row.type === "string" ? row.type.trim().toLowerCase() : "";

    const amountValue =
      typeof row.amount === "number"
        ? row.amount
        : typeof row.amount === "string"
          ? Number(row.amount.replace(/[^\d.-]/g, ""))
          : NaN;

    const amount = Number.isFinite(amountValue) ? String(amountValue) : "";
    const note = typeof row.note === "string" ? row.note.trim() : "";
    const memberName = typeof row.memberName === "string" ? row.memberName.trim() : "";

    let error: string | undefined;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) error = "Date must be YYYY-MM-DD";
    else if (!["earning", "expense"].includes(type)) error = "Type must be earning or expense";
    else if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) error = "Amount must be positive";

    return { date, type, amount, note, memberName, error };
  });
}

function resolveAzureBaseEndpoint(rawEndpoint: string): string {
  const endpoint = rawEndpoint.trim();

  try {
    const parsed = new URL(endpoint);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    const withoutQuery = endpoint.split("?")[0] ?? endpoint;
    const withoutOpenAIPath = withoutQuery.replace(/\/openai\/?.*$/i, "");
    return withoutOpenAIPath.replace(/\/+$/, "");
  }
}

function extractContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textPart = content.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item as { type?: unknown }).type === "text" &&
        "text" in item,
    ) as { text?: unknown } | undefined;

    if (textPart && typeof textPart.text === "string") {
      return textPart.text;
    }
  }

  return "";
}

async function toAIInput(file: File): Promise<{ messages: Array<Record<string, unknown>>; fileType: string }> {
  const mime = file.type || "application/octet-stream";

  if (mime.startsWith("image/")) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

    return {
      fileType: "image",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This is a payment/finance screenshot. Extract entries and map to required schema.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    };
  }

  const text = (await file.text()).slice(0, MAX_TEXT_CHARS);

  return {
    fileType: "text",
    messages: [
      {
        role: "user",
        content: `File name: ${file.name}\n\nRaw content:\n${text}`,
      },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "file is too large (max 5MB)" }, { status: 400 });
    }

    const endpoint = resolveAzureBaseEndpoint(env("AZURE_OPENAI_ENDPOINT"));
    const apiKey = env("AZURE_OPENAI_API_KEY");
    const deployment = env("AZURE_OPENAI_DEPLOYMENT");
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

    const { messages } = await toAIInput(file);

    const systemPrompt = [
      "You are a finance data normalizer.",
      "Convert uploaded input into structured rows for CSV import.",
      "Return only JSON with this exact shape:",
      '{"rows":[{"date":"YYYY-MM-DD","type":"earning|expense","amount":"number","note":"string","memberName":"string"}],"warnings":["..."]}',
      "Rules:",
      "1) Infer dates only when clear; otherwise leave empty string.",
      "2) Type must be earning or expense; map payment received/income to earning and payment sent/spend to expense.",
      "3) Amount must be positive numeric string without currency symbols or commas.",
      "4) If source has columns like expense, income, description, particulars, or item name, map that text to note.",
      "5) note and memberName can be empty strings.",
      "6) If type column is missing but file is clearly an expense sheet, set type=expense for all rows (similarly income->earning).",
      "7) If there are multiple transactions, include all of them.",
      "8) Do not include markdown or explanation text outside JSON.",
    ].join("\n");

    const aiRes = await fetch(
      `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0,
          max_completion_tokens: 1800,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!aiRes.ok) {
      const text = await aiRes.text();
      const hint =
        aiRes.status === 404
          ? " Check AZURE_OPENAI_ENDPOINT base URL and AZURE_OPENAI_DEPLOYMENT name."
          : "";
      return NextResponse.json({ error: `Azure OpenAI request failed (${aiRes.status}): ${text.slice(0, 240)}${hint}` }, { status: 502 });
    }

    const payload = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    const content = extractContentText(payload.choices?.[0]?.message?.content);

    if (!content) {
      return NextResponse.json({ error: "AI did not return content" }, { status: 502 });
    }

    let parsed: NormalizationResponse;
    try {
      parsed = JSON.parse(content) as NormalizationResponse;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }

    if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return NextResponse.json({ error: "No importable rows were found" }, { status: 422 });
    }

    const rows = normalizeRows(parsed.rows);

    return NextResponse.json({
      rows,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((w) => typeof w === "string") : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
