import DashboardLayout from "@/components/DashboardLayout";

export const metadata = {
  title: { template: "%s | Pizza Ghar POS", default: "Chef" },
};

export default function ChefRootLayout({ children }) {
  return <DashboardLayout allowedRole="chef">{children}</DashboardLayout>;
}
