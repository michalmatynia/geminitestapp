import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { proposeActionRequestSchema } from '@/shared/contracts/ai-context-registry';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import {
  retrievalService,
  saveProposal,
  getContextPackById,
} from '@/features/ai/ai-context-registry/server';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

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

  void logSystemEvent({
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
  }).catch(() => {});

  return NextResponse.json({
    proposalId: proposal.id,
    approvalsNeeded: proposal.approvalsNeeded,
    preview: proposal.preview,
  });
}
