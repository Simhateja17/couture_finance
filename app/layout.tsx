import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agency Finance SaaS",
  description: "Track earnings, expenses, and team finance for your agency"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
