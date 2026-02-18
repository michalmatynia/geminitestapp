import { NextRequest, NextResponse } from 'next/server';

import {
  AgentCreatorAgentRunAuditsGET,
  AgentCreatorAgentRunControlsPOST,
  AgentCreatorAgentRunLogsGET,
  AgentCreatorAgentRunSnapshotsGET,
  AgentCreatorAgentRunStreamGET,
  AgentCreatorAgentSnapshotGET,
} from '@/features/ai/agentcreator/server';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = {
  runId: string;
  action: string;
};

const notFound = (): Response =>
  NextResponse.json({ error: 'Not found.' }, { status: 404 });

const GET_handler = async (
  req: NextRequest,
  params: RouteParams
): Promise<Response> => {
  const action = params.action?.trim() ?? '';

  if (params.runId === 'snapshots' && action) {
    return await AgentCreatorAgentSnapshotGET(req, {
      params: Promise.resolve({ snapshotId: action }),
    });
  }

  if (action === 'logs') {
    return await AgentCreatorAgentRunLogsGET(req, {
      params: Promise.resolve({ runId: params.runId }),
    });
  }

  if (action === 'audits') {
    return await AgentCreatorAgentRunAuditsGET(req, {
      params: Promise.resolve({ runId: params.runId }),
    });
  }

  if (action === 'stream') {
    return await AgentCreatorAgentRunStreamGET(req, {
      params: Promise.resolve({ runId: params.runId }),
    });
  }

  if (action === 'snapshots') {
    return await AgentCreatorAgentRunSnapshotsGET(req, {
      params: Promise.resolve({ runId: params.runId }),
    });
  }

  return notFound();
};

const POST_handler = async (
  req: NextRequest,
  params: RouteParams
): Promise<Response> => {
  const action = params.action?.trim() ?? '';
  if (action === 'controls') {
    return await AgentCreatorAgentRunControlsPOST(req, {
      params: Promise.resolve({ runId: params.runId }),
    });
  }
  return notFound();
};

export const GET = apiHandlerWithParams<RouteParams>(
  async (req, _ctx, params) => {
    return await GET_handler(req, params);
  },
  { source: 'chatbot.agent.[runId].[action].GET' }
);

export const POST = apiHandlerWithParams<RouteParams>(
  async (req, _ctx, params) => {
    return await POST_handler(req, params);
  },
  { source: 'chatbot.agent.[runId].[action].POST' }
);
