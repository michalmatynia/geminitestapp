import { apiHandler } from '@/shared/lib/api/api-handler';
import { NextResponse } from 'next/server';
import {
  getAgentApprovalGate,
  getAgentDiscoverySummary,
  listAgentApprovalGates,
} from '@/shared/lib/agent-discovery';

const GET_handler = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const gateId = searchParams.get('gateId');

  if (gateId) {
    const gate = getAgentApprovalGate(gateId);

    if (!gate) {
      return NextResponse.json(
        { error: `Unknown approval gate: ${gateId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      approvalGate: gate,
      ...getAgentDiscoverySummary(),
    });
  }

  return NextResponse.json({
    approvalGates: listAgentApprovalGates({
      requiredFor: searchParams.get('requiredFor'),
    }),
    ...getAgentDiscoverySummary(),
  });
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.approval-gates.GET',
});
