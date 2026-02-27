import type { PromptValidationRule } from '@/shared/lib/prompt-engine/settings';
import {
  buildRuntimeRulesForReexplode,
  buildRuntimeTemplatesForReexplode,
  filterTemplatesForRuntime,
  resolveSegmentIdAfterReexplode,
} from '@/features/prompt-exploder/runtime-refresh';
import type {
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';

const buildRegexRule = (id: string, pattern: string): PromptValidationRule => ({
  kind: 'regex',
  id,
  enabled: true,
  severity: 'info',
  title: id,
  description: null,
  pattern,
  flags: 'mi',
  message: id,
  similar: [],
});

const buildTemplate = (
  id: string,
  overrides: Partial<PromptExploderLearnedTemplate> = {}
): PromptExploderLearnedTemplate => ({
  id,
  segmentType: 'list',
  state: 'active',
  title: id,
  normalizedTitle: id,
  anchorTokens: ['token'],
  sampleText: 'sample',
  approvals: 1,
  createdAt: '2026-02-13T00:00:00.000Z',
  updatedAt: '2026-02-13T00:00:00.000Z',
  ...overrides,
});

const buildSegment = (
  id: string,
  title: string,
  type: PromptExploderSegment['type'] = 'assigned_text'
): PromptExploderSegment => ({
  id,
  type,
  title,
  includeInOutput: true,
  text: title,
  raw: title,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections: [],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 0.5,
  validationResults: [],
  segments: [],
});

const buildDocument = (segments: PromptExploderSegment[]): PromptExploderDocument => ({
  version: 1,
  sourcePrompt: 'Prompt',
  segments,
  bindings: [],
  warnings: [],
  reassembledPrompt: segments.map((segment) => segment.text).join('\n'),
  subsections: [],
  variables: [],
  dependencies: [],
  rules: [],
  tags: [],
  errors: [],
  diagnostics: [],
  sections: [],
});

describe('prompt exploder runtime refresh', () => {
  it('filters runtime templates by state, approval threshold, ordering, and cap', () => {
    const templates = [
      buildTemplate('one', { approvals: 5, updatedAt: '2026-02-13T10:00:00.000Z' }),
      buildTemplate('two', { approvals: 2, updatedAt: '2026-02-13T11:00:00.000Z' }),
      buildTemplate('three', { approvals: 7, state: 'candidate' }),
      buildTemplate('four', { approvals: 5, updatedAt: '2026-02-13T12:00:00.000Z' }),
    ];

    const runtime = filterTemplatesForRuntime(templates, {
      minApprovalsForMatching: 3,
      maxTemplates: 2,
    });

    expect(runtime.map((template) => template.id)).toEqual(['four', 'one']);
  });

  it('builds runtime rules with profile-aware inclusion of applied rules', () => {
    const baseRules = [
      buildRegexRule('base.a', '\\ba\\b'),
      buildRegexRule('base.b', '\\bb\\b'),
    ];
    const applied = [buildRegexRule('base.b', '\\bnew-b\\b')];

    const patternPackOnly = buildRuntimeRulesForReexplode({
      runtimeValidationRules: baseRules,
      runtimeRuleProfile: 'pattern_pack',
      appliedRules: applied,
    });
    const allRules = buildRuntimeRulesForReexplode({
      runtimeValidationRules: baseRules,
      runtimeRuleProfile: 'all',
      appliedRules: applied,
    });

    expect(patternPackOnly.map((rule) => rule.id)).toEqual(['base.a']);
    expect(allRules.map((rule) => rule.id)).toEqual(['base.a', 'base.b']);
    const reapplied = allRules.find((rule) => rule.id === 'base.b');
    expect(reapplied?.kind).toBe('regex');
    if (reapplied?.kind !== 'regex') return;
    expect(reapplied.pattern).toBe('\\bnew-b\\b');
  });

  it('builds runtime templates using updated templates only when requested', () => {
    const runtimeTemplates = [buildTemplate('runtime')];
    const nextTemplates = [
      buildTemplate('next.a', { approvals: 5 }),
      buildTemplate('next.b', { approvals: 1 }),
    ];

    const unchanged = buildRuntimeTemplatesForReexplode({
      useUpdatedTemplates: false,
      runtimeLearnedTemplates: runtimeTemplates,
      nextTemplates,
      learningEnabled: true,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
    });
    const updated = buildRuntimeTemplatesForReexplode({
      useUpdatedTemplates: true,
      runtimeLearnedTemplates: runtimeTemplates,
      nextTemplates,
      learningEnabled: true,
      minApprovalsForMatching: 3,
      maxTemplates: 1000,
    });
    const disabled = buildRuntimeTemplatesForReexplode({
      useUpdatedTemplates: true,
      runtimeLearnedTemplates: runtimeTemplates,
      nextTemplates,
      learningEnabled: false,
      minApprovalsForMatching: 1,
      maxTemplates: 1000,
    });

    expect(unchanged.map((template) => template.id)).toEqual(['runtime']);
    expect(updated.map((template) => template.id)).toEqual(['next.a']);
    expect(disabled).toEqual([]);
  });

  it('resolves selected segment id by title-match or previous-id preservation', () => {
    const document = buildDocument([
      buildSegment('seg_1', 'ROLE'),
      buildSegment('seg_2', 'FINAL QA CHECKS'),
    ]);

    const byTitle = resolveSegmentIdAfterReexplode({
      document,
      strategy: { kind: 'match_title', title: 'final qa checks' },
    });
    const byPreviousMatch = resolveSegmentIdAfterReexplode({
      document,
      strategy: { kind: 'preserve_id', previousId: 'seg_2' },
    });
    const byPreviousMissing = resolveSegmentIdAfterReexplode({
      document,
      strategy: { kind: 'preserve_id', previousId: 'missing' },
    });

    expect(byTitle).toBe('seg_2');
    expect(byPreviousMatch).toBe('seg_2');
    expect(byPreviousMissing).toBe('seg_1');
  });
});
