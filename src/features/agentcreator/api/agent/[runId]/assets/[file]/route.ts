import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const getContentType = (filename: string) => {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
};

async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string; file: string }> }
): Promise<Response> {
  try {
    const { runId, file } = await params;
    const safeFile = path.basename(file);
    if (safeFile !== file) {
      return createErrorResponse(badRequestError("Invalid file path."), {
        request: req,
        source: "chatbot.agent.[runId].assets.[file].GET",
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
      source: "chatbot.agent.[runId].assets.[file].GET",
      fallbackMessage: "Failed to load agent asset.",
    });
  }
}

export const GET = apiHandlerWithParams<{ runId: string; file: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { runId: string; file: string }): Promise<Response> => async (req(req, { params: Promise.resolve(params) }),
 _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.agent.[runId].assets.[file].GET" });
