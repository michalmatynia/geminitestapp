import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import {
  buildPatternSnapshot,
  ensurePromptExploderScopeOnRules,
  mergeRestoredPromptExploderRules,
  prependPatternSnapshot,
  removePatternSnapshotById,
} from '@/features/prompt-exploder/pattern-snapshots';
import type { PromptExploderPatternSnapshot } from '@/features/prompt-exploder/types';

const buildRule = (
  id: string,
  overrides: Partial<PromptValidationRule> = {}
): PromptValidationRule => ({
  kind: 'regex',
  id,
  enabled: true,
  severity: 'info',
  title: id,
  description: null,
  pattern: '\\btest\\b',
  flags: 'mi',
  message: id,
  similar: [],
  ...overrides,
} as PromptValidationRule);

describe('prompt exploder pattern snapshots', () => {
  it('builds snapshot with fallback name and serialized rules', () => {
    const snapshot = buildPatternSnapshot({
      rules: [buildRule('segment.a')],
      snapshotDraftName: '   ',
      now: '2026-02-13T13:00:00.000Z',
      snapshotId: 'snapshot_fixed',
    });

    expect(snapshot.id).toBe('snapshot_fixed');
    expect(snapshot.name).toBe('Prompt Exploder Snapshot 2026-02-13T13:00:00');
    expect(snapshot.ruleCount).toBe(1);
    expect(snapshot.rulesJson).toContain('"segment.a"');
  });

  it('prepends and trims snapshot list', () => {
    const existing: PromptExploderPatternSnapshot[] = [
      {
        id: 'one',
        name: 'One',
        createdAt: '2026-02-13T10:00:00.000Z',
        ruleCount: 1,
        rulesJson: '[]',
      },
      {
        id: 'two',
        name: 'Two',
        createdAt: '2026-02-13T09:00:00.000Z',
        ruleCount: 1,
        rulesJson: '[]',
      },
    ];
    const next = prependPatternSnapshot(
      existing,
      {
        id: 'new',
        name: 'New',
        createdAt: '2026-02-13T11:00:00.000Z',
        ruleCount: 2,
        rulesJson: '[]',
      },
      2
    );

    expect(next.map((snapshot) => snapshot.id)).toEqual(['new', 'one']);
  });

  it('removes snapshot by id', () => {
    const next = removePatternSnapshotById(
      [
        { id: 'a', name: 'A', createdAt: 'x', ruleCount: 0, rulesJson: '[]' },
        { id: 'b', name: 'B', createdAt: 'x', ruleCount: 0, rulesJson: '[]' },
      ],
      'a'
    );
    expect(next.map((snapshot) => snapshot.id)).toEqual(['b']);
  });

  it('normalizes restored rules to prompt_exploder scope and replaces managed rules', () => {
    const existingRules = [
      buildRule('global.one', { appliesToScopes: ['global'] }),
      buildRule('segment.managed.old', { appliesToScopes: ['prompt_exploder'] }),
    ];
    const restoredRules = [buildRule('segment.restored', { appliesToScopes: ['global'] })];

    const merged = mergeRestoredPromptExploderRules({
      existingRules,
      restoredRules,
      isPromptExploderManagedRule: (rule) => rule.id.startsWith('segment.'),
    });

    expect(merged.map((rule) => rule.id)).toEqual(['global.one', 'segment.restored']);
    const restored = merged.find((rule) => rule.id === 'segment.restored');
    expect(restored?.appliesToScopes).toEqual(['global', 'prompt_exploder']);
  });

  it('ensures prompt_exploder scope without dropping existing scopes', () => {
    const normalized = ensurePromptExploderScopeOnRules([
      buildRule('rule.one', { appliesToScopes: ['global', 'prompt_exploder'] }),
      buildRule('rule.two', { appliesToScopes: ['image_studio_prompt'] }),
    ]);
    expect(normalized[0]?.appliesToScopes).toEqual(['global', 'prompt_exploder']);
    expect(normalized[1]?.appliesToScopes).toEqual([
      'image_studio_prompt',
      'prompt_exploder',
    ]);
  });

  it('merges restored rules for case resolver scope without removing image stack rules', () => {
    const existingRules = [
      buildRule('segment.pipeline.image', { appliesToScopes: ['prompt_exploder'] }),
      buildRule('segment.pipeline.case', { appliesToScopes: ['case_resolver_prompt_exploder'] }),
    ];
    const restoredRules = [buildRule('segment.pipeline.case', { appliesToScopes: [] })];

    const merged = mergeRestoredPromptExploderRules({
      existingRules,
      restoredRules,
      scope: 'case_resolver_prompt_exploder',
      isPromptExploderManagedRule: (rule) => rule.id.startsWith('segment.'),
    });

    expect(merged.map((rule) => rule.id)).toEqual([
      'segment.pipeline.image',
      'segment.pipeline.case',
    ]);
    const restored = merged.find((rule) => rule.id === 'segment.pipeline.case');
    expect(restored?.appliesToScopes).toContain('case_resolver_prompt_exploder');
    expect(restored?.appliesToScopes).not.toContain('prompt_exploder');
  });
});
