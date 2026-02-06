export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const repository = getAsset3DRepository();
    const asset = await repository.getAsset3DById(id);

    if (!asset) {
      return createErrorResponse(
        notFoundError(`Asset not found in database: ${id}`),
        { request, source: "assets3d.file.GET" }
      );
    }

    const diskPath = join(process.cwd(), "public", asset.filepath.replace(/^\/+/, ""));
    
    if (!existsSync(diskPath)) {
      return createErrorResponse(
        notFoundError(`File not found on disk: ${diskPath}`),
        { request, source: "assets3d.file.GET" }
      );
    }

    const fileBuffer = await readFile(diskPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": asset.mimetype || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    return createErrorResponse(
      notFoundError("File not found", { cause: error }),
      { request, source: "assets3d.file.GET" }
    );
  }
}