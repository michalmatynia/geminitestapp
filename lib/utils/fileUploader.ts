import fs from "fs/promises";
import path from "path";

import prisma from "@/lib/prisma";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");
const productsRoot = path.join(uploadsRoot, "products");
const tempFolderName = "temp";

export function getDiskPathFromPublicPath(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

function sanitizeSku(sku: string) {
  return sku.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

function getUploadTarget({
  category,
  sku,
}: {
  category?: "products";
  sku?: string | null;
}) {
  if (category === "products") {
    const folderName = sku ? sanitizeSku(sku) : tempFolderName;
    const diskDir = path.join(productsRoot, folderName);
    const publicDir = `/uploads/products/${folderName}`;
    return { diskDir, publicDir };
  }

  return { diskDir: uploadsRoot, publicDir: "/uploads" };
}

export async function uploadFile(
  file: File,
  options?: { category?: "products"; sku?: string | null }
) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const { diskDir, publicDir } = getUploadTarget({
    category: options?.category,
    sku: options?.sku,
  });
  const filepath = path.join(diskDir, filename);

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(filepath, fileBuffer);

  const imageFile = await prisma.imageFile.create({
    data: {
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
    },
  });

  return imageFile;
}
