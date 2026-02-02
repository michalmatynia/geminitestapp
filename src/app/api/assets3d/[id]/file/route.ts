export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const repository = getAsset3DRepository();
    const asset = await repository.getAsset3DById(id);

    if (!asset) {
      console.error(`Asset not found in database: ${id}`);
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const diskPath = join(process.cwd(), "public", asset.filepath.replace(/^\/+/, ""));
    
    if (!existsSync(diskPath)) {
      console.error(`File not found on disk: ${diskPath}`);
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const fileBuffer = await readFile(diskPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": asset.mimetype || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Asset file serve error:", error);
    return NextResponse.json({ 
      error: "File not found", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 404 });
  }
}
