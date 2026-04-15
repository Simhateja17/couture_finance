"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember } from "@/lib/types";

type Props = {
  members: TeamMember[];
  defaultDate: string;
};

export function PendingPaymentForm({ members, defaultDate }: Props) {
  const [paymentType, setPaymentType] = useState<"receivable" | "payable">("receivable");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [memberId, setMemberId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType,
          name: name.trim(),
          amount: Number(amount),
          dueDate: dueDate || null,
          memberId: memberId || null,
          note: note.trim() || null,
        }),
      });
      if (!response.ok) {
        const json = await response.json();
        setError(json.error ?? "Failed to save");
        return;
      }
      setName("");
      setAmount("");
      setNote("");
      setMemberId("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid" onSubmit={onSubmit}>
      <label>
        Type
        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as "receivable" | "payable")}>
          <option value="receivable">Receivable (client owes us)</option>
          <option value="payable">Payable (we owe someone)</option>
        </select>
      </label>

      <label>
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={paymentType === "receivable" ? "e.g. Client Project Payment" : "e.g. Vendor Invoice"}
        />
      </label>

      <label>
        Amount (INR)
        <input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      <label>
        Due Date (optional)
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>

      <label>
        Team Member (optional)
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">No member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Note (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p className="negative">{error}</p>}

      <button className="primary" disabled={loading}>
        {loading ? "Saving..." : "Add Pending Payment"}
      </button>
    </form>
  );
}
