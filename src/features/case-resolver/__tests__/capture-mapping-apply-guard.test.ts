import { describe, expect, it } from 'vitest';

import { resolveCaptureMappingApplyGuardReason } from '@/features/case-resolver/capture-mapping-apply-guard';

describe('resolveCaptureMappingApplyGuardReason', () => {
  it('allows apply when modal is open, not dismissed, draft exists, and apply is not in flight', () => {
    expect(
      resolveCaptureMappingApplyGuardReason({
        modalOpen: true,
        dismissed: false,
        hasDraft: true,
        inFlight: false,
      })
    ).toBeNull();
  });

  it('blocks apply when modal is closed', () => {
    expect(
      resolveCaptureMappingApplyGuardReason({
        modalOpen: false,
        dismissed: false,
        hasDraft: true,
        inFlight: false,
      })
    ).toBe('modal_closed');
  });

  it('blocks apply when mapping was dismissed', () => {
    expect(
      resolveCaptureMappingApplyGuardReason({
        modalOpen: true,
        dismissed: true,
        hasDraft: true,
        inFlight: false,
      })
    ).toBe('dismissed');
  });

  it('blocks apply when draft is missing', () => {
    expect(
      resolveCaptureMappingApplyGuardReason({
        modalOpen: true,
        dismissed: false,
        hasDraft: false,
        inFlight: false,
      })
    ).toBe('missing_draft');
  });

  it('blocks apply when another apply is in flight', () => {
    expect(
      resolveCaptureMappingApplyGuardReason({
        modalOpen: true,
        dismissed: false,
        hasDraft: true,
        inFlight: true,
      })
    ).toBe('in_flight');
  });
});
