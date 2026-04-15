import Link from "next/link";
import { Currency } from "@/components/currency";
import { ChartsSection } from "@/components/charts-section";
import { getDashboardSummary, getEntries, getMonthlyChartData } from "@/lib/data";

export default async function DashboardPage() {
  const [summary, entries, monthlyData] = await Promise.all([
    getDashboardSummary(),
    getEntries(),
    getMonthlyChartData(),
  ]);

  const profitMargin =
    summary.totalEarnings > 0 ? ((summary.profit / summary.totalEarnings) * 100).toFixed(1) : null;

  return (
    <main className="grid" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <section className="grid grid-4">
        <article className="card metric-card">
          <p className="muted" style={{ margin: "0 0 8px" }}>Total Earnings</p>
          <p className="metric positive" style={{ margin: 0 }}>
            <Currency amount={summary.totalEarnings} />
          </p>
        </article>

        <article className="card metric-card">
          <p className="muted" style={{ margin: "0 0 8px" }}>Total Expenses</p>
          <p className="metric negative" style={{ margin: 0 }}>
            <Currency amount={summary.totalExpenses} />
          </p>
        </article>

        <article className="card metric-card">
          <p className="muted" style={{ margin: "0 0 8px" }}>Net Profit</p>
          <p className={`metric ${summary.profit >= 0 ? "positive" : "negative"}`} style={{ margin: 0 }}>
            <Currency amount={summary.profit} />
          </p>
          {profitMargin !== null && (
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              {profitMargin}% margin
            </p>
          )}
        </article>

        <article className="card metric-card">
          <p className="muted" style={{ margin: "0 0 8px" }}>Team Members</p>
          <p className="metric" style={{ margin: 0 }}>
            {summary.memberCount}
          </p>
        </article>
      </section>

      {/* Charts */}
      <ChartsSection data={monthlyData} />

      {/* Recent Entries */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Recent Entries</h2>
          <Link href="/entries" className="muted" style={{ fontSize: 14 }}>
            View all →
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Member</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 8).map((entry) => (
                <tr key={entry.id}>
                  <td style={{ color: "var(--muted)", fontSize: 14 }}>{entry.happened_on}</td>
                  <td>
                    <span className={`badge ${entry.entry_type === "earning" ? "badge-positive" : "badge-negative"}`}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className={entry.entry_type === "earning" ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                    <Currency amount={Number(entry.amount)} />
                  </td>
                  <td style={{ fontSize: 14 }}>{entry.member_name ?? "—"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 14 }}>{entry.note ?? "—"}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>
                    No entries yet. <Link href="/entries">Add your first entry →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
