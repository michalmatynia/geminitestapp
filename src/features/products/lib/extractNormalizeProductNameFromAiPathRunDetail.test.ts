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

  it('enriches the normalize payload with live category context from sibling node outputs', () => {
    expect(
      extractNormalizeProductNameResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'function',
            outputs: {
              bundle: {
                categoryContext: {
                  catalogId: 'catalog-a',
                  currentCategoryId: 'leaf-anime-pins',
                  totalCategories: 2,
                  totalLeafCategories: 1,
                  allowedLeafLabels: ['Anime Pins'],
                  leafCategories: [
                    {
                      id: 'leaf-anime-pins',
                      label: 'Anime Pins',
                      fullPath: 'Pins > Anime Pins',
                      parentId: 'parent-pins',
                      isCurrent: true,
                    },
                  ],
                },
              },
            },
          },
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
      categoryContext: {
        catalogId: 'catalog-a',
        currentCategoryId: 'leaf-anime-pins',
        allowedLeafLabels: ['Anime Pins'],
        totalCategories: 2,
        totalLeafCategories: 1,
        fetchedAt: null,
        leafCategories: [
          {
            id: 'leaf-anime-pins',
            label: 'Anime Pins',
            fullPath: 'Pins > Anime Pins',
            parentId: 'parent-pins',
            isCurrent: true,
          },
        ],
      },
    });
  });

  it('replaces generic category-context errors with db schema diagnostics when available', () => {
    expect(
      extractNormalizeProductNameResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'db_schema',
            outputs: {
              context: {
                liveContext: {
                  query: '{ "catalogId": "catalog-a" }',
                  collectionMap: {
                    product_categories: {
                      name: 'product_categories',
                      documents: [],
                      error: 'Live context query is missing connected inputs: context.catalogId.',
                    },
                  },
                },
              },
            },
          },
          {
            nodeType: 'function',
            outputs: {
              bundle: {
                categoryContext: {
                  catalogId: 'catalog-a',
                  totalCategories: 0,
                  totalLeafCategories: 0,
                  allowedLeafLabels: [],
                  leafCategories: [],
                },
              },
            },
          },
          {
            nodeType: 'mapper',
            outputs: {
              bundle: {
                normalizedName: 'Placeholder | 4 cm | Metal | Pins | Anime',
                title: 'Placeholder',
                size: '4 cm',
                material: 'Metal',
                category: 'Pins',
                theme: 'Anime',
                isValid: false,
                validationError: 'Category context unavailable',
                confidence: 0.12,
              },
            },
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        isValid: false,
        validationError:
          'Category context unavailable: Live context query is missing connected inputs: context.catalogId.',
      })
    );
  });
});

describe('isNormalizeProductNamePath', () => {
  it('matches the seeded normalize path id', () => {
    expect(isNormalizeProductNamePath('path_name_normalize_v1')).toBe(true);
    expect(isNormalizeProductNamePath(' path_name_normalize_v1 ')).toBe(true);
    expect(isNormalizeProductNamePath('path_other')).toBe(false);
  });
});
