import Reports from "@/components/pages/Reports";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const [stats, consumption] = await Promise.all([
    callRoute(() => import("@/app/api/reports/route"), "/api/reports?range=week", token),
    callRoute(
      () => import("@/app/api/dashboard/consumption/route"),
      "/api/dashboard/consumption?range=week",
      token
    ),
  ]);
  return <Reports initialStats={stats} initialConsumption={consumption} />;
}
