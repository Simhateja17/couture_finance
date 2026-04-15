"use client";

import { useState, useMemo } from "react";
import { EntriesTable } from "@/components/entries-table";
import type { FinanceEntry } from "@/lib/types";

function getMonthOptions(entries: FinanceEntry[]) {
  const seen = new Set<string>();
  const months: { value: string; label: string }[] = [];
  for (const e of entries) {
    const ym = e.happened_on.slice(0, 7); // "YYYY-MM"
    if (!seen.has(ym)) {
      seen.add(ym);
      const [year, month] = ym.split("-");
      const label = new Date(Number(year), Number(month) - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      months.push({ value: ym, label });
    }
  }
  return months;
}

export function EntriesFilter({ entries }: { entries: FinanceEntry[] }) {
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");

  const monthOptions = useMemo(() => getMonthOptions(entries), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (month && !e.happened_on.startsWith(month)) return false;
      if (search) {
        const q = search.toLowerCase();
        const inName = e.name?.toLowerCase().includes(q) ?? false;
        const inNote = e.note?.toLowerCase().includes(q) ?? false;
        if (!inName && !inNote) return false;
      }
      return true;
    });
  }, [entries, search, month]);

  const earnings = filtered.filter((e) => e.entry_type === "earning");
  const expenses = filtered.filter((e) => e.entry_type === "expense");

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ flex: "0 0 180px" }}
        >
          <option value="">All months</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start", gap: 20 }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Income</h2>
          <EntriesTable entries={earnings} type="earning" />
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Expenses</h2>
          <EntriesTable entries={expenses} type="expense" />
        </section>
      </div>
    </div>
  );
}
