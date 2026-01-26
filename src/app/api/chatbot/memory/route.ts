import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { internalError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

async function GET_handler(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("agentLongTermMemory" in prisma)) {
      return createErrorResponse(
        internalError(
          "Long-term memory table not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.memory.GET" }
      );
    }
    const url = new URL(req.url);
    const memoryKey = url.searchParams.get("memoryKey")?.trim() || null;
    const tag = url.searchParams.get("tag")?.trim() || null;
    const query = url.searchParams.get("q")?.trim() || null;
    const limitParam = Number(url.searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

    const where = {
      ...(memoryKey ? { memoryKey } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(query
        ? {
            OR: [
              { content: { contains: query, mode: "insensitive" as const } },
              { summary: { contains: query, mode: "insensitive" as const } },
              { tags: { has: query } },
            ],
          }
        : {}),
    };

    const items = await prisma.agentLongTermMemory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][memory][GET] Loaded", {
        count: items.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ items });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.memory.GET",
      fallbackMessage: "Failed to load long-term memory.",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "chatbot.memory.GET" });
