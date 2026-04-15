import { MemberForm } from "@/components/member-form";
import { getTeamMembers } from "@/lib/data";

export default async function MembersPage() {
  const members = await getTeamMembers();

  return (
    <main className="grid grid-2" style={{ alignItems: "start" }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add Team Member</h2>
        <MemberForm />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Team Members</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name}</td>
                  <td>{member.role ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
