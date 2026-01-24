import fs from "fs";
import path from "path";

import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";

import { getImageFileRepository } from "@/lib/services/image-file-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return createErrorResponse(badRequestError("File ID is required"), {
      request: req,
      source: "files/preview.GET",
    });
  }

  try {
    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.getImageFileById(fileId);

    if (!imageFile) {
      throw notFoundError("File not found");
    }

    // Remove leading slash from the stored path to ensure correct joining
    const relativePath = imageFile.filepath.startsWith("/")
      ? imageFile.filepath.substring(1)
      : imageFile.filepath;
    const filePath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(filePath)) {
      throw notFoundError("File not found on disk", { path: relativePath });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "files/preview.GET",
      fallbackMessage: "Failed to fetch file preview",
    });
  }
}
