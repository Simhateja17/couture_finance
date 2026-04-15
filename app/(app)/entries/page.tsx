import { addDays, format } from "date-fns";
import { EntryForm } from "@/components/entry-form";
import { CsvImport } from "@/components/csv-import";
import { EntriesFilter } from "@/components/entries-filter";
import { getEntries, getTeamMembers } from "@/lib/data";

export default async function EntriesPage() {
  const [entries, members] = await Promise.all([getEntries(), getTeamMembers()]);

  return (
    <main className="grid" style={{ gap: 20 }}>
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Add Earning / Expense</h2>
          <EntryForm members={members} defaultDate={format(addDays(new Date(), 0), "yyyy-MM-dd")} />
        </section>

        {/* File Import */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Import from File</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: 14 }}>
            Bulk-import entries from CSV/text files, or upload a payment screenshot and let AI convert it. Download a{" "}
            <a
              href="data:text/csv;charset=utf-8,date%2Ctype%2Camount%2Cnote%2Cmember_name%0A2024-01-15%2Cearning%2C50000%2CClient%20payment%2C%0A2024-01-20%2Cexpense%2C10000%2COffice%20rent%2C"
              download="finance-template.csv"
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              sample template
            </a>{" "}
            to get started.
          </p>
          <CsvImport />
        </section>
      </div>

      <EntriesFilter entries={entries} />
    </main>
  );
}
