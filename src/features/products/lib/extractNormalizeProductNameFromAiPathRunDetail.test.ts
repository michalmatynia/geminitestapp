import { describe, expect, it } from 'vitest';

import {
  extractNormalizeProductNameFromAiPathRunDetail,
  extractNormalizeProductNameResultFromAiPathRunDetail,
  isNormalizeProductNamePath,
} from './extractNormalizeProductNameFromAiPathRunDetail';

describe('extractNormalizeProductNameFromAiPathRunDetail', () => {
  it('prefers the database update payload when present', () => {
    expect(
      extractNormalizeProductNameFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'database',
            outputs: {
              debugPayload: {
                updateDoc: {
                  $set: {
                    name_en: 'Database Value',
                  },
                },
              },
            },
          },
          {
            nodeType: 'mapper',
            outputs: {
              result: 'Mapper Value',
            },
          },
        ],
      })
    ).toBe('Database Value');
  });

  it('falls back to mapper outputs when the database node has no update payload', () => {
    expect(
      extractNormalizeProductNameFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'mapper',
            outputs: {
              bundle: {
                normalizedName: 'Attack On Titan Scout Regiment Pin | 4 cm | Metal | Anime Pins | Anime',
                title: 'Attack On Titan Scout Regiment Pin',
                size: '4 cm',
                material: 'Metal',
                category: 'Anime Pins',
                theme: 'Anime',
                isValid: true,
                validationError: null,
                confidence: 0.92,
              },
            },
          },
        ],
      })
    ).toBe('Attack On Titan Scout Regiment Pin | 4 cm | Metal | Anime Pins | Anime');
  });

  it('falls back to runtimeState node outputs when nodes are unavailable', () => {
    expect(
      extractNormalizeProductNameFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-mapper': {
                bundle: {
                  normalizedName: 'Runtime Bundle Value',
                },
              },
            },
          },
        },
      })
    ).toBe('Runtime Bundle Value');
  });

  it('extracts the structured normalize payload when available', () => {
    expect(
      extractNormalizeProductNameResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'mapper',
            outputs: {
              bundle: {
                normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Anime Pins | Attack On Titan',
                title: 'Scout Regiment Badge',
                size: '4 cm',
                material: 'Metal',
                category: 'Anime Pins',
                theme: 'Attack On Titan',
                isValid: true,
                validationError: null,
                confidence: 0.88,
              },
            },
          },
        ],
      })
    ).toEqual({
      normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Anime Pins | Attack On Titan',
      title: 'Scout Regiment Badge',
      size: '4 cm',
      material: 'Metal',
      category: 'Anime Pins',
      theme: 'Attack On Titan',
      isValid: true,
      validationError: null,
      confidence: 0.88,
    });
  });
});

describe('isNormalizeProductNamePath', () => {
  it('matches the seeded normalize path id', () => {
    expect(isNormalizeProductNamePath('path_name_normalize_v1')).toBe(true);
    expect(isNormalizeProductNamePath(' path_name_normalize_v1 ')).toBe(true);
    expect(isNormalizeProductNamePath('path_other')).toBe(false);
  });
});
