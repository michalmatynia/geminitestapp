import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const body = (await req.json().catch(() => ({}))) as { title?: string };
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Request", {
        titleProvided: Boolean(body.title?.trim()),
      });
    }
    const session = await prisma.chatbotSession.create({
      data: {
        title: body.title?.trim() || null,
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

export async function GET() {
  const requestStart = Date.now();
  try {
    if (!("chatbotSession" in prisma)) {
      return NextResponse.json(
        { error: "Chat sessions not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const sessions = await prisma.chatbotSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
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
    const body = (await req.json()) as { sessionId?: string; title?: string };
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Request", {
        sessionId: body.sessionId,
        titleProvided: Boolean(body.title?.trim()),
      });
    }
    const updated = await prisma.chatbotSession.update({
      where: { id: body.sessionId },
      data: { title: body.title?.trim() || null },
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
    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Request", {
        sessionId: body.sessionId,
      });
    }
    const deleted = await prisma.chatbotSession.delete({
      where: { id: body.sessionId },
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
