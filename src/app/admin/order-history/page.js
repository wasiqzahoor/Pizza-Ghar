import OrderHistory from "@/components/pages/OrderHistory";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const orders = await callRoute(
    () => import("@/app/api/orders/route"),
    "/api/orders?page=1&deleted=1",
    token
  );
  return <OrderHistory initialOrders={orders} />;
}
