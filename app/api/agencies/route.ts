import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_AGENCY_COOKIE } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body.name as string | undefined)?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let agency: { id: string; name: string } | null = null;
  let agencyError: { message: string } | null = null;

  const { data: normalAgency, error: normalAgencyError } = await supabase
    .from("agencies")
    .insert({ name })
    .select("id, name")
    .single();

  agency = normalAgency;
  agencyError = normalAgencyError;

  if (!agency) {
    try {
      const admin = createAdminClient();
      const { data: adminAgency, error: adminAgencyError } = await admin
        .from("agencies")
        .insert({ name })
        .select("id, name")
        .single();

      agency = adminAgency;
      agencyError = adminAgencyError;
    } catch (error) {
      agencyError = { message: error instanceof Error ? error.message : "Failed to create agency" };
    }
  }

  if (!agency || agencyError) {
    return NextResponse.json({ error: agencyError?.message ?? "Failed to create agency" }, { status: 500 });
  }

  let membershipError: { message: string } | null = null;
  const { error: normalMembershipError } = await supabase.from("agency_users").insert({
    agency_id: agency.id,
    user_id: user.id,
    role: "owner"
  });
  membershipError = normalMembershipError;

  if (membershipError) {
    try {
      const admin = createAdminClient();
      const { error: adminMembershipError } = await admin.from("agency_users").insert({
        agency_id: agency.id,
        user_id: user.id,
        role: "owner"
      });
      membershipError = adminMembershipError;
    } catch (error) {
      membershipError = { message: error instanceof Error ? error.message : "Failed to create agency membership" };
    }
  }

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, agencyId: agency.id });
  response.cookies.set(ACTIVE_AGENCY_COOKIE, agency.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
