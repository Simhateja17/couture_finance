import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_AGENCY_COOKIE } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const agencyId = (body.agencyId as string | undefined)?.trim();

  if (!agencyId) {
    return NextResponse.json({ error: "agencyId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: membership, error } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "You do not belong to this agency" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_AGENCY_COOKIE, agencyId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
