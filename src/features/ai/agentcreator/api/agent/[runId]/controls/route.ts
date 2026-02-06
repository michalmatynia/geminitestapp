import { NextRequest, NextResponse } from 'next/server';

import { runAgentBrowserControl } from '@/features/ai/agent-runtime/server';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === 'true';

async function POST_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  try {
    if (!('chatbotAgentRun' in prisma)) {
      return createErrorResponse(
        internalError(
          'Agent runs not initialized. Run prisma generate/db push.'
        ),
        { request: req, source: 'chatbot.agent.[runId].controls.POST' }
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
    } catch (_error) {
      return createErrorResponse(badRequestError('Invalid JSON payload'), {
        request: req,
        source: 'chatbot.agent.[runId].controls.POST',
      });
    }
    const action = body.action as 'goto' | 'reload' | 'snapshot' | undefined;
    if (!action || !['goto', 'reload', 'snapshot'].includes(action)) {
      return createErrorResponse(badRequestError('Invalid control action.'), {
        request: req,
        source: 'chatbot.agent.[runId].controls.POST',
      });
    }
    if (action === 'goto' && !body.url?.trim()) {
      return createErrorResponse(
        badRequestError('URL is required for goto action.'),
        { request: req, source: 'chatbot.agent.[runId].controls.POST' }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info('[chatbot][agent][control] Request', {
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
      return createErrorResponse(
        internalError(result.error || 'Control action failed.'),
        {
          request: req,
          source: 'chatbot.agent.[runId].controls.POST',
          extra: { controlErrorId: result.errorId },
        }
      );
    }

    return NextResponse.json({ ok: true, output: result.output });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: 'chatbot.agent.[runId].controls.POST',
      fallbackMessage: 'Failed to run agent control action.',
    });
  }
}

export const POST = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].controls.POST' }
);
