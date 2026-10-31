import Categories from "@/components/pages/Categories";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const data = await callRoute(
    () => import("@/app/api/categories/route"),
    "/api/categories",
    token
  );
  return <Categories initialCategories={data} />;
}
