import { describe, expect, it } from 'vitest';

import {
  applyPromptExploderTransferLifecycleUpdate,
  canTransitionPromptExploderTransferStatus,
  resolvePromptExploderTransferExpiry,
  resolvePromptExploderTransferStatusLabel,
} from '@/features/case-resolver/hooks/prompt-exploder-transfer-lifecycle';

describe('prompt exploder transfer lifecycle', () => {
  it('maps transfer statuses to stable labels', () => {
    expect(resolvePromptExploderTransferStatusLabel('pending')).toBe('Pending');
    expect(resolvePromptExploderTransferStatusLabel('expired')).toBe('Expired');
  });

  it('allows expected lifecycle transitions', () => {
    expect(canTransitionPromptExploderTransferStatus('pending', 'capture_review')).toBe(true);
    expect(canTransitionPromptExploderTransferStatus('expired', 'discarded')).toBe(true);
    expect(canTransitionPromptExploderTransferStatus('applied', 'failed')).toBe(false);
  });

  it('applies lifecycle updates when transition is valid', () => {
    const updated = applyPromptExploderTransferLifecycleUpdate(
      {
        status: 'pending',
        reason: null,
        updatedAt: '2026-02-20T00:00:00.000Z',
        payloadKey: 'transfer-1',
      },
      {
        nextStatus: 'blocked',
        reason: 'document_mismatch',
        at: '2026-02-20T00:00:05.000Z',
      }
    );
    expect(updated?.status).toBe('blocked');
    expect(updated?.reason).toBe('document_mismatch');
    expect(updated?.updatedAt).toBe('2026-02-20T00:00:05.000Z');
  });

  it('keeps current status when transition is invalid and force is not set', () => {
    const current = {
      status: 'applied' as const,
      reason: null,
      updatedAt: '2026-02-20T00:00:00.000Z',
      payloadKey: 'transfer-1',
    };
    const updated = applyPromptExploderTransferLifecycleUpdate(current, {
      nextStatus: 'failed',
      reason: 'mutation_error',
      at: '2026-02-20T00:00:10.000Z',
    });
    expect(updated).toEqual(current);
  });

  it('resolves transfer expiry with explicit expiresAt', () => {
    const expiry = resolvePromptExploderTransferExpiry({
      createdAt: '2026-02-20T00:00:00.000Z',
      expiresAt: '2026-02-20T00:10:00.000Z',
      nowMs: Date.parse('2026-02-20T00:10:01.000Z'),
    });
    expect(expiry.isExpired).toBe(true);
    expect(expiry.expiresAt).toBe('2026-02-20T00:10:00.000Z');
  });
});
