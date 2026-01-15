import prisma from "@/lib/prisma";
import { DEBUG_CHATBOT } from "@/lib/agent/core/config";

export async function getBrowserContextSummary(runId: string) {
  if (!("agentBrowserSnapshot" in prisma) || !("agentBrowserLog" in prisma)) {
    return null;
  }
  try {
    const snapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
      select: { url: true, title: true, domText: true },
    });
    if (!snapshot) return null;
    const logs = await prisma.agentBrowserLog.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { level: true, message: true },
    });
    const domTextSample = snapshot.domText?.slice(0, 4000) ?? "";
    let uiInventory: unknown = undefined;
    if ("agentAuditLog" in prisma) {
      const latestInventory = await prisma.agentAuditLog.findFirst({
        where: { runId, message: "Captured UI inventory." },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      });
      uiInventory = latestInventory?.metadata ?? undefined;
    }
    return {
      url: snapshot.url,
      title: snapshot.title,
      domTextSample,
      logs: logs.reverse(),
      uiInventory,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Failed to load browser context", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
