import AdminSettings from "@/components/pages/AdminSettings";
import { getServerToken, callRoute } from "@/lib/server-data";

export const metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/daily-notes/route"),
    "/api/daily-notes",
    token
  );
  const printSettings = await callRoute(
    () => import("@/app/api/admin-settings/route"),
    "/api/admin-settings",
    token
  );
  return <AdminSettings initialNotes={data} initialPrint={printSettings} />;
}
