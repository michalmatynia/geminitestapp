import { type NextRequest, NextResponse } from 'next/server';

import {
  retrievalService,
  saveProposal,
  getContextPackById,
} from '@/features/ai/ai-context-registry/server';
import { proposeActionRequestSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


async function parseRequestBody(req: NextRequest): Promise<unknown> {
  const rawBody = await req.text();
  if (rawBody === '') return {};
  
  try {
    return JSON.parse(rawBody);
  } catch (error) {
    await ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON body.');
  }
}

export async function postProposeHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = await parseRequestBody(req);

  const parsed = proposeActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid propose request payload.');
  }

  const { workflow, intent, rootIds } = parsed.data;

  const pack = getContextPackById(workflow);

  const resolution = retrievalService.resolveWithExpansion({
    ids: rootIds,
    depth: 1,
    maxNodes: pack.maxNodes,
    includeSchemas: false,
    includeExamples: false,
  });

  const approvalsNeeded = resolution.nodes.some(
    (n) =>
      n.permissions.riskTier === 'medium' ||
      n.permissions.riskTier === 'high' ||
      n.permissions.riskTier === 'critical' ||
      n.permissions.requiresApproval === true
  );

  const proposal = saveProposal({
    workflow,
    intent,
    rootIds,
    status: 'pending',
    approvalsNeeded,
    preview: {
      summary: `Proposal for ${workflow}: ${intent.slice(0, 100)}`,
      impactedNodeIds: resolution.visitedIds,
    },
  });

  await logSystemEvent({
    level: 'info',
    message: '[ai-context-registry] actions.propose',
    source: 'ai.actions.propose',
    context: {
      proposalId: proposal.id,
      workflow,
      rootIds,
      truncated: resolution.truncated,
      approvalsNeeded,
    },
  });

  return NextResponse.json({
    proposalId: proposal.id,
    approvalsNeeded: proposal.approvalsNeeded,
    preview: proposal.preview,
  });
}
