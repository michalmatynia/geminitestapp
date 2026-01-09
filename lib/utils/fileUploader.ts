import fs from "fs/promises";
import path from "path";

import prisma from "@/lib/prisma";
const uploadDir = path.join(process.cwd(), "public", "uploads");

export async function uploadFile(file: File) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(filepath, fileBuffer);

  const imageFile = await prisma.imageFile.create({
    data: {
      filename,
      filepath: `/uploads/${filename}`,
      mimetype: file.type,
      size: file.size,
    },
  });

  return imageFile;
}
