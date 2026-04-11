import { describe, expect, it } from 'vitest';

import { AI_PATHS_UI_STATE_KEY, PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths/core/constants';
import { sanitizePathConfig } from '@/shared/lib/ai-paths/core/utils/path-config-sanitization';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import {
  resolveTriggerSelection,
  selectTriggerCandidates,
  type TriggerSelectionCandidate,
} from './trigger-event-selection';

const cfg = (id: string, isActive = true): TriggerSelectionCandidate => ({ id, isActive });
const makeConfig = (id: string, name: string, extra?: Record<string, unknown>) =>
  JSON.stringify(sanitizePathConfig({ ...createDefaultPathConfig(id), name, ...extra }));
const makeTriggeredConfig = (id: string, name: string, event = 'manual'): string => {
  const baseConfig = createDefaultPathConfig(id);
  const seedNode = baseConfig.nodes[0];
  if (!seedNode) {
    throw new Error('Expected default path config to include at least one canonical node.');
  }

  return JSON.stringify(
    sanitizePathConfig({
      ...baseConfig,
      name,
      nodes: [
        {
          ...seedNode,
          type: 'trigger',
          title: 'Trigger',
          description: '',
          inputs: [],
          outputs: ['trigger', 'triggerName'],
          config: {
            trigger: {
              event,
              contextMode: 'trigger_only',
            },
          },
        },
      ],
      edges: [],
    })
  );
};

describe('selectTriggerCandidates', () => {
  // ── preferred path found ──────────────────────────────────────────────────

  it('selects the preferred path when it is found in candidates', () => {
    const candidates = [cfg('path-a'), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-b',
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-b');
    expect(result.missingPreferredPathId).toBeNull();
  });

  it('selects the preferred path even when it is inactive', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-a',
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-a');
    expect(result.missingPreferredPathId).toBeNull();
  });

  // ── preferred path missing — strict failure ───────────────────────────────

  it('returns null when preferred path is missing even if a single active candidate exists', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-missing',
      activePathId: null,
    });
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBe('path-missing');
  });

  // ── preferred path missing — multiple active, ambiguous ───────────────────

  it('returns null when preferred path is missing and multiple active candidates exist', () => {
    const candidates = [cfg('path-a'), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-missing',
      activePathId: null,
    });
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBe('path-missing');
  });

  // ── no preferred path — activePathId resolution ───────────────────────────

  it('selects the path matching activePathId when no preferred path is set', () => {
    const candidates = [cfg('path-a'), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-c',
    });
    expect(result.selectedConfig?.id).toBe('path-c');
    expect(result.missingPreferredPathId).toBeNull();
  });

  it('returns null when multiple active candidates exist and none matches activePathId', () => {
    const candidates = [cfg('path-a'), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-x',
    });
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBeNull();
  });

  // ── no preferred path — single active or no active ────────────────────────

  it('returns the single active candidate when no preferred or matching active path exists', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-x',
    });
    expect(result.selectedConfig?.id).toBe('path-b');
  });

  it('returns the first candidate when no active candidates exist', () => {
    const candidates = [cfg('path-a', false), cfg('path-b', false)];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-a');
  });

  it('returns null for an empty candidates list', () => {
    const result = selectTriggerCandidates({
      triggerCandidates: [],
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.selectedConfig).toBeNull();
  });

  // ── activeTriggerCandidates surface ───────────────────────────────────────

  it('exposes only active candidates in activeTriggerCandidates', () => {
    const candidates = [cfg('path-a', false), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.activeTriggerCandidates.map((c) => c.id)).toEqual(['path-b', 'path-c']);
  });
});

describe('resolveTriggerSelection', () => {
  it('resolves a preferred path directly from selective settings without requiring an index', async () => {
    const configValue = makeTriggeredConfig('path-pref', 'Preferred Path');
    const settingsData = [
      {
        key: `${PATH_CONFIG_PREFIX}path-pref`,
        value: configValue,
      },
      {
        key: AI_PATHS_UI_STATE_KEY,
        value: JSON.stringify({ value: { activePathId: 'path-other' } }),
      },
    ];
    const triggerEventId =
      (
        JSON.parse(configValue) as {
          nodes?: Array<{ type?: string; config?: { trigger?: { event?: string } } }>;
        }
      ).nodes?.find((node) => node.type === 'trigger')?.config?.trigger?.event ?? 'manual';

    const result = await resolveTriggerSelection(settingsData, triggerEventId, {
      preferredPathId: 'path-pref',
    });

    expect(result.triggerCandidates.map((config) => config.id)).toEqual(['path-pref']);
    expect(result.activeTriggerCandidates.map((config) => config.id)).toEqual(['path-pref']);
    expect(result.selectedConfig?.id).toBe('path-pref');
    expect(result.missingPreferredPathId).toBeNull();
    expect(result.uiState).toEqual({ activePathId: 'path-other' });
  });

  it('treats a preferred path with no matching trigger as missing for this trigger binding', async () => {
    const settingsData = [
      {
        key: `${PATH_CONFIG_PREFIX}path-pref`,
        value: makeConfig('path-pref', 'Preferred Path'),
      },
    ];

    const result = await resolveTriggerSelection(settingsData, 'product_row_name_normalize', {
      preferredPathId: 'path-pref',
    });

    expect(result.triggerCandidates).toEqual([]);
    expect(result.activeTriggerCandidates).toEqual([]);
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBe('path-pref');
  });
});
