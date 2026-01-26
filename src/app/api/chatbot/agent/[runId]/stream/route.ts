import prisma from "@/lib/prisma";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { internalError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

export const runtime = "nodejs";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    if (!("agentBrowserSnapshot" in prisma)) {
      return createErrorResponse(internalError("Agent snapshots not initialized."), {
        request: req,
        source: "chatbot.agent.[runId].stream.GET",
      });
    }
    const { runId } = await params;
    const encoder = new TextEncoder();
    let timer: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        const sendSnapshot = async () => {
          try {
            const latest = await prisma.agentBrowserSnapshot.findFirst({
              where: { runId },
              orderBy: { createdAt: "desc" },
            });
            const payload = latest ? { snapshot: latest } : { snapshot: null };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          } catch (error) {
            if (DEBUG_CHATBOT) {
              console.error("[chatbot][agent][stream] Snapshot fetch failed", {
                runId,
                error,
              });
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ snapshot: null, error: "snapshot" })}\n\n`
              )
            );
          }
        };

        await sendSnapshot();
        timer = setInterval(() => { void sendSnapshot(); }, 2000);

        req.signal.addEventListener("abort", () => {
          if (timer) {
            clearInterval(timer);
          }
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.agent.[runId].stream.GET",
      fallbackMessage: "Failed to stream snapshots",
    });
  }
}

export const GET = apiHandlerWithParams<{ runId: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "chatbot.agent.[runId].stream.GET" });
