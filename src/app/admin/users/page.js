import AdminUsers from "@/components/pages/AdminUsers";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/users/route"),
    "/api/users",
    token
  );
  return <AdminUsers initialUsers={data} />;
}
