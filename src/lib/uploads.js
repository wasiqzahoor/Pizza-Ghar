import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "restaurant_pos";
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/* Upload image buffer → Cloudinary, return secure_url */
export async function saveImageFile(file) {
  const bytes = Buffer.from(await file.arrayBuffer());

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: "image" },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(bytes);
  });

  return result.secure_url;
}

/* Delete a Cloudinary image (by URL) or a legacy local /uploads file */
export async function removeImageFile(imagePath) {
  if (!imagePath) return;

  if (imagePath.includes("res.cloudinary.com")) {
    try {
      const clean = imagePath.split("?")[0];
      const afterUpload = clean.split("/upload/")[1] || "";
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      const publicId = withoutVersion.replace(/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i, "");
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error("Cloudinary delete failed:", e);
    }
    return;
  }

  // Legacy local file (migrated images stored in public/uploads)
  try {
    const filename = path.basename(imagePath);
    const full = path.join(LEGACY_UPLOAD_DIR, filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error("Failed to delete image:", e);
  }
}
