"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember } from "@/lib/types";

type Props = {
  members: TeamMember[];
  defaultDate: string;
};

export function EntryForm({ members, defaultDate }: Props) {
  const [entryType, setEntryType] = useState<"earning" | "expense">("earning");
  const [amount, setAmount] = useState("");
  const [happenedOn, setHappenedOn] = useState(defaultDate);
  const [memberId, setMemberId] = useState("");
  const [entryName, setEntryName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          amount: Number(amount),
          happenedOn,
          memberId: memberId || null,
          name: entryName.trim() || null,
          note: note.trim() || null
        })
      });

      if (!response.ok) {
        const json = await response.json();
        setError(json.error ?? "Failed to create entry");
        return;
      }

      setAmount("");
      setEntryName("");
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
        <select value={entryType} onChange={(e) => setEntryType(e.target.value as "earning" | "expense")}>
          <option value="earning">Earning</option>
          <option value="expense">Expense</option>
        </select>
      </label>

      <label>
        Amount (INR)
        <input
          type="number"
          min={0}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <label>
        Date
        <input type="date" required value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
      </label>

      <label>
        {entryType === "expense" ? "Expense Name" : "Income Name"}
        <input
          required
          value={entryName}
          onChange={(e) => setEntryName(e.target.value)}
          placeholder={entryType === "expense" ? "e.g. Claude Subscription" : "e.g. Client Payment"}
        />
      </label>

      <label>
        Team Member (optional)
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">No member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Additional Note (optional)
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error ? <p className="negative">{error}</p> : null}

      <button className="primary" disabled={loading}>
        {loading ? "Saving..." : "Save Entry"}
      </button>
    </form>
  );
}
