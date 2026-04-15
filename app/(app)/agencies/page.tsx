import { AgencyManager } from "@/components/agency-manager";
import { getAgenciesForCurrentUser, getAgencyIdForCurrentUser } from "@/lib/data";

export default async function AgenciesPage() {
  const [agencies, activeAgencyId] = await Promise.all([
    getAgenciesForCurrentUser(),
    getAgencyIdForCurrentUser()
  ]);

  return (
    <main>
      <AgencyManager agencies={agencies} activeAgencyId={activeAgencyId} />
    </main>
  );
}
