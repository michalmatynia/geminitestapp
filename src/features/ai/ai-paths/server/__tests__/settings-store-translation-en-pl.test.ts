import { describe, expect, it } from 'vitest';

import {
  needsTranslationEnPlConfigUpgrade,
  TRANSLATION_EN_PL_PATH_ID,
  upgradeTranslationEnPlConfig,
} from '@/features/ai/ai-paths/server/settings-store-translation-en-pl';

const buildLegacyConfig = (): Record<string, unknown> => ({
  id: TRANSLATION_EN_PL_PATH_ID,
  name: 'Translation EN->PL Description + Parameters',
  nodes: [
    {
      id: 'node-parser-translate-en-pl',
      type: 'parser',
      config: {},
    },
    {
      id: 'node-regex-translate-en-pl',
      type: 'regex',
      config: {},
    },
    {
      id: 'node-regex-params-translate-en-pl',
      type: 'regex',
      config: {},
    },
    {
      id: 'node-db-update-translate-en-pl',
      type: 'database',
      config: {
        database: {
          updatePayloadMode: 'custom',
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "description_pl": "{{value.description_pl}}",\n' +
            '    "parameters": {{bundle.parameters}}\n' +
            '  }\n' +
            '}',
          mappings: [{ sourcePort: 'result', targetPath: 'content_en' }],
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-tr-pl-06',
      from: 'node-regex-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'value',
      toPort: 'value',
    },
    {
      id: 'edge-tr-pl-15',
      from: 'node-regex-params-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'value',
      toPort: 'value',
    },
  ],
});

describe('translation EN->PL path config upgrade', () => {
  it('marks legacy config for upgrade', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    expect(needsTranslationEnPlConfigUpgrade(raw)).toBe(true);
  });

  it('upgrades template, mappings, and wiring to deterministic ports', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    const upgradedRaw = upgradeTranslationEnPlConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    const parsed = JSON.parse(upgradedRaw) as Record<string, unknown>;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const edges = Array.isArray(parsed['edges'])
      ? (parsed['edges'] as Array<Record<string, unknown>>)
      : [];
    const updateNode = nodes.find(
      (node: Record<string, unknown>) =>
        node['id'] === 'node-db-update-translate-en-pl',
    );
    if (!updateNode) throw new Error('Expected update node');
    const databaseConfig = ((updateNode['config'] as Record<string, unknown>)?.[
      'database'
    ] ?? {}) as Record<string, unknown>;
    const mappings = Array.isArray(databaseConfig['mappings'])
      ? (databaseConfig['mappings'] as Array<Record<string, unknown>>)
      : [];

    expect(databaseConfig['updateTemplate']).toEqual(
      expect.stringContaining('{{result.parameters}}'),
    );
    expect(mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePort: 'value',
          targetPath: '__translation_description_payload__',
        }),
        expect.objectContaining({
          sourcePort: 'result',
          targetPath: '__translation_parameters_payload__',
        }),
      ]),
    );
    expect(
      edges.some((edge: Record<string, unknown>) => {
        return (
          edge['from'] === 'node-regex-params-translate-en-pl' &&
          edge['to'] === 'node-db-update-translate-en-pl' &&
          edge['fromPort'] === 'value' &&
          edge['toPort'] === 'result'
        );
      }),
    ).toBe(true);
    expect(
      edges.some((edge: Record<string, unknown>) => {
        return (
          edge['from'] === 'node-parser-translate-en-pl' &&
          edge['to'] === 'node-db-update-translate-en-pl' &&
          edge['fromPort'] === 'bundle' &&
          edge['toPort'] === 'bundle'
        );
      }),
    ).toBe(true);
    expect(
      edges.filter((edge: Record<string, unknown>) => {
        return (
          edge['to'] === 'node-db-update-translate-en-pl' &&
          edge['toPort'] === 'value'
        );
      }),
    ).toHaveLength(1);
  });

  it('marks upgraded config as up to date', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    const upgradedRaw = upgradeTranslationEnPlConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    expect(needsTranslationEnPlConfigUpgrade(upgradedRaw)).toBe(false);
  });
});
