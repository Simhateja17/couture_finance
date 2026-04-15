"use client";

import { useState } from "react";
import { Currency } from "@/components/currency";
import type { FinanceEntry } from "@/lib/types";

const INITIAL_LIMIT = 10;

export function EntriesTable({ entries, type }: { entries: FinanceEntry[]; type: "earning" | "expense" }) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? entries : entries.slice(0, INITIAL_LIMIT);
  const hasMore = entries.length > INITIAL_LIMIT;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Name</th>
              <th>Member</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr key={entry.id}>
                <td style={{ color: "var(--muted)", fontSize: 14 }}>{entry.happened_on}</td>
                <td className={type === "earning" ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                  <Currency amount={Number(entry.amount)} />
                </td>
                <td style={{ fontSize: 14 }}>{entry.name ?? "—"}</td>
                <td style={{ fontSize: 14 }}>{entry.member_name ?? "—"}</td>
                <td style={{ color: "var(--muted)", fontSize: 14 }}>{entry.note ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 12,
            width: "100%",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 0",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {expanded ? "▲ Show less" : `▼ Show ${entries.length - INITIAL_LIMIT} more`}
        </button>
      )}
    </div>
  );
}
