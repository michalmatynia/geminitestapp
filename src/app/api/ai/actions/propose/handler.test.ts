import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveWithExpansionMock, getContextPackByIdMock, saveProposalMock } = vi.hoisted(() => ({
  resolveWithExpansionMock: vi.fn(),
  getContextPackByIdMock: vi.fn(),
  saveProposalMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  retrievalService: { resolveWithExpansion: resolveWithExpansionMock },
  saveProposal: saveProposalMock,
  getContextPackById: getContextPackByIdMock,
}));

import { POST_handler } from './handler';

const MOCK_PACK = {
  id: 'data_analysis',
  description: 'Data pack',
  maxSteps: 6,
  maxNodes: 100,
  maxBytes: 180_000,
  allowedKinds: ['collection', 'policy', 'workflow'],
  systemPrompt: 'You are a data analysis assistant.',
  buildSeedContext: () => 'seed',
};

const MOCK_RESOLUTION = {
  nodes: [
    {
      id: 'collection:orders',
      kind: 'collection',
      permissions: { riskTier: 'low', classification: 'internal', readScopes: ['ctx:read'] },
    },
  ],
  truncated: false,
  visitedIds: ['collection:orders'],
};

const MOCK_PROPOSAL = {
  id: '11111111-1111-1111-1111-111111111111',
  workflow: 'data_analysis',
  intent: 'Analyze order volumes',
  rootIds: ['collection:orders'],
  status: 'pending',
  approvalsNeeded: false,
  preview: {
    summary: 'Proposal for data_analysis: Analyze order volumes',
    impactedNodeIds: ['collection:orders'],
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/actions/propose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/ai/actions/propose handler', () => {
  beforeEach(() => {
    resolveWithExpansionMock.mockReset();
    getContextPackByIdMock.mockReset();
    saveProposalMock.mockReset();
    getContextPackByIdMock.mockReturnValue(MOCK_PACK);
    resolveWithExpansionMock.mockReturnValue(MOCK_RESOLUTION);
    saveProposalMock.mockReturnValue(MOCK_PROPOSAL);
  });

  it('returns proposalId, approvalsNeeded, and preview', async () => {
    const res = await POST_handler(
      makeRequest({
        workflow: 'data_analysis',
        intent: 'Analyze order volumes',
        rootIds: ['collection:orders'],
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      proposalId: string;
      approvalsNeeded: boolean;
      preview: { summary: string; impactedNodeIds: string[] };
    };
    expect(body.proposalId).toBe(MOCK_PROPOSAL.id);
    expect(body.approvalsNeeded).toBe(false);
    expect(body.preview.impactedNodeIds).toEqual(['collection:orders']);
  });

  it('calls getContextPackById with workflow', async () => {
    await POST_handler(
      makeRequest({ workflow: 'data_analysis', intent: 'Test', rootIds: ['collection:orders'] }),
      {} as Parameters<typeof POST_handler>[1]
    );
    expect(getContextPackByIdMock).toHaveBeenCalledWith('data_analysis');
  });

  it('passes pack.maxNodes to resolveWithExpansion', async () => {
    await POST_handler(
      makeRequest({ workflow: 'data_analysis', intent: 'Test', rootIds: ['collection:orders'] }),
      {} as Parameters<typeof POST_handler>[1]
    );
    expect(resolveWithExpansionMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxNodes: MOCK_PACK.maxNodes })
    );
  });

  it('sets approvalsNeeded=true when a node has medium riskTier', async () => {
    resolveWithExpansionMock.mockReturnValue({
      nodes: [
        {
          id: 'action:run-ai-path',
          kind: 'action',
          permissions: { riskTier: 'medium', classification: 'internal', readScopes: ['ctx:read'] },
        },
      ],
      truncated: false,
      visitedIds: ['action:run-ai-path'],
    });
    saveProposalMock.mockReturnValue({ ...MOCK_PROPOSAL, approvalsNeeded: true });

    const res = await POST_handler(
      makeRequest({
        workflow: 'admin_automation',
        intent: 'Run AI path',
        rootIds: ['action:run-ai-path'],
      }),
      {} as Parameters<typeof POST_handler>[1]
    );
    const body = (await res.json()) as { approvalsNeeded: boolean };
    expect(body.approvalsNeeded).toBe(true);
  });

  it('throws for invalid payload (missing required fields)', async () => {
    await expect(
      POST_handler(makeRequest({}), {} as Parameters<typeof POST_handler>[1])
    ).rejects.toThrow('Invalid propose request payload.');
  });

  it('throws for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/ai/actions/propose', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json',
    });
    await expect(POST_handler(req, {} as Parameters<typeof POST_handler>[1])).rejects.toThrow(
      'Invalid JSON body.'
    );
  });
});
