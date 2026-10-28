import DashboardLayout from "@/components/DashboardLayout";

export const metadata = { title: "Admin | Pizza Ghar POS" };

export default function AdminRootLayout({ children }) {
  return <DashboardLayout allowedRole="admin">{children}</DashboardLayout>;
}
