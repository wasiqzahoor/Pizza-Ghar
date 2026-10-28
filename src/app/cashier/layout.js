import DashboardLayout from "@/components/DashboardLayout";

export const metadata = { title: "Cashier | Pizza Ghar POS" };

export default function CashierRootLayout({ children }) {
  return <DashboardLayout allowedRole="cashier">{children}</DashboardLayout>;
}
