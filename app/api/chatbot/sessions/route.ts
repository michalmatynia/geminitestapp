import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const sessionCreateSchema = z.object({
  title: z.string().trim().optional(),
});

const sessionUpdateSchema = z.object({
  sessionId: z.string().trim().optional(),
  title: z.string().trim().optional(),
});

const sessionDeleteSchema = z.object({
  sessionId: z.string().trim().optional(),
  sessionIds: z.array(z.string().trim().min(1)).optional(),
});

export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const parsed = await parseJsonBody(req, sessionCreateSchema, {
      logPrefix: "chatbot-sessions",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Request", {
        titleProvided: Boolean(parsed.data.title?.trim()),
      });
    }
    const session = await prisma.chatbotSession.create({
      data: {
        title: parsed.data.title?.trim() || null,
      },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Created", {
        sessionId: session.id,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][sessions][POST] Failed to create session", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create session.", errorId },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "default";
    const query = url.searchParams.get("query")?.trim() ?? "";
    const where = query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { id: { contains: query } },
          ],
        }
      : undefined;
    if (scope === "ids") {
      const sessions = await prisma.chatbotSession.findMany({
        where,
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      });
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][sessions][GET] Listed ids", {
          count: sessions.length,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ ids: sessions.map((session) => session.id) });
    }
    const sessions = await prisma.chatbotSession.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: scope === "all" ? undefined : 50,
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET] Listed", {
        count: sessions.length,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ sessions });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][sessions][GET] Failed to list sessions", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to list sessions.", errorId },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const parsed = await parseJsonBody(req, sessionUpdateSchema, {
      logPrefix: "chatbot-sessions",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    if (!parsed.data.sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Request", {
        sessionId: parsed.data.sessionId,
        titleProvided: Boolean(parsed.data.title?.trim()),
      });
    }
    const updated = await prisma.chatbotSession.update({
      where: { id: parsed.data.sessionId },
      data: { title: parsed.data.title?.trim() || null },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Updated", {
        sessionId: updated.id,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ session: updated });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][sessions][PATCH] Failed to update session", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update session.", errorId },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const parsed = await parseJsonBody(req, sessionDeleteSchema, {
      logPrefix: "chatbot-sessions",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const sessionIds = Array.isArray(parsed.data.sessionIds)
      ? parsed.data.sessionIds.filter((id) => typeof id === "string" && id.trim())
      : [];
    if (!parsed.data.sessionId && sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }
    if (sessionIds.length > 0) {
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][sessions][DELETE] Bulk request", {
          count: sessionIds.length,
        });
      }
      const result = await prisma.chatbotSession.deleteMany({
        where: { id: { in: sessionIds } },
      });
      if (DEBUG_CHATBOT) {
        console.info("[chatbot][sessions][DELETE] Bulk deleted", {
          deleted: result.count,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ deleted: result.count });
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Request", {
        sessionId: parsed.data.sessionId,
      });
    }
    const deleted = await prisma.chatbotSession.delete({
      where: { id: parsed.data.sessionId },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Deleted", {
        sessionId: deleted.id,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ session: deleted });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][sessions][DELETE] Failed to delete session", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete session.", errorId },
      { status: 500 }
    );
  }
}
