import DashboardLayout from "@/components/DashboardLayout";

export const metadata = {
  title: { template: "%s | Pizza Ghar POS", default: "Cashier" },
};

export default function CashierRootLayout({ children }) {
  return <DashboardLayout allowedRole="cashier">{children}</DashboardLayout>;
}
