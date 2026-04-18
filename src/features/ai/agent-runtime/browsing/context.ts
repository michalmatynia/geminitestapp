import { DEBUG_CHATBOT } from '@/features/ai/agent-runtime/core/config';
import {
  getAgentAuditLogDelegate,
  getAgentBrowserLogDelegate,
  getAgentBrowserSnapshotDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface BrowserContextSummary {
  url: string;
  title: string | null;
  domTextSample: string;
  logs: { level: string; message: string }[];
  uiInventory: unknown;
}

async function fetchUiInventory(runId: string): Promise<unknown> {
  const agentAuditLog = getAgentAuditLogDelegate();
  if (agentAuditLog === null) return undefined;

  const latestInventory = await agentAuditLog.findFirst<{ metadata?: unknown }>({
    where: { runId, message: 'Captured UI inventory.' },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  return latestInventory?.metadata ?? undefined;
}

async function fetchBrowserLogs(
  agentBrowserLog: { findMany<T>(args: Record<string, unknown>): Promise<T[]> },
  runId: string
): Promise<{ level: string; message: string }[]> {
  const logs = await agentBrowserLog.findMany<{
    level: string;
    message: string;
  }>({
    where: { runId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { level: true, message: true },
  });
  return logs.reverse();
}

async function fetchLatestSnapshot(
  agentBrowserSnapshot: { findFirst<T>(args: Record<string, unknown>): Promise<T | null> },
  runId: string
): Promise<{ url: string; title: string | null; domText: string | null } | null> {
  return await agentBrowserSnapshot.findFirst<{
    url: string;
    title: string | null;
    domText: string | null;
  }>({
    where: { runId },
    orderBy: { createdAt: 'desc' },
    select: { url: true, title: true, domText: true },
  });
}

function getErrorPayload(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function getBrowserContextSummary(runId: string): Promise<BrowserContextSummary | null> {
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  const agentBrowserLog = getAgentBrowserLogDelegate();
  const storageMissing = agentBrowserSnapshot === null || agentBrowserLog === null;
  if (storageMissing) return null;

  try {
    const snapshot = await fetchLatestSnapshot(agentBrowserSnapshot, runId);
    if (snapshot === null) return null;

    const [logs, uiInventory] = await Promise.all([
      fetchBrowserLogs(agentBrowserLog, runId),
      fetchUiInventory(runId),
    ]);

    const domText = snapshot.domText;
    const domTextSample = (domText !== null) ? domText.slice(0, 4000) : '';

    return {
      url: snapshot.url,
      title: snapshot.title,
      domTextSample,
      logs,
      uiInventory,
    };
  } catch (error) {
    logClientError(error);
    if (DEBUG_CHATBOT) {
      await ErrorSystem.logWarning('Failed to load browser context', {
        service: 'agent-engine',
        action: 'get-browser-context',
        runId,
        error: getErrorPayload(error),
      });
    }
    return null;
  }
}
