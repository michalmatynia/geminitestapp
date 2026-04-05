import { describe, expect, it } from 'vitest';

import { buildPortablePathPackage } from '@/shared/lib/ai-paths/portable-engine';
import { createDefaultPathConfig, type PathConfig } from '@/shared/lib/ai-paths';

import {
  findRemovedLegacyTriggerContextModesInDocument,
  formatRemovedLegacyTriggerContextModesMessage,
  normalizeRemovedTriggerContextModesInDocument,
  normalizeRemovedTriggerContextModesInPathConfig,
} from '../legacy-trigger-context-mode';

const buildLegacyTriggerConfig = (pathId: string): PathConfig => {
  const pathConfig = createDefaultPathConfig(pathId);
  const seedNode = pathConfig.nodes[0];
  if (!seedNode) {
    throw new Error('Expected default path config to include a seed node.');
  }
  pathConfig.nodes = [
    {
      ...seedNode,
      type: 'trigger',
      title: 'Trigger: Opis i Tytuł',
      inputs: ['context'],
      outputs: ['trigger', 'context', 'entityId', 'entityType'],
      config: {
        trigger: {
          event: 'manual',
          contextMode: 'simulation_preferred',
        },
      },
    },
  ];
  pathConfig.edges = [];
  return pathConfig;
};

describe('legacy-trigger-context-mode', () => {
  it('finds removed legacy trigger context modes in plain path config payloads', () => {
    const removedModes = findRemovedLegacyTriggerContextModesInDocument(
      buildLegacyTriggerConfig('path_plain')
    );

    expect(removedModes).toHaveLength(1);
    expect(removedModes[0]?.contextMode).toBe('simulation_preferred');
  });

  it('finds removed legacy trigger context modes in portable payloads', () => {
    const removedModes = findRemovedLegacyTriggerContextModesInDocument(
      buildPortablePathPackage(buildLegacyTriggerConfig('path_portable'), {
        exporterVersion: 'test.legacy-trigger',
      })
    );

    expect(removedModes).toHaveLength(1);
    expect(removedModes[0]?.contextMode).toBe('simulation_preferred');
  });

  it('formats a targeted hard-cut error message', () => {
    const removedModes = findRemovedLegacyTriggerContextModesInDocument(
      buildLegacyTriggerConfig('path_message')
    );

    expect(
      formatRemovedLegacyTriggerContextModesMessage(removedModes, {
        surface: 'path config',
      })
    ).toMatch(/removed legacy Trigger context modes/i);
  });

  it('remediates removed legacy trigger context modes in plain path config payloads', () => {
    const legacyConfig = buildLegacyTriggerConfig('path_remains_legacy');
    const remediated = normalizeRemovedTriggerContextModesInPathConfig(legacyConfig);

    expect(remediated.changed).toBe(true);
    expect(remediated.value?.nodes?.[0]?.config?.trigger?.contextMode).toBe('trigger_only');
    expect(findRemovedLegacyTriggerContextModesInDocument(remediated.value)).toHaveLength(0);
    expect(legacyConfig.nodes[0]?.config?.trigger?.contextMode).toBe('simulation_preferred');
  });

  it('remediates removed legacy trigger context modes in portable payloads', () => {
    const portablePayload = buildPortablePathPackage(
      buildLegacyTriggerConfig('path_portable_still_legacy'),
      {
        exporterVersion: 'test.legacy-trigger',
      }
    );
    const remediated = normalizeRemovedTriggerContextModesInDocument(portablePayload);

    expect(remediated.changed).toBe(true);
    expect(findRemovedLegacyTriggerContextModesInDocument(remediated.value)).toHaveLength(0);
  });
});
