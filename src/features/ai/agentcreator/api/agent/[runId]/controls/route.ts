import { NextRequest, NextResponse } from 'next/server';

import { runAgentBrowserControl } from '@/features/ai/agent-runtime/server';
import { ErrorSystem } from '@/features/observability/server';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function POST_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  if (!('chatbotAgentRun' in prisma)) {
    throw internalError(
      'Agent runs not initialized. Run prisma generate/db push.'
    );
  }
  const { runId } = await params;
  let body: {
    action?: string;
    url?: string;
    stepId?: string;
    stepLabel?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    throw badRequestError('Invalid JSON payload');
  }
  const action = body.action as 'goto' | 'reload' | 'snapshot' | undefined;
  if (!action || !['goto', 'reload', 'snapshot'].includes(action)) {
    throw badRequestError('Invalid control action.');
  }
  if (action === 'goto' && !body.url?.trim()) {
    throw badRequestError('URL is required for goto action.');
  }

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Control request', {
      service: 'agent-api',
      runId,
      action,
      url: body.url?.trim(),
    });
  }

  const result = await runAgentBrowserControl({
    runId,
    action,
    url: body.url,
    stepId: body.stepId,
    stepLabel: body.stepLabel,
  });

  if (!result.ok) {
    throw internalError(result.error || 'Control action failed.', {
      controlErrorId: result.errorId,
    });
  }

  return NextResponse.json({ ok: true, output: result.output });
}

export const POST = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].controls.POST' }
);
