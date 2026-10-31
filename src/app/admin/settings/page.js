import AdminSettings from "@/components/pages/AdminSettings";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/daily-notes/route"),
    "/api/daily-notes",
    token
  );
  return <AdminSettings initialNotes={data} />;
}
