import { format, addDays } from "date-fns";
import { PendingPaymentForm } from "@/components/pending-payment-form";
import { PendingPaymentList } from "@/components/pending-payment-list";
import { getPendingPayments, getTeamMembers } from "@/lib/data";
import { Currency } from "@/components/currency";

export default async function PendingPage() {
  const [payments, members] = await Promise.all([getPendingPayments(), getTeamMembers()]);

  const receivables = payments.filter((p) => p.payment_type === "receivable");
  const payables = payments.filter((p) => p.payment_type === "payable");

  const totalReceivable = receivables.filter((p) => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPayable = payables.filter((p) => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <main className="grid" style={{ gap: 20 }}>
      {/* Summary */}
      <div className="grid grid-2" style={{ gap: 20 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Pending to Receive</p>
          <p className="positive" style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>
            <Currency amount={totalReceivable} />
          </p>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Pending to Pay</p>
          <p className="negative" style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>
            <Currency amount={totalPayable} />
          </p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start", gap: 20 }}>
        {/* Form */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Add Pending Payment</h2>
          <PendingPaymentForm members={members} defaultDate={format(addDays(new Date(), 0), "yyyy-MM-dd")} />
        </section>

        {/* Receivables */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Receivables — clients owe us</h2>
          <PendingPaymentList payments={receivables} type="receivable" />
        </section>
      </div>

      {/* Payables full width */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Payables — we owe someone</h2>
        <PendingPaymentList payments={payables} type="payable" />
      </section>
    </main>
  );
}
