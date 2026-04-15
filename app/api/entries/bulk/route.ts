import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAgencyIdForCurrentUser } from "@/lib/data";

type BulkEntry = {
  entryType: "earning" | "expense";
  amount: number;
  happenedOn: string;
  note: string | null;
  memberName: string | null;
};

export async function POST(request: Request) {
  const body = await request.json();
  const entries: BulkEntry[] = body.entries;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries must be a non-empty array" }, { status: 400 });
  }

  if (entries.length > 500) {
    return NextResponse.json({ error: "Maximum 500 entries per import" }, { status: 400 });
  }

  let agencyId: string | null = null;
  try {
    agencyId = await getOrCreateAgencyIdForCurrentUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve agency for current user";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (!agencyId) {
    return NextResponse.json({ error: "No agency found for current user" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("agency_id", agencyId);

  const memberMap = new Map((members ?? []).map((m) => [m.full_name.toLowerCase(), m.id]));

  const rows = entries.map((e) => ({
    agency_id: agencyId,
    entry_type: e.entryType,
    amount: e.amount,
    happened_on: e.happenedOn,
    note: e.note || null,
    member_id: e.memberName ? (memberMap.get(e.memberName.toLowerCase()) ?? null) : null,
  }));

  const { error } = await supabase.from("finance_entries").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: rows.length });
}
