import Kitchen from "@/components/pages/Kitchen";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const orders = await callRoute(
    () => import("@/app/api/orders/kitchen/route"),
    "/api/orders/kitchen",
    token
  );
  return <Kitchen initialOrders={orders} />;
}
