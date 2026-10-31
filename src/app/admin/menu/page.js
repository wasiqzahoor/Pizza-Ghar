import Menu from "@/components/pages/Menu";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const [products, cats] = await Promise.all([
    callRoute(() => import("@/app/api/products/route"), "/api/products?page=1", token),
    callRoute(() => import("@/app/api/categories/route"), "/api/categories", token),
  ]);
  const categoryNames = [...new Set((cats || []).map((c) => c.name))];
  return (
    <Menu
      initialProducts={products}
      initialCategoryNames={cats ? categoryNames : null}
    />
  );
}
