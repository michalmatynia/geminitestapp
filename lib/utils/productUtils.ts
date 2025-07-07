import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

interface UploadedImageInfo {
  filepath: string;
  width: number;
  height: number;
}

// The `handleProductImageUpload` function takes an image file, saves it to
// the server, and returns the filepath, width, and height of the image.
export async function handleProductImageUpload(
  image: File | null
): Promise<UploadedImageInfo | undefined> {
  if (image) {
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `${Date.now()}-${image.name}`;
    const uploadPath = join(process.cwd(), "public/uploads/products", filename);
    await writeFile(uploadPath, buffer);

    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    return {
      filepath: `/uploads/products/${filename}`,
      width,
      height,
    };
  }
  return undefined;
}
