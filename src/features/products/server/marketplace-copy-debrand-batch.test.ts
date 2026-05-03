import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/features/ai/ai-paths/server', () => ({
  ensureCanonicalStarterWorkflowSettingsForPathIds: vi.fn(),
  enqueuePathRun: vi.fn(),
  getAiPathsSetting: vi.fn(),
}));
vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  assertAiPathRunQueueReadyForEnqueue: vi.fn(),
}));
vi.mock('@/features/integrations/services/integration-service', () => ({
  integrationService: {
    getIntegrationById: vi.fn(),
  },
}));

import { ensureProductMarketplaceCopyOverrideForIntegration } from './marketplace-copy-debrand-batch';

describe('marketplace copy debrand batch helpers', () => {
  it('creates a marketplace copy override when the selected marketplace is missing', () => {
    const result = ensureProductMarketplaceCopyOverrideForIntegration(
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['tradera'],
            title: 'Tradera title',
            description: 'Tradera description',
          },
        ],
      },
      'allegro'
    );

    expect(result.created).toBe(true);
    expect(result.rowIndex).toBe(1);
    expect(result.row).toEqual({
      integrationIds: ['allegro'],
      title: null,
      description: null,
    });
    expect(result.marketplaceContentOverrides).toHaveLength(2);
  });

  it('reuses an existing marketplace copy override for the selected marketplace', () => {
    const result = ensureProductMarketplaceCopyOverrideForIntegration(
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['tradera', 'allegro'],
            title: 'Shared title',
            description: 'Shared description',
          },
        ],
      },
      'allegro'
    );

    expect(result.created).toBe(false);
    expect(result.rowIndex).toBe(0);
    expect(result.marketplaceContentOverrides).toHaveLength(1);
    expect(result.row).toEqual({
      integrationIds: ['tradera', 'allegro'],
      title: 'Shared title',
      description: 'Shared description',
    });
  });
});
