import Recipes from "@/components/pages/Recipes";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const token = await getServerToken();
  const [products, inventory, recipes] = await Promise.all([
    callRoute(() => import("@/app/api/recipes/products/route"), "/api/recipes/products", token),
    callRoute(() => import("@/app/api/recipes/inventory/route"), "/api/recipes/inventory", token),
    callRoute(() => import("@/app/api/recipes/all/route"), "/api/recipes/all?page=1&limit=50", token),
  ]);
  return (
    <Recipes
      initialProducts={products}
      initialInventory={inventory}
      initialRecipes={recipes}
    />
  );
}
