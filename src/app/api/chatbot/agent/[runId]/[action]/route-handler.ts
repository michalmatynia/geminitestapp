import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AgentCreatorAgentRunAuditsGET,
  AgentCreatorAgentRunControlsPOST,
  AgentCreatorAgentRunLogsGET,
  AgentCreatorAgentRunSnapshotsGET,
  AgentCreatorAgentRunStreamGET,
  AgentCreatorAgentSnapshotGET,
} from '@/features/ai/agentcreator/server';
import { type ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = {
  runId: string;
  action: string;
};

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
  action: z.string().trim().min(1, 'Action is required'),
});

const parseRouteParams = (params: RouteParams): RouteParams => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
};

const notFound = (): Response => NextResponse.json({ error: 'Not found.' }, { status: 404 });

const GET_handler = async (req: NextRequest, params: RouteParams): Promise<Response> => {
  const { action, runId } = parseRouteParams(params);

  if (runId === 'snapshots' && action) {
    return await AgentCreatorAgentSnapshotGET(req, {
      params: Promise.resolve({ snapshotId: action }),
    });
  }

  if (action === 'logs') {
    return await AgentCreatorAgentRunLogsGET(req, {
      params: Promise.resolve({ runId }),
    });
  }

  if (action === 'audits') {
    return await AgentCreatorAgentRunAuditsGET(req, {
      params: Promise.resolve({ runId }),
    });
  }

  if (action === 'stream') {
    return await AgentCreatorAgentRunStreamGET(req, {
      params: Promise.resolve({ runId }),
    });
  }

  if (action === 'snapshots') {
    return await AgentCreatorAgentRunSnapshotsGET(req, {
      params: Promise.resolve({ runId }),
    });
  }

  return notFound();
};

const POST_handler = async (req: NextRequest, params: RouteParams): Promise<Response> => {
  const { action, runId } = parseRouteParams(params);
  if (action === 'controls') {
    return await AgentCreatorAgentRunControlsPOST(req, {
      params: Promise.resolve({ runId }),
    });
  }
  return notFound();
};

export const GET = apiHandlerWithParams<RouteParams>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: RouteParams) => {
    return await GET_handler(req, params);
  },
  { source: 'chatbot.agent.[runId].[action].GET', requireAuth: true }
);

export const POST = apiHandlerWithParams<RouteParams>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: RouteParams) => {
    return await POST_handler(req, params);
  },
  { source: 'chatbot.agent.[runId].[action].POST', requireAuth: true }
);
