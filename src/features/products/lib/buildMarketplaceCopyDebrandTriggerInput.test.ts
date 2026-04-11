import { describe, expect, it } from 'vitest';

import { buildMarketplaceCopyDebrandTriggerInput } from './buildMarketplaceCopyDebrandTriggerInput';

describe('buildMarketplaceCopyDebrandTriggerInput', () => {
  it('normalizes source English fields and row payload for the debrand trigger', () => {
    expect(
      buildMarketplaceCopyDebrandTriggerInput({
        values: {
          name_en: '  Warhammer 40,000 Space Marine Figure  ',
          description_en: '  Official branded description  ',
        },
        row: {
          id: 'row-1',
          index: 2,
          integrationIds: ['integration-tradera'],
          integrationNames: ['Tradera'],
          currentAlternateTitle: '  ',
          currentAlternateDescription: '  Existing alt description  ',
        },
      })
    ).toEqual({
      sourceEnglishTitle: 'Warhammer 40,000 Space Marine Figure',
      sourceEnglishDescription: 'Official branded description',
      targetRow: {
        id: 'row-1',
        index: 2,
        integrationIds: ['integration-tradera'],
        integrationNames: ['Tradera'],
        currentAlternateTitle: null,
        currentAlternateDescription: 'Existing alt description',
      },
    });
  });
});
