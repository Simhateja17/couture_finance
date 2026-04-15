"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Agency } from "@/lib/types";

type Props = {
  agencies: Agency[];
  activeAgencyId: string | null;
};

export function AgencyManager({ agencies, activeAgencyId }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create agency");
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Create Agency</h2>
        <form className="grid" onSubmit={onSubmit}>
          <label>
            Agency Name
            <input
              required
              placeholder="Acme Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </label>
          {error ? <p className="negative">{error}</p> : null}
          <button className="primary" disabled={loading}>
            {loading ? "Creating..." : "Create Agency"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Your Agencies</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Your Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => (
                <tr key={agency.id}>
                  <td>{agency.name}</td>
                  <td>
                    <span className="badge badge-positive">{agency.role}</span>
                  </td>
                  <td>{agency.id === activeAgencyId ? "Active" : "-"}</td>
                </tr>
              ))}
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted" style={{ textAlign: "center", padding: "24px 0" }}>
                    No agencies yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
