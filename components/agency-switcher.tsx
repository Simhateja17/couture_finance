"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agency } from "@/lib/types";

type Props = {
  agencies: Agency[];
  activeAgencyId: string | null;
};

export function AgencySwitcher({ agencies, activeAgencyId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(activeAgencyId ?? agencies[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  if (agencies.length === 0) {
    return null;
  }

  const hasChanged = selected && selected !== activeAgencyId;

  async function applySelection() {
    if (!selected || !hasChanged) return;

    setLoading(true);
    try {
      const res = await fetch("/api/agencies/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId: selected })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to switch agency");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to switch agency");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ minWidth: 180, maxWidth: 260, padding: "8px 10px", fontSize: 14 }}
        aria-label="Active agency"
      >
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name}
          </option>
        ))}
      </select>
      <button className="secondary" onClick={applySelection} disabled={!hasChanged || loading}>
        {loading ? "Switching..." : "Switch"}
      </button>
    </div>
  );
}
