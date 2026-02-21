import { NextRequest } from 'next/server';

import { requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const createLegacyStreamMessage = (message: string): string => {
  return `data: ${JSON.stringify({ type: 'run_failed', error: message })}\n\n`;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { pathId: string }
): Promise<Response> {
  await requireAiPathsRunAccess();
  const legacyPathId = params.pathId;
  const message =
    `Legacy endpoint /api/ai-paths/${legacyPathId}/run/stream is no longer supported. ` +
    'Refresh the page to use the current server run flow.';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(createLegacyStreamMessage(message)));
      controller.close();
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

