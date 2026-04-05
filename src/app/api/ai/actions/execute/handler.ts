import { NextRequest, NextResponse } from 'next/server';

import { getProposal, updateProposal } from '@/features/ai/ai-context-registry/server';
import { executeActionRequestSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      void ErrorSystem.captureException(error);
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = executeActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid execute request payload.');
  }

  const { proposalId, approval } = parsed.data;

  const proposal = getProposal(proposalId);
  if (!proposal) {
    throw notFoundError('Proposal not found.', { proposalId });
  }

  if (proposal.status !== 'pending') {
    throw badRequestError(`Proposal is not pending (status: ${proposal.status}).`, {
      proposalId,
      status: proposal.status,
    });
  }

  const updated = updateProposal(proposalId, {
    status: 'executed',
    executedAt: new Date().toISOString(),
    approvedBy: approval.approvedBy,
  });

  void logSystemEvent({
    level: 'info',
    message: '[ai-context-registry] actions.execute',
    source: 'ai.actions.execute',
    context: {
      proposalId,
      approvedBy: approval.approvedBy,
      workflow: proposal.workflow,
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    proposalId,
    status: updated?.status ?? 'executed',
    message: 'Proposal marked as executed. Actual execution logic is out of scope.',
  });
}
