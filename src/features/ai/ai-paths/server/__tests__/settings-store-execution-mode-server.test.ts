import { describe, expect, it } from 'vitest';

import {
  needsServerExecutionModeConfigUpgrade,
  upgradeServerExecutionModeConfig,
} from '@/features/ai/ai-paths/server/settings-store-execution-mode-server';

describe('server execution mode migration', () => {
  it('marks non-server execution modes for upgrade', () => {
    const raw = JSON.stringify({
      id: 'path_1',
      executionMode: 'local',
      nodes: [],
      edges: [],
    });
    expect(needsServerExecutionModeConfigUpgrade(raw)).toBe(true);
  });

  it('marks missing execution mode for upgrade', () => {
    const raw = JSON.stringify({
      id: 'path_1',
      nodes: [],
      edges: [],
    });
    expect(needsServerExecutionModeConfigUpgrade(raw)).toBe(true);
  });

  it('does not mark server execution mode for upgrade', () => {
    const raw = JSON.stringify({
      id: 'path_1',
      executionMode: 'server',
      nodes: [],
      edges: [],
    });
    expect(needsServerExecutionModeConfigUpgrade(raw)).toBe(false);
  });

  it('upgrades config to server mode and updates timestamp', () => {
    const raw = JSON.stringify({
      id: 'path_1',
      executionMode: 'local',
      updatedAt: '2026-02-10T00:00:00.000Z',
      nodes: [],
      edges: [],
    });
    const upgradedRaw = upgradeServerExecutionModeConfig(raw, {
      updatedAt: '2026-02-21T00:00:00.000Z',
    });
    if (!upgradedRaw) {
      throw new Error('Expected upgraded config.');
    }
    const parsed = JSON.parse(upgradedRaw) as Record<string, unknown>;
    expect(parsed['executionMode']).toBe('server');
    expect(parsed['updatedAt']).toBe('2026-02-21T00:00:00.000Z');
  });

  it('returns null for invalid JSON payload', () => {
    expect(upgradeServerExecutionModeConfig('{')).toBeNull();
    expect(needsServerExecutionModeConfigUpgrade('{')).toBe(false);
  });
});

