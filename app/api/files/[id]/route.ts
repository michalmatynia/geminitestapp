import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function DELETE(req: Request, { params }: any) {
  const { id } = params;

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!imageFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Physical file deletion
    if (imageFile) {
      try {
        await fs.unlink(path.join(process.cwd(), "public", imageFile.filepath));
      } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }
    
    await prisma.imageFile.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting file ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
