import Inventory from "@/components/pages/Inventory";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/inventory/route"),
    "/api/inventory",
    token
  );
  return <Inventory initialData={data} />;
}
