import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

const getContentType = (filename: string) => {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string; file: string }> }
) {
  try {
    const { runId, file } = await params;
    const safeFile = path.basename(file);
    if (safeFile !== file) {
      return createErrorResponse(badRequestError("Invalid file path."), {
        request: req,
        source: "chatbot.agent.assets.GET",
      });
    }

    const baseDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    const assetPath = path.join(baseDir, safeFile);
    const fileBuffer = await fs.readFile(assetPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getContentType(safeFile),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.assets.GET",
      fallbackMessage: "Failed to load agent asset.",
    });
  }
}
