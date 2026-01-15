import { NextResponse } from "next/server";
import { chatbotSessionRepository } from "@/lib/services/chatbot-session-repository";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

// POST /api/chatbot/sessions - Create new session
export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    const body = await req.json();
    const { title, settings } = body;

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Request", {
        titleProvided: Boolean(title?.trim()),
      });
    }

    const session = await chatbotSessionRepository.create({
      title: title?.trim() || `Chat ${new Date().toLocaleString()}`,
      settings,
    });

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][POST] Created", {
        sessionId: session.id,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
  } catch (error) {
    console.error("[chatbot][sessions][POST] Failed to create session", error);
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 }
    );
  }
}

// GET /api/chatbot/sessions - List all sessions
export async function GET() {
  const requestStart = Date.now();
  try {
    const sessions = await chatbotSessionRepository.findAll();

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET] Listed", {
        count: sessions.length,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[chatbot][sessions][GET] Failed to list sessions", error);
    return NextResponse.json(
      { error: "Failed to list sessions." },
      { status: 500 }
    );
  }
}

// PATCH /api/chatbot/sessions - Update session (title)
export async function PATCH(req: Request) {
  const requestStart = Date.now();
  try {
    const body = await req.json();
    const { sessionId, title } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Request", {
        sessionId,
        titleProvided: Boolean(title?.trim()),
      });
    }

    const updated = await chatbotSessionRepository.update(sessionId, {
      title: title?.trim(),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][PATCH] Updated", {
        sessionId: updated.id,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("[chatbot][sessions][PATCH] Failed to update session", error);
    return NextResponse.json(
      { error: "Failed to update session." },
      { status: 500 }
    );
  }
}

// DELETE /api/chatbot/sessions - Delete session
export async function DELETE(req: Request) {
  const requestStart = Date.now();
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Request", {
        sessionId,
      });
    }

    const deleted = await chatbotSessionRepository.delete(sessionId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][DELETE] Deleted", {
        sessionId,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chatbot][sessions][DELETE] Failed to delete session", error);
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 }
    );
  }
}
