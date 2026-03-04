import { describe, it, expect, beforeEach } from 'vitest';

import { saveProposal, getProposal, updateProposal, __testOnly } from '../proposal-store';

const BASE_PROPOSAL = {
  workflow: 'data_analysis' as const,
  intent: 'Analyze order volumes by month',
  rootIds: ['collection:orders'],
  status: 'pending' as const,
  approvalsNeeded: false,
  preview: {
    summary: 'Proposal for data_analysis: Analyze order volumes by month',
    impactedNodeIds: ['collection:orders'],
  },
};

describe('proposal-store', () => {
  beforeEach(() => {
    __testOnly.clearProposals();
  });

  describe('saveProposal', () => {
    it('generates a UUID id', () => {
      const proposal = saveProposal(BASE_PROPOSAL);
      expect(proposal.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('sets createdAt to an ISO datetime string', () => {
      const proposal = saveProposal(BASE_PROPOSAL);
      expect(() => new Date(proposal.createdAt)).not.toThrow();
      expect(new Date(proposal.createdAt).toISOString()).toBe(proposal.createdAt);
    });

    it('preserves all provided fields', () => {
      const proposal = saveProposal(BASE_PROPOSAL);
      expect(proposal.workflow).toBe('data_analysis');
      expect(proposal.intent).toBe(BASE_PROPOSAL.intent);
      expect(proposal.rootIds).toEqual(BASE_PROPOSAL.rootIds);
      expect(proposal.status).toBe('pending');
      expect(proposal.approvalsNeeded).toBe(false);
      expect(proposal.preview).toEqual(BASE_PROPOSAL.preview);
    });

    it('generates unique IDs for separate calls', () => {
      const a = saveProposal(BASE_PROPOSAL);
      const b = saveProposal(BASE_PROPOSAL);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getProposal', () => {
    it('returns saved proposal by id', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      const found = getProposal(saved.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(saved.id);
    });

    it('returns undefined for unknown id', () => {
      expect(getProposal('00000000-0000-0000-0000-000000000000')).toBeUndefined();
    });
  });

  describe('updateProposal', () => {
    it('updates status', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      const updated = updateProposal(saved.id, { status: 'executed' });
      expect(updated?.status).toBe('executed');
    });

    it('updates executedAt', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      const ts = new Date().toISOString();
      const updated = updateProposal(saved.id, { executedAt: ts });
      expect(updated?.executedAt).toBe(ts);
    });

    it('updates approvedBy', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      const updated = updateProposal(saved.id, { approvedBy: 'admin@example.com' });
      expect(updated?.approvedBy).toBe('admin@example.com');
    });

    it('returns undefined for unknown id', () => {
      const result = updateProposal('00000000-0000-0000-0000-000000000000', { status: 'executed' });
      expect(result).toBeUndefined();
    });

    it('persists updates — subsequent getProposal reflects changes', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      updateProposal(saved.id, { status: 'executed', approvedBy: 'user1' });
      const refreshed = getProposal(saved.id);
      expect(refreshed?.status).toBe('executed');
      expect(refreshed?.approvedBy).toBe('user1');
    });
  });

  describe('__testOnly.clearProposals', () => {
    it('removes all stored proposals', () => {
      const saved = saveProposal(BASE_PROPOSAL);
      __testOnly.clearProposals();
      expect(getProposal(saved.id)).toBeUndefined();
    });
  });
});
