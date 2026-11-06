import EditPOS from "@/components/pages/EditPOS";
import { getServerToken, callRoute } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const { id } = await params;
  const token = await getServerToken();
  const [order, products, categories] = await Promise.all([
    callRoute(() => import("@/app/api/orders/[id]/route"), `/api/orders/${id}`, token, { id }),
    callRoute(() => import("@/app/api/products/route"), "/api/products?limit=500", token),
    callRoute(() => import("@/app/api/categories/route"), "/api/categories", token),
  ]);

  return (
    <EditPOS
      initialOrder={order}
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
