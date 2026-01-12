import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

const getContentType = (filename: string) => {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string; file: string }> }
) {
  try {
    const { runId, file } = await params;
    const safeFile = path.basename(file);
    if (safeFile !== file) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
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
    const errorId = randomUUID();
    console.error("[chatbot][agent][assets] Failed to serve asset", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to load agent asset.", errorId },
      { status: 500 }
    );
  }
}
