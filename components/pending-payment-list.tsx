"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Currency } from "@/components/currency";
import type { PendingPayment } from "@/lib/types";

export function PendingPaymentList({
  payments,
  type,
}: {
  payments: PendingPayment[];
  type: "receivable" | "payable";
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pending = payments.filter((p) => !p.is_paid);
  const paid = payments.filter((p) => p.is_paid);

  const toggle = async (id: string, currentPaid: boolean) => {
    setLoadingId(id);
    await fetch(`/api/pending/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_paid: !currentPaid }),
    });
    setLoadingId(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this pending payment?")) return;
    setLoadingId(id);
    await fetch(`/api/pending/${id}`, { method: "DELETE" });
    setLoadingId(null);
    router.refresh();
  };

  const today = new Date().toISOString().slice(0, 10);

  const renderRow = (p: PendingPayment) => {
    const overdue = !p.is_paid && p.due_date && p.due_date < today;
    return (
      <tr key={p.id} style={{ opacity: p.is_paid ? 0.5 : 1 }}>
        <td style={{ fontSize: 14, color: overdue ? "var(--negative, #dc2626)" : "var(--muted)" }}>
          {p.due_date ?? "—"}
          {overdue && <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 600 }}>OVERDUE</span>}
        </td>
        <td style={{ fontSize: 14, fontWeight: 500, textDecoration: p.is_paid ? "line-through" : "none" }}>
          {p.name}
        </td>
        <td className={type === "receivable" ? "positive" : "negative"} style={{ fontWeight: 600 }}>
          <Currency amount={Number(p.amount)} />
        </td>
        <td style={{ fontSize: 14 }}>{p.member_name ?? "—"}</td>
        <td style={{ color: "var(--muted)", fontSize: 14 }}>{p.note ?? "—"}</td>
        <td>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              disabled={loadingId === p.id}
              onClick={() => toggle(p.id, p.is_paid)}
              style={{
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: p.is_paid ? "transparent" : "#f0fdf4",
                color: p.is_paid ? "var(--muted)" : "#16a34a",
                cursor: "pointer",
              }}
            >
              {p.is_paid ? "Undo" : "Mark paid"}
            </button>
            <button
              disabled={loadingId === p.id}
              onClick={() => remove(p.id)}
              style={{
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const allPayments = [...pending, ...paid];

  if (allPayments.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 14 }}>No entries yet.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>Due Date</th>
            <th>Name</th>
            <th>Amount</th>
            <th>Member</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{allPayments.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
