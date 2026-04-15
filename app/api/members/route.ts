import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateAgencyIdForCurrentUser } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const fullName = (body.fullName as string | undefined)?.trim();
  const role = (body.role as string | null) ?? null;

  if (!fullName) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
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
  const { error } = await supabase.from("team_members").insert({
    agency_id: agencyId,
    full_name: fullName,
    role
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
