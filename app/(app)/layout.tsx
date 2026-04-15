import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { AgencySwitcher } from "@/components/agency-switcher";
import { getAgenciesForCurrentUser, getAgencyIdForCurrentUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const [agencies, activeAgencyId] = await Promise.all([
    getAgenciesForCurrentUser(),
    getAgencyIdForCurrentUser()
  ]);

  return (
    <div className="container">
      <header
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>Agency Finance</span>
          <NavLinks />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <AgencySwitcher agencies={agencies} activeAgencyId={activeAgencyId} />
          <SignOutButton />
        </div>
      </header>

      {children}
    </div>
  );
}
