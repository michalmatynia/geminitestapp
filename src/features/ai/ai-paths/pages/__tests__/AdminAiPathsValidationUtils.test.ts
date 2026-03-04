import { describe, expect, it } from 'vitest';

import {
  LEGACY_PATH_INDEX_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import { parseAiPathsSettings } from '../AdminAiPathsValidationUtils';

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

  it('falls back to legacy path index storage key', () => {
    const config = toCanonicalPathConfig('path_legacy_index');
    const result = parseAiPathsSettings([
      {
        key: `${PATH_CONFIG_PREFIX}${config.id}`,
        value: JSON.stringify(config),
      },
      {
        key: LEGACY_PATH_INDEX_KEY,
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
    expect(result.pathMetas[0]?.id).toBe(config.id);
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
});
