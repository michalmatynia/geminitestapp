import { NextResponse } from "next/server";
import { chatbotSessionRepository } from "@/lib/services/chatbot-session-repository";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

// GET /api/chatbot/sessions/[sessionId] - Get session by ID
export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await chatbotSessionRepository.findById(params.sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][sessions][GET:sessionId] Found", {
        sessionId: session.id,
        messageCount: session.messages.length,
      });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[chatbot][sessions][GET:sessionId] Failed", error);
    return NextResponse.json(
      { error: "Failed to fetch session." },
      { status: 500 }
    );
  }
}
