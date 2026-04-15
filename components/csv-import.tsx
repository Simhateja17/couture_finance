"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ParsedRow = {
  date: string;
  type: string;
  amount: string;
  note: string;
  memberName: string;
  error?: string;
};

function normalizeDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    const first = Number(a);
    const second = Number(b);

    // Prefer day/month for finance sheets. If impossible, flip.
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }

  return "";
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, "").replace(/\s+/g, "_"));
  const idx = {
    date: headers.findIndex((h) => ["date", "happened_on", "transaction_date"].includes(h)),
    type: headers.findIndex((h) => ["type", "entry_type", "transaction_type", "category"].includes(h)),
    amount: headers.findIndex((h) => ["amount", "amount_inr", "value", "total"].includes(h)),
    note: headers.findIndex((h) =>
      ["note", "expense", "income", "description", "particulars", "item", "name", "title", "details"].includes(h),
    ),
    member: headers.findIndex((h) => ["member_name", "member"].includes(h)),
  };

  const inferredType =
    idx.type >= 0
      ? null
      : headers.includes("expense")
        ? "expense"
        : headers.includes("income") || headers.includes("earning")
          ? "earning"
          : null;

  if (idx.date === -1 || idx.amount === -1 || (idx.type === -1 && !inferredType)) {
    return [
      {
        date: "",
        type: "",
        amount: "",
        note: "",
        memberName: "",
        error: "Missing required columns: date, amount, and type (or inferable expense/income column)",
      },
    ];
  }

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const date = normalizeDate(cols[idx.date] ?? "");
      const type = ((idx.type >= 0 ? cols[idx.type] : inferredType) ?? "").toLowerCase();
      const amount = (cols[idx.amount] ?? "").replace(/[^\d.-]/g, "");
      const note = idx.note >= 0 ? (cols[idx.note] ?? "") : "";
      const memberName = idx.member >= 0 ? (cols[idx.member] ?? "") : "";

      let error: string | undefined;
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) error = "Date must be YYYY-MM-DD";
      else if (!["earning", "expense"].includes(type)) error = "Type must be earning or expense";
      else if (isNaN(Number(amount)) || Number(amount) <= 0) error = "Amount must be positive";

      return { date, type, amount, note, memberName, error };
    });
}

export function CsvImport() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ imported: number } | { error: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function normalizeWithAI(file: File): Promise<ParsedRow[]> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/entries/normalize", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "AI normalization failed");
    }

    return data.rows as ParsedRow[];
  }

  async function handleFile(file: File) {
    setResult(null);
    setAnalyzing(true);
    try {
      const isLikelyCsv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");

      if (isLikelyCsv) {
        const raw = await file.text();
        const localRows = parseCSV(raw);
        const hasSchemaError = localRows.some((r) => r.error?.includes("Missing required columns"));
        const hasValidRows = localRows.some((r) => !r.error);

        if (!hasSchemaError && hasValidRows) {
          setRows(localRows);
          return;
        }
      }

      const aiRows = await normalizeWithAI(file);
      setRows(aiRows);
    } catch (error) {
      setRows([]);
      setResult({ error: error instanceof Error ? error.message : "Could not read this file" });
    } finally {
      setAnalyzing(false);
    }
  }

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  async function handleImport() {
    setImportLoading(true);
    try {
      const res = await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: validRows.map((r) => ({
            happenedOn: r.date,
            entryType: r.type,
            amount: Number(r.amount),
            note: r.note || null,
            memberName: r.memberName || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Import failed" });
      } else {
        setResult({ imported: data.imported });
        setRows([]);
        router.refresh();
      }
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div>
      <div
        className={`csv-drop-zone${dragging ? " dragging" : ""}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain,image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)", marginBottom: 8 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p style={{ margin: 0, fontWeight: 500 }}>Drop file or click to browse</p>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          Upload standard CSV directly, or let AI convert non-standard CSV/text/screenshots into: <code>date</code>, <code>type</code>, <code>amount</code>, <code>note</code>, <code>member_name</code>
        </p>
      </div>

      {analyzing && (
        <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
          Analyzing file and converting to import format...
        </p>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <span>
              <strong>{validRows.length}</strong> valid
            </span>
            {errorRows.length > 0 && (
              <span className="negative">
                <strong>{errorRows.length}</strong> with errors
              </span>
            )}
          </div>
          <div style={{ overflowX: "auto", maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Member</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={row.error ? { background: "#fff5f5" } : undefined}>
                    <td>{row.date || "—"}</td>
                    <td>
                      {row.type ? (
                        <span className={`badge ${row.type === "earning" ? "badge-positive" : "badge-negative"}`}>
                          {row.type}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.amount || "—"}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{row.note || "—"}</td>
                    <td style={{ fontSize: 13 }}>{row.memberName || "—"}</td>
                    <td>
                      {row.error ? (
                        <span style={{ color: "var(--negative)", fontSize: 12 }}>{row.error}</span>
                      ) : (
                        <span style={{ color: "var(--positive)" }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validRows.length > 0 && (
            <button className="primary" style={{ marginTop: 12 }} onClick={handleImport} disabled={importLoading || analyzing}>
              {importLoading ? "Importing…" : `Import ${validRows.length} entr${validRows.length === 1 ? "y" : "ies"}`}
            </button>
          )}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid",
            ...("imported" in result
              ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
              : { background: "#fff5f5", borderColor: "#fecaca" }),
          }}
        >
          {"imported" in result ? (
            <p className="positive" style={{ margin: 0 }}>
              ✓ {result.imported} entries imported successfully
            </p>
          ) : (
            <p className="negative" style={{ margin: 0 }}>
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
