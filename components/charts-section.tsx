"use client";

import dynamic from "next/dynamic";
import { MonthlyChartData } from "@/lib/types";

const MonthlyBarChart = dynamic(() => import("@/components/charts").then((m) => m.MonthlyBarChart), {
  ssr: false,
  loading: () => <div style={{ height: 240 }} />,
});

const ProfitTrendChart = dynamic(() => import("@/components/charts").then((m) => m.ProfitTrendChart), {
  ssr: false,
  loading: () => <div style={{ height: 240 }} />,
});

export function ChartsSection({ data }: { data: MonthlyChartData[] }) {
  return (
    <section className="grid grid-2">
      <article className="card">
        <h3 style={{ margin: "0 0 16px" }}>Monthly Overview</h3>
        <MonthlyBarChart data={data} />
      </article>
      <article className="card">
        <h3 style={{ margin: "0 0 16px" }}>Profit Trend</h3>
        <ProfitTrendChart data={data} />
      </article>
    </section>
  );
}
