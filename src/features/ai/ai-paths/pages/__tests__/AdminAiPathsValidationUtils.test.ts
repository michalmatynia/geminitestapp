import { describe, expect, it } from 'vitest';

import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import {
  parseAiPathsSettings,
  parseCollectionMapText,
  parseDocsSourcesText,
} from '../AdminAiPathsValidationUtils';

const toCanonicalPathConfig = (pathId: string) => {
  const config = createDefaultPathConfig(pathId);
  const timestamp = '2026-03-03T18:00:00.000Z';
  return {
    ...config,
    nodes: config.nodes.map((node) => ({
      ...node,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  };
};

describe('AdminAiPathsValidationUtils', () => {
  it('parses canonical AI Paths validation settings', () => {
    const config = toCanonicalPathConfig('path_valid');
    const result = parseAiPathsSettings([
      {
        key: `${PATH_CONFIG_PREFIX}${config.id}`,
        value: JSON.stringify(config),
      },
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([
          {
            id: config.id,
            name: config.name,
            createdAt: config.updatedAt,
            updatedAt: config.updatedAt,
          },
        ]),
      },
    ]);

    expect(result.pathMetas).toHaveLength(1);
    expect(result.pathConfigs[config.id]?.id).toBe(config.id);
  });

  it('ignores legacy path index storage key', () => {
    const config = toCanonicalPathConfig('path_legacy_index');
    const result = parseAiPathsSettings([
      {
        key: `${PATH_CONFIG_PREFIX}${config.id}`,
        value: JSON.stringify(config),
      },
      {
        key: 'ai_path_index',
        value: JSON.stringify([
          {
            id: config.id,
            name: 'Legacy Path Name',
            createdAt: config.updatedAt,
            updatedAt: config.updatedAt,
          },
        ]),
      },
    ]);

    expect(result.pathMetas).toHaveLength(0);
    expect(result.pathConfigs[config.id]?.id).toBe(config.id);
  });

  it('does not synthesize path metas from config records when index entry is missing', () => {
    const config = toCanonicalPathConfig('path_missing_index_meta');
    const result = parseAiPathsSettings([
      {
        key: `${PATH_CONFIG_PREFIX}${config.id}`,
        value: JSON.stringify(config),
      },
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([
          {
            id: 'path_other',
            name: 'Other Path',
            createdAt: config.updatedAt,
            updatedAt: config.updatedAt,
          },
        ]),
      },
    ]);

    expect(result.pathMetas).toHaveLength(0);
    expect(result.pathConfigs[config.id]?.id).toBe(config.id);
  });

  it('rejects invalid non-empty AI Path config payloads instead of coercing them', () => {
    expect(() =>
      parseAiPathsSettings([
        {
          key: `${PATH_CONFIG_PREFIX}path_invalid`,
          value: JSON.stringify({
            id: 'path_invalid',
            name: 'Broken config',
          }),
        },
      ])
    ).toThrowError(/Invalid AI Paths validation path config payload\./i);
  });

  it('rejects path config id mismatches', () => {
    const config = toCanonicalPathConfig('path_canonical');

    expect(() =>
      parseAiPathsSettings([
        {
          key: `${PATH_CONFIG_PREFIX}path_other`,
          value: JSON.stringify(config),
        },
      ])
    ).toThrowError(/path config id does not match its settings key/i);
  });

  it('parses canonical entity:collection lines in collection-map draft', () => {
    expect(parseCollectionMapText('product:product_parameters\nnote:notes')).toEqual({
      product: 'product_parameters',
      note: 'notes',
    });
  });

  it('ignores legacy entity=collection lines in collection-map draft', () => {
    expect(parseCollectionMapText('product=product_parameters\nnote:notes')).toEqual({
      note: 'notes',
    });
  });

  it('parses canonical docs sources one-per-line', () => {
    expect(parseDocsSourcesText('ai-paths:node-docs:trigger\nai-paths:node-docs:database')).toEqual(
      ['ai-paths:node-docs:trigger', 'ai-paths:node-docs:database']
    );
  });

  it('ignores legacy comma-delimited docs sources lines', () => {
    expect(parseDocsSourcesText('ai-paths:node-docs:trigger,ai-paths:node-docs:database')).toEqual(
      []
    );
  });
});
