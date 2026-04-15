"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function MemberForm() {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          role: role || null
        })
      });

      if (!response.ok) {
        const json = await response.json();
        setError(json.error ?? "Failed to add member");
        return;
      }

      setFullName("");
      setRole("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid" onSubmit={onSubmit}>
      <label>
        Full Name
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>

      <label>
        Role
        <input value={role} onChange={(e) => setRole(e.target.value)} />
      </label>

      {error ? <p className="negative">{error}</p> : null}

      <button className="primary" disabled={loading}>
        {loading ? "Adding..." : "Add Member"}
      </button>
    </form>
  );
}
