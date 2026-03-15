import { DEBUG_CHATBOT } from '@/features/ai/agent-runtime/core/config';
import {
  getAgentAuditLogDelegate,
  getAgentBrowserLogDelegate,
  getAgentBrowserSnapshotDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export async function getBrowserContextSummary(runId: string): Promise<{
  url: string;
  title: string | null;
  domTextSample: string;
  logs: { level: string; message: string }[];
  uiInventory: unknown;
} | null> {
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  const agentBrowserLog = getAgentBrowserLogDelegate();
  if (!agentBrowserSnapshot || !agentBrowserLog) {
    return null;
  }
  try {
    const snapshot = await agentBrowserSnapshot.findFirst<{
      url: string;
      title: string | null;
      domText: string | null;
    }>({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      select: { url: true, title: true, domText: true },
    });
    if (!snapshot) return null;
    const logs = await agentBrowserLog.findMany<{
      level: string;
      message: string;
    }>({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { level: true, message: true },
    });
    const domTextSample = snapshot.domText?.slice(0, 4000) ?? '';
    let uiInventory: unknown = undefined;
    const agentAuditLog = getAgentAuditLogDelegate();
    if (agentAuditLog) {
      const latestInventory = await agentAuditLog.findFirst<{ metadata?: unknown }>({
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
    logClientError(error);
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
