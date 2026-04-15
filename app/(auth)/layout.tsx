export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 480 }}>
        {children}
      </div>
    </main>
  );
}
