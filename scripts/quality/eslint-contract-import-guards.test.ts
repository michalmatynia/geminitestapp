import { describe, expect, it } from 'vitest';

import eslintConfig from '../../eslint.config.mjs';

const GUARDED_IMPORT_NAMES = [
  'KangurKnowledgeGraphPreviewRequest',
  'KangurKnowledgeGraphPreviewResponse',
  'KangurKnowledgeGraphSemanticReadiness',
  'KangurKnowledgeGraphStatusSnapshot',
  'KangurKnowledgeGraphSyncRequest',
  'KangurKnowledgeGraphSyncResponse',
  'KangurRecentAnalyticsEvent',
  'kangurKnowledgeGraphPreviewRequestSchema',
  'kangurKnowledgeGraphSyncRequestSchema',
  'kangurKnowledgeGraphSyncResponseSchema',
];

const collectRestrictedPaths = () =>
  eslintConfig.flatMap((entry) => {
    const rule = entry.rules?.['no-restricted-imports'];
    if (!Array.isArray(rule) || typeof rule[1] !== 'object' || rule[1] === null) {
      return [];
    }

    return Array.isArray(rule[1].paths) ? rule[1].paths : [];
  });

describe('eslint contract import guards', () => {
  it('keeps Kangur observability contracts pinned to the canonical module path', () => {
    const restrictedPaths = collectRestrictedPaths();

    expect(restrictedPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '@/shared/contracts',
          importNames: expect.arrayContaining(GUARDED_IMPORT_NAMES),
          message: expect.stringContaining('@/shared/contracts/kangur-observability'),
        }),
        expect.objectContaining({
          name: '@/shared/contracts/admin',
          importNames: expect.arrayContaining(GUARDED_IMPORT_NAMES),
          message: expect.stringContaining('@/shared/contracts/kangur-observability'),
        }),
        expect.objectContaining({
          name: '@/shared/contracts/kangur',
          importNames: expect.arrayContaining(GUARDED_IMPORT_NAMES),
          message: expect.stringContaining('@/shared/contracts/kangur-observability'),
        }),
      ])
    );
  });

  it('keeps the broad integrations barrel out of product-facing and internal callers', () => {
    const restrictedPaths = collectRestrictedPaths();

    expect(restrictedPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '@/features/integrations/public',
          message: expect.stringContaining('@/features/integrations/product-integrations-adapter'),
        }),
      ])
    );
  });
});
