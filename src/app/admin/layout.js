import DashboardLayout from "@/components/DashboardLayout";

export const metadata = { title: { template: "%s | Pizza Ghar POS", default: "Admin" } };

export default function AdminRootLayout({ children }) {
  return <DashboardLayout allowedRole="admin">{children}</DashboardLayout>;
}
