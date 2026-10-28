export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/paging";
import { saveImageFile, removeImageFile } from "@/lib/uploads";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) return jsonError("Product not found", 404);

    const formData = await req.formData();
    const name = formData.get("name");
    const price = formData.get("price");
    const category = formData.get("category");
    const imageFile = formData.get("image");

    let image = product.image;

    if (imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile) {
      await removeImageFile(product.image);
      image = await saveImageFile(imageFile);
    }

    product.name = name;
    product.price = Number(price);
    product.category = category || null;
    product.image = image;
    await product.save();

    return Response.json({ message: "Product updated successfully", image });
  } catch (error) {
    console.error(error);
    return jsonError("Server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const auth = await requireAuth(req);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) return jsonError("Product not found", 404);

    await removeImageFile(product.image);
    await Product.deleteOne({ _id: id });

    return Response.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    return jsonError("Server error");
  }
}
