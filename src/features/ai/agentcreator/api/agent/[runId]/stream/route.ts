import { type NextRequest } from 'next/server';

import { getAgentBrowserSnapshotDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { startIntervalTask, type IntervalTaskHandle } from '@/shared/lib/timers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Builds a standardized source string for logging: 'ai.agentcreator.stream.<action>'
 */
const buildAgentCreatorStreamSource = (action: string): string => `ai.agentcreator.stream.${action}`;

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type SnapshotDelegate = NonNullable<ReturnType<typeof getAgentBrowserSnapshotDelegate>>;

const logSnapshotStreamError = async (error: unknown, runId: string): Promise<void> => {
  logClientError(error);
  try {
    void ErrorSystem.captureException(error, {
      service: buildAgentCreatorStreamSource('snapshot-failed'),
      runId,
    });
  } catch (logError) {
    logClientError(logError);
    if (DEBUG_CHATBOT) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[chatbot][agent][stream] Snapshot fetch failed (and logging failed)',
        logError,
        {
          runId,
          error,
        }
      );
    }
  }
};

const sendLatestSnapshot = async (
  agentBrowserSnapshot: SnapshotDelegate,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  runId: string
): Promise<void> => {
  try {
    const latest = await agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });
    const payload = latest !== null ? { snapshot: latest } : { snapshot: null };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  } catch (error) {
    await logSnapshotStreamError(error, runId);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ snapshot: null, error: 'snapshot' })}\n\n`)
    );
  }
};

const closeSnapshotStream = (
  timer: IntervalTaskHandle | null,
  controller: ReadableStreamDefaultController
): void => {
  if (timer !== null) {
    timer.cancel();
  }
  controller.close();
};

async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  if (!agentBrowserSnapshot) {
    throw internalError('Agent snapshots not initialized.');
  }
  const { runId } = await params;
  const encoder = new TextEncoder();
  let timer: IntervalTaskHandle | null = null;

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController): Promise<void> {
      await sendLatestSnapshot(agentBrowserSnapshot, controller, encoder, runId);
      timer = startIntervalTask(() => {
        void sendLatestSnapshot(agentBrowserSnapshot, controller, encoder, runId);
      }, 2000);

      req.signal.addEventListener('abort', () => {
        closeSnapshotStream(timer, controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => getHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].stream.GET', requireAuth: true }
);
