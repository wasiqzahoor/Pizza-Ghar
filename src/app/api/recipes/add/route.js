export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Recipe } from "@/models/Recipe";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";

/* ADD MULTIPLE INGREDIENTS */
export async function POST(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { product_id, ingredients } = await req.json();

    if (!product_id || !ingredients?.length) return jsonError("Missing data", 400);

    await Recipe.insertMany(
      ingredients.map((ing) => ({
        product: product_id,
        inventory: ing.inventory_id,
        quantity: Number(ing.quantity) || 0,
      }))
    );

    return Response.json({ message: "Recipe saved successfully" });
  } catch {
    return jsonError("Server error");
  }
}
