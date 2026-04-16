import { type NextRequest } from 'next/server';

import { getAgentBrowserSnapshotDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { internalError } from '@/shared/errors/app-error';
import {
  apiHandlerWithParams,
  type ApiHandlerContext as _ApiHandlerContext,
} from '@/shared/lib/api/api-handler';
import { startIntervalTask, type IntervalTaskHandle } from '@/shared/lib/timers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function GET_handler(
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
    async start(controller: ReadableStreamDefaultController) {
      const sendSnapshot = async () => {
        try {
          const latest = await agentBrowserSnapshot.findFirst({
            where: { runId },
            orderBy: { createdAt: 'desc' },
          });
          const payload = latest ? { snapshot: latest } : { snapshot: null };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (error) {
          logClientError(error);
          try {
            const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
            void ErrorSystem.captureException(error, {
              service: 'agent-stream',
              action: 'sendSnapshot',
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
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ snapshot: null, error: 'snapshot' })}\n\n`)
          );
        }
      };

      await sendSnapshot();
      timer = startIntervalTask(() => {
        void sendSnapshot();
      }, 2000);

      req.signal.addEventListener('abort', () => {
        if (timer) {
          timer.cancel();
        }
        controller.close();
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
  async (req: NextRequest, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].stream.GET', requireAuth: true }
);
