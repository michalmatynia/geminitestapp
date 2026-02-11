import { DEBUG_CHATBOT } from '@/features/ai/agent-runtime/core/config';
import { ErrorSystem } from '@/features/observability/server';
import prisma from '@/shared/lib/db/prisma';

export async function getBrowserContextSummary(runId: string): Promise<{
  url: string;
  title: string | null;
  domTextSample: string;
  logs: { level: string; message: string }[];
  uiInventory: unknown;
} | null> {
  if (!('agentBrowserSnapshot' in prisma) || !('agentBrowserLog' in prisma)) {
    return null;
  }
  try {
    const snapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      select: { url: true, title: true, domText: true },
    });
    if (!snapshot) return null;
    const logs = await prisma.agentBrowserLog.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { level: true, message: true },
    });
    const domTextSample = snapshot.domText?.slice(0, 4000) ?? '';
    let uiInventory: unknown = undefined;
    if ('agentAuditLog' in prisma) {
      const latestInventory = await prisma.agentAuditLog.findFirst({
        where: { runId, message: 'Captured UI inventory.' },
        orderBy: { createdAt: 'desc' },
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
      void ErrorSystem.logWarning('Failed to load browser context', {
        service: 'agent-engine',
        action: 'get-browser-context',
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
