import { describe, expect, it } from 'vitest';

import { resolveProductStudioSourceSlotCandidates } from './product-studio-service.preflight';
import type { ProductStudioConfig } from '@/shared/contracts/products';

const makeConfig = (overrides: Partial<ProductStudioConfig> = {}): ProductStudioConfig => ({
  projectId: 'studio-a',
  sourceSlotByImageIndex: { '0': 'slot-source' },
  sourceSlotHistoryByImageIndex: { '0': ['slot-source', ' slot-alt ', '', 'slot-alt'] },
  updatedAt: '2026-04-03T12:00:00.000Z',
  ...overrides,
});

describe('resolveProductStudioSourceSlotCandidates', () => {
  it('deduplicates and trims current source plus history values', () => {
    expect(resolveProductStudioSourceSlotCandidates(makeConfig(), 0)).toEqual([
      'slot-source',
      'slot-alt',
    ]);
  });

  it('ignores blank current ids and non-array history payloads', () => {
    const config = {
      ...makeConfig({
        sourceSlotByImageIndex: { '1': '   ' },
      }),
      sourceSlotHistoryByImageIndex: {
        '1': 'not-an-array',
      },
    } as unknown as ProductStudioConfig;

    expect(resolveProductStudioSourceSlotCandidates(config, 1)).toEqual([]);
  });

  it('returns the current source id when no history exists', () => {
    expect(
      resolveProductStudioSourceSlotCandidates(
        makeConfig({
          sourceSlotByImageIndex: { '2': 'slot-current' },
          sourceSlotHistoryByImageIndex: {},
        }),
        2
      )
    ).toEqual(['slot-current']);
  });
});
