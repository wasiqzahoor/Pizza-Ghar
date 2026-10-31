import Dashboard from "@/components/pages/Dashboard";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const [stats, consumption] = await Promise.all([
    callRoute(() => import("@/app/api/dashboard/route"), "/api/dashboard?range=daily", token),
    callRoute(
      () => import("@/app/api/dashboard/consumption/route"),
      "/api/dashboard/consumption?range=daily",
      token
    ),
  ]);

  return <Dashboard initialStats={stats} initialConsumption={consumption} />;
}
