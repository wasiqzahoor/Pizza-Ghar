import StatusBoard from "@/components/pages/StatusBoard";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/orders/kitchen/route"),
    "/api/orders/kitchen",
    token
  );
  return <StatusBoard initialOrders={data} />;
}
