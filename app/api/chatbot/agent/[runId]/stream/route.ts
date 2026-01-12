import prisma from "@/lib/prisma";

export const runtime = "nodejs";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  if (!("agentBrowserSnapshot" in prisma)) {
    return new Response("Agent snapshots not initialized.", { status: 500 });
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
      timer = setInterval(sendSnapshot, 2000);

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
}
