import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAgencyIdForCurrentUser } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const entryType = body.entryType as "earning" | "expense" | undefined;
  const amount = Number(body.amount);
  const happenedOn = body.happenedOn as string | undefined;
  const memberId = (body.memberId as string | null) ?? null;
  const name = (body.name as string | null) ?? null;
  const note = (body.note as string | null) ?? null;

  if (!entryType || !["earning", "expense"].includes(entryType)) {
    return NextResponse.json({ error: "entryType must be earning or expense" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  if (!happenedOn) {
    return NextResponse.json({ error: "happenedOn is required" }, { status: 400 });
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
  const { error } = await supabase.from("finance_entries").insert({
    agency_id: agencyId,
    entry_type: entryType,
    amount,
    happened_on: happenedOn,
    member_id: memberId,
    name,
    note
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
