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

  it('drops shipping automation notes from debrand source descriptions', () => {
    expect(
      buildMarketplaceCopyDebrandTriggerInput({
        values: {
          name_en: 'Keychain title',
          description_en: 'Auto-assigned keychain shipping for Tradera listings.',
        },
        row: {
          id: 'row-1',
          index: 0,
          integrationIds: ['integration-tradera'],
          integrationNames: ['Tradera'],
          currentAlternateTitle: 'Keychain row title',
          currentAlternateDescription: 'Auto-assigned keychain shipping for Tradera listings.',
        },
      })
    ).toEqual({
      sourceEnglishTitle: 'Keychain title',
      sourceEnglishDescription: '',
      targetRow: {
        id: 'row-1',
        index: 0,
        integrationIds: ['integration-tradera'],
        integrationNames: ['Tradera'],
        currentAlternateTitle: 'Keychain row title',
        currentAlternateDescription: null,
      },
    });
  });
});
