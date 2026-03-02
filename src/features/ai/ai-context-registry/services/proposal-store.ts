import 'server-only';

import { randomUUID } from 'crypto';

import type { ContextProposal } from '@/shared/contracts/ai-context-registry';

// ─── In-memory store ──────────────────────────────────────────────────────────
// Module-level singleton — persists across requests within the same worker process.

const proposals = new Map<string, ContextProposal>();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function saveProposal(
  data: Omit<ContextProposal, 'id' | 'createdAt'>
): ContextProposal {
  const proposal: ContextProposal = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  proposals.set(proposal.id, proposal);
  return proposal;
}

export function getProposal(id: string): ContextProposal | undefined {
  return proposals.get(id);
}

export function updateProposal(
  id: string,
  updates: Partial<Pick<ContextProposal, 'status' | 'executedAt' | 'approvedBy'>>
): ContextProposal | undefined {
  const existing = proposals.get(id);
  if (!existing) return undefined;
  const updated: ContextProposal = { ...existing, ...updates };
  proposals.set(id, updated);
  return updated;
}

// ─── Test utility ─────────────────────────────────────────────────────────────

/** Only for use in tests — clears the proposal store between test runs. */
export const __testOnly = {
  clearProposals(): void {
    proposals.clear();
  },
};
