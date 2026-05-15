import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
  createBaseRecoveryContext: (input: unknown) => input,
}));

import { getMarketplaceButtonClass } from '../product-column-utils';
import { resolveBaseQuickExportButtonViewState } from './BaseQuickExportButton.view-model';

describe('resolveBaseQuickExportButtonViewState', () => {
  it('uses the canonical amber pending tint while one-click export is submitting', () => {
    const state = resolveBaseQuickExportButtonViewState({
      status: 'not_started',
      showMarketplaceBadge: false,
      quickExportMutationPending: true,
      quickExportLocked: false,
      trackedExportRunStatus: null,
      trackedExportRunContextId: null,
      trackedExportRunErrorMessage: null,
    });

    expect(state.quickExportPending).toBe(true);
    expect(state.resolvedButtonStatus).toBe('pending');
    expect(state.shouldUseFilledMarketplaceTone).toBe(true);
    expect(
      getMarketplaceButtonClass(
        state.resolvedButtonStatus,
        state.shouldUseFilledMarketplaceTone,
        'base'
      )
    ).toContain('amber');
  });
});
