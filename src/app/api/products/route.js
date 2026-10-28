export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAuth } from "@/lib/auth";
import { getPaging, jsonError } from "@/lib/paging";
import { saveImageFile } from "@/lib/uploads";

export async function GET(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { page, limit, offset, q } = getPaging(new URL(req.url).searchParams, {
      def: 20,
      max: 500,
    });

    const filter = {};
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const category = (new URL(req.url).searchParams.get("category") || "").trim();
    if (category && category !== "All") filter.category = category;

    const total = await Product.countDocuments(filter);
    const rows = await Product.find(filter)
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return Response.json({
      rows: rows.map((r) => ({
        id: r._id,
        name: r.name,
        price: r.price,
        category: r.category,
        image: r.image,
        created_at: r.created_at,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error(error);
    return jsonError("Server error");
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const formData = await req.formData();
    const name = formData.get("name");
    const price = formData.get("price");
    const category = formData.get("category");
    const imageFile = formData.get("image");

    if (!name || !price) return jsonError("Name and price required", 400);

    let image = null;
    if (imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile) {
      image = await saveImageFile(imageFile);
    }

    await Product.create({
      name,
      price: Number(price),
      category: category || null,
      image,
    });

    return Response.json({ message: "Product added successfully", image });
  } catch (error) {
    console.error(error);
    return jsonError("Server error");
  }
}
