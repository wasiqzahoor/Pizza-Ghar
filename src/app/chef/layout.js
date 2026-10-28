import DashboardLayout from "@/components/DashboardLayout";

export const metadata = { title: "Chef | Pizza Ghar POS" };

export default function ChefRootLayout({ children }) {
  return <DashboardLayout allowedRole="chef">{children}</DashboardLayout>;
}
