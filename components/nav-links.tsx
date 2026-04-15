"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 4 }}>
      {(
        [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/entries", label: "Entries" },
          { href: "/pending", label: "Pending" },
          { href: "/members", label: "Members" },
          { href: "/agencies", label: "Agencies" },
        ] as { href: "/dashboard" | "/entries" | "/pending" | "/members" | "/agencies"; label: string }[]
      ).map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: pathname === href ? 600 : 400,
            background: pathname === href ? "#f1f5f9" : "transparent",
            color: pathname === href ? "var(--primary)" : "var(--muted)",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
