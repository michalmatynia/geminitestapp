import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getAgentApprovalGate,
  getAgentDiscoverySummary,
  listAgentApprovalGates,
} from '@/shared/lib/agent-discovery';
import type { ApiHandlerContext } from '@/shared/lib/api/api-handler';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  gateId: optionalTrimmedQueryString(),
  requiredFor: optionalTrimmedQueryString(),
});

export const getApprovalGatesHandler = (
  _request: Request,
  ctx: ApiHandlerContext
): Promise<Response> => {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const gateId = query.gateId;

  if (typeof gateId === 'string' && gateId !== '') {
    const gate = getAgentApprovalGate(gateId);

    if (gate === null) {
      return Promise.resolve(
        NextResponse.json(
          { error: `Unknown approval gate: ${gateId}` },
          { status: 404 },
        )
      );
    }

    return Promise.resolve(
      NextResponse.json({
        approvalGate: gate,
        ...getAgentDiscoverySummary(),
      })
    );
  }

  return Promise.resolve(
    NextResponse.json({
      approvalGates: listAgentApprovalGates({
        requiredFor: query.requiredFor ?? null,
      }),
      ...getAgentDiscoverySummary(),
    })
  );
};
