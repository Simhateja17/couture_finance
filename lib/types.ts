export type TeamMember = {
  id: string;
  full_name: string;
  role: string | null;
  created_at: string;
};

export type Agency = {
  id: string;
  name: string;
  role: "owner" | "manager" | "member";
  created_at: string;
};

export type FinanceEntry = {
  id: string;
  entry_type: "earning" | "expense";
  amount: number;
  name: string | null;
  note: string | null;
  happened_on: string;
  member_id: string | null;
  created_at: string;
  member_name?: string | null;
};

export type PendingPayment = {
  id: string;
  payment_type: "receivable" | "payable";
  name: string;
  amount: number;
  due_date: string | null;
  member_id: string | null;
  member_name?: string | null;
  note: string | null;
  is_paid: boolean;
  created_at: string;
};

export type DashboardSummary = {
  totalEarnings: number;
  totalExpenses: number;
  profit: number;
  memberCount: number;
};

export type MonthlyChartData = {
  month: string;
  earnings: number;
  expenses: number;
  profit: number;
};
