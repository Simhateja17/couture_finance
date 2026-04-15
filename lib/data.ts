import { format, subMonths } from "date-fns";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Agency, DashboardSummary, FinanceEntry, MonthlyChartData, PendingPayment, TeamMember } from "@/lib/types";

export const ACTIVE_AGENCY_COOKIE = "active_agency_id";

export async function getAgencyIdForCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("agency_users")
    .select("agency_id, role, created_at, agencies(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const memberships = (data ?? []).map((row) => ({
    id: row.agency_id,
    name: Array.isArray(row.agencies) ? row.agencies[0]?.name ?? "Untitled Agency" : row.agencies?.name ?? "Untitled Agency",
    role: row.role,
    created_at: row.created_at
  }));

  if (memberships.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const activeFromCookie = cookieStore.get(ACTIVE_AGENCY_COOKIE)?.value;
  if (activeFromCookie && memberships.some((agency) => agency.id === activeFromCookie)) {
    return activeFromCookie;
  }

  return memberships[0].id;
}

export async function getAgenciesForCurrentUser(): Promise<Agency[]> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("agency_users")
    .select("agency_id, role, created_at, agencies(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.agency_id,
    name: Array.isArray(row.agencies) ? row.agencies[0]?.name ?? "Untitled Agency" : row.agencies?.name ?? "Untitled Agency",
    role: row.role,
    created_at: row.created_at
  }));
}

export async function getOrCreateAgencyIdForCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: existingRows, error: existingError } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = existingRows?.[0];
  if (existing?.agency_id) {
    return existing.agency_id;
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    user.email?.split("@")[0] ||
    "My";

  const agencyName = `${displayName} Agency`;

  const { data: normalAgency, error: normalAgencyError } = await supabase
    .from("agencies")
    .insert({ name: agencyName })
    .select("id")
    .single();

  let agency = normalAgency;
  let agencyError = normalAgencyError;

  if (!agency) {
    try {
      const admin = createAdminClient();
      const { data: adminAgency, error: adminAgencyError } = await admin
        .from("agencies")
        .insert({ name: agencyName })
        .select("id")
        .single();
      agency = adminAgency;
      agencyError = adminAgencyError;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unable to auto-create agency");
    }
  }

  if (agencyError || !agency) {
    throw new Error(`Unable to auto-create agency. ${agencyError?.message ?? "Unknown error"}`);
  }

  const { error: normalMembershipError } = await supabase.from("agency_users").insert({
    agency_id: agency.id,
    user_id: user.id,
    role: "owner"
  });

  let membershipError = normalMembershipError;
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
      throw new Error(error instanceof Error ? error.message : "Agency created but membership link failed");
    }
  }

  if (membershipError) {
    throw new Error(`Agency created but membership link failed. ${membershipError.message}`);
  }

  return agency.id;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const agencyId = await getAgencyIdForCurrentUser();

  if (!agencyId) {
    return {
      totalEarnings: 0,
      totalExpenses: 0,
      profit: 0,
      memberCount: 0
    };
  }

  const supabase = await createClient();

  const [{ data: earnings }, { data: expenses }, { count: memberCount }] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("amount")
      .eq("agency_id", agencyId)
      .eq("entry_type", "earning"),
    supabase
      .from("finance_entries")
      .select("amount")
      .eq("agency_id", agencyId)
      .eq("entry_type", "expense"),
    supabase.from("team_members").select("id", { count: "exact", head: true }).eq("agency_id", agencyId)
  ]);

  const totalEarnings = (earnings ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpenses = (expenses ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    totalEarnings,
    totalExpenses,
    profit: totalEarnings - totalExpenses,
    memberCount: memberCount ?? 0
  };
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, full_name, role, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMonthlyChartData(): Promise<MonthlyChartData[]> {
  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return [];

  const supabase = await createClient();
  const sixMonthsAgo = format(subMonths(new Date(), 5), "yyyy-MM-01");

  const { data, error } = await supabase
    .from("finance_entries")
    .select("entry_type, amount, happened_on")
    .eq("agency_id", agencyId)
    .gte("happened_on", sixMonthsAgo)
    .order("happened_on", { ascending: true });

  if (error) throw new Error(error.message);

  const monthlyMap: Record<string, { earnings: number; expenses: number }> = {};

  for (const entry of data ?? []) {
    const key = entry.happened_on.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { earnings: 0, expenses: 0 };
    if (entry.entry_type === "earning") {
      monthlyMap[key].earnings += Number(entry.amount);
    } else {
      monthlyMap[key].expenses += Number(entry.amount);
    }
  }

  const result: MonthlyChartData[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const key = format(date, "yyyy-MM");
    const label = format(date, "MMM yy");
    const d = monthlyMap[key] ?? { earnings: 0, expenses: 0 };
    result.push({ month: label, earnings: d.earnings, expenses: d.expenses, profit: d.earnings - d.expenses });
  }

  return result;
}

export async function getEntries(): Promise<FinanceEntry[]> {
  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_entries")
    .select("id, entry_type, amount, name, note, happened_on, member_id, created_at, team_members(full_name)")
    .eq("agency_id", agencyId)
    .order("happened_on", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    member_name: Array.isArray(row.team_members)
      ? row.team_members[0]?.full_name ?? null
      : (row.team_members as { full_name?: string } | null)?.full_name ?? null
  }));
}

export async function getPendingPayments(): Promise<PendingPayment[]> {
  const agencyId = await getAgencyIdForCurrentUser();
  if (!agencyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_payments")
    .select("id, payment_type, name, amount, due_date, member_id, note, is_paid, created_at, team_members(full_name)")
    .eq("agency_id", agencyId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    member_name: Array.isArray(row.team_members)
      ? row.team_members[0]?.full_name ?? null
      : (row.team_members as { full_name?: string } | null)?.full_name ?? null
  }));
}
