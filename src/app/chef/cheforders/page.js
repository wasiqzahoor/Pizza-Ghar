import ChefOrders from "@/components/pages/ChefOrders";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/orders/kitchen/route"),
    "/api/orders/kitchen",
    token
  );
  return <ChefOrders initialOrders={data} />;
}
