import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProposalMock, updateProposalMock } = vi.hoisted(() => ({
  getProposalMock: vi.fn(),
  updateProposalMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  getProposal: getProposalMock,
  updateProposal: updateProposalMock,
}));

import { postHandler } from './handler';

const PENDING_PROPOSAL = {
  id: '22222222-2222-4222-8222-222222222222',
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

const VALID_APPROVAL = {
  approvedBy: 'admin@example.com',
  approvedAtISO: '2026-01-01T12:00:00.000Z',
};

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/actions/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/ai/actions/execute handler', () => {
  beforeEach(() => {
    getProposalMock.mockReset();
    updateProposalMock.mockReset();
  });

  it('executes a pending proposal successfully', async () => {
    getProposalMock.mockReturnValue(PENDING_PROPOSAL);
    updateProposalMock.mockReturnValue({ ...PENDING_PROPOSAL, status: 'executed' });

    const res = await postHandler(
      makeRequest({
        proposalId: PENDING_PROPOSAL.id,
        approval: VALID_APPROVAL,
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      proposalId: string;
      status: string;
      message: string;
    };
    expect(body.ok).toBe(true);
    expect(body.proposalId).toBe(PENDING_PROPOSAL.id);
    expect(body.status).toBe('executed');
    expect(body.message).toContain('executed');
  });

  it('calls updateProposal with status=executed and approvedBy', async () => {
    getProposalMock.mockReturnValue(PENDING_PROPOSAL);
    updateProposalMock.mockReturnValue({ ...PENDING_PROPOSAL, status: 'executed' });

    await postHandler(
      makeRequest({ proposalId: PENDING_PROPOSAL.id, approval: VALID_APPROVAL }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(updateProposalMock).toHaveBeenCalledWith(
      PENDING_PROPOSAL.id,
      expect.objectContaining({
        status: 'executed',
        approvedBy: 'admin@example.com',
      })
    );
  });

  it('throws notFoundError when proposal does not exist', async () => {
    getProposalMock.mockReturnValue(undefined);

    await expect(
      postHandler(
        makeRequest({
          proposalId: '00000000-0000-0000-0000-000000000000',
          approval: VALID_APPROVAL,
        }),
        {} as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow('Proposal not found.');
  });

  it('throws badRequestError when proposal is not pending', async () => {
    getProposalMock.mockReturnValue({ ...PENDING_PROPOSAL, status: 'executed' });

    await expect(
      postHandler(
        makeRequest({ proposalId: PENDING_PROPOSAL.id, approval: VALID_APPROVAL }),
        {} as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow('Proposal is not pending');
  });

  it('throws for missing required fields in request body', async () => {
    await expect(
      postHandler(makeRequest({}), {} as Parameters<typeof postHandler>[1])
    ).rejects.toThrow('Invalid execute request payload.');
  });

  it('throws for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/ai/actions/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json',
    });
    await expect(postHandler(req, {} as Parameters<typeof postHandler>[1])).rejects.toThrow(
      'Invalid JSON body.'
    );
  });

  it('throws for invalid proposalId (not UUID)', async () => {
    await expect(
      postHandler(
        makeRequest({ proposalId: 'not-a-uuid', approval: VALID_APPROVAL }),
        {} as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow('Invalid execute request payload.');
  });
});
