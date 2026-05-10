import { type NextRequest, NextResponse } from 'next/server';

import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { runAgentBrowserControl } from '@/features/ai/agent-runtime/tools/run-agent-browser-control';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
const CONTROL_ACTIONS = ['goto', 'reload', 'snapshot'] as const;

type ControlAction = (typeof CONTROL_ACTIONS)[number];

type ControlRequestBody = {
  action?: string;
  url?: string;
  stepId?: string;
  stepLabel?: string;
};

const isControlAction = (action: string | undefined): action is ControlAction =>
  action !== undefined && CONTROL_ACTIONS.includes(action as ControlAction);

const hasRequiredControlUrl = (action: ControlAction, url: string | undefined): boolean =>
  action !== 'goto' || (url !== undefined && url.trim().length > 0);

const getControlFailureMessage = (error: string | undefined): string =>
  error !== undefined && error.length > 0 ? error : 'Control action failed.';

const parseControlRequestBody = async (req: NextRequest): Promise<ControlRequestBody> => {
  try {
    return (await req.json()) as ControlRequestBody;
  } catch (error) {
    logClientError(error);
    throw badRequestError('Invalid JSON payload');
  }
};

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  if (getChatbotAgentRunDelegate() === null) {
    throw internalError('Agent run storage is unavailable.');
  }
  const { runId } = await params;
  const body = await parseControlRequestBody(req);
  const { action } = body;
  if (!isControlAction(action)) {
    throw badRequestError('Invalid control action.');
  }
  if (!hasRequiredControlUrl(action, body.url)) {
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
    throw internalError(getControlFailureMessage(result.error), {
      controlErrorId: result.errorId,
    });
  }

  return NextResponse.json({ ok: true, output: result.output });
}

export const POST = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => postHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].controls.POST', requireAuth: true }
);
