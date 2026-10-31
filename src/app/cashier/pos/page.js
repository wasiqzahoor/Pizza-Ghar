import POS from "@/components/pages/POS";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const [products, categories] = await Promise.all([
    callRoute(() => import("@/app/api/products/route"), "/api/products?limit=500", token),
    callRoute(() => import("@/app/api/categories/route"), "/api/categories", token),
  ]);

  return (
    <POS
      initialProducts={products?.rows || null}
      initialCategoryNames={categories ? categories.map((c) => c.name) : null}
    />
  );
}
