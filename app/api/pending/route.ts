import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAgencyIdForCurrentUser } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const paymentType = body.paymentType as "receivable" | "payable" | undefined;
  const name = (body.name as string | undefined)?.trim();
  const amount = Number(body.amount);
  const dueDate = (body.dueDate as string | null) ?? null;
  const memberId = (body.memberId as string | null) ?? null;
  const note = (body.note as string | null) ?? null;

  if (!paymentType || !["receivable", "payable"].includes(paymentType)) {
    return NextResponse.json({ error: "paymentType must be receivable or payable" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  let agencyId: string | null = null;
  try {
    agencyId = await getOrCreateAgencyIdForCurrentUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve agency";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (!agencyId) {
    return NextResponse.json({ error: "No agency found" }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pending_payments").insert({
    agency_id: agencyId,
    payment_type: paymentType,
    name,
    amount,
    due_date: dueDate || null,
    member_id: memberId,
    note,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
