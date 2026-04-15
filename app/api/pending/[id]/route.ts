import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyIdForCurrentUser } from "@/lib/data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const isPaid = body.is_paid as boolean;

  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_payments")
    .update({ is_paid: isPaid })
    .eq("id", id)
    .eq("agency_id", agencyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_payments")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
