import {
  findSimilarTemplateMatch,
  normalizeLearningText,
  upsertLearnedTemplate,
} from '@/features/prompt-exploder/template-learning';
import type { PromptExploderLearnedTemplate } from '@/features/prompt-exploder/types';

const buildTemplate = (
  id: string,
  overrides: Partial<PromptExploderLearnedTemplate> = {}
): PromptExploderLearnedTemplate => {
  const title = overrides.title ?? 'Default Template';
  return {
    id,
    segmentType: 'list',
    state: 'active',
    title,
    normalizedTitle: normalizeLearningText(title),
    anchorTokens: ['default', 'template'],
    sampleText: 'Default sample text',
    approvals: 1,
    createdAt: '2026-02-13T10:00:00.000Z',
    updatedAt: '2026-02-13T10:00:00.000Z',
    ...overrides,
  };
};

describe('prompt exploder template learning', () => {
  it('updates exact-match template in auto mode', () => {
    const existing = buildTemplate('template_exact', {
      title: 'NON-NEGOTIABLE GOAL',
      normalizedTitle: normalizeLearningText('NON-NEGOTIABLE GOAL'),
      anchorTokens: ['goal', 'integrity'],
      sampleText: 'Product integrity must remain unchanged.',
      approvals: 2,
      state: 'candidate',
    });

    const result = upsertLearnedTemplate({
      templates: [existing],
      segmentType: 'list',
      title: 'Non-Negotiable Goal',
      sourceText: 'NON-NEGOTIABLE GOAL Product integrity and pure white background',
      sampleText: 'Background must be pure white.',
      similarityThreshold: 0.63,
      minApprovalsForMatching: 3,
      autoActivateLearnedTemplates: true,
      now: '2026-02-13T11:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mergeOutcome).toBe('exact');
    expect(result.nextTemplate.id).toBe('template_exact');
    expect(result.nextTemplate.approvals).toBe(3);
    expect(result.nextTemplate.state).toBe('active');
    expect(result.nextTemplate.anchorTokens).toEqual(
      expect.arrayContaining(['goal', 'integrity', 'product', 'pure', 'white'])
    );
  });

  it('merges into a similar template in auto mode when exact match is absent', () => {
    const similar = buildTemplate('template_similar', {
      title: 'Core Catalog Goals',
      normalizedTitle: normalizeLearningText('Core Catalog Goals'),
      anchorTokens: ['product', 'integrity', 'background', 'white'],
      sampleText: 'Product integrity and white background requirements.',
      approvals: 4,
    });

    const weaker = buildTemplate('template_weaker', {
      title: 'Misc Notes',
      normalizedTitle: normalizeLearningText('Misc Notes'),
      anchorTokens: ['notes', 'metadata'],
      sampleText: 'Random notes and metadata',
      approvals: 8,
    });

    const result = upsertLearnedTemplate({
      templates: [similar, weaker],
      segmentType: 'list',
      title: 'NON-NEGOTIABLE GOAL (all must be true)',
      sourceText:
        'NON-NEGOTIABLE GOAL Product integrity must remain truthful and background pure white.',
      sampleText:
        'Product integrity must remain truthful and background must be pure white.',
      similarityThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
      now: '2026-02-13T11:10:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mergeOutcome).toBe('similar');
    expect(result.nextTemplate.id).toBe('template_similar');
    expect(result.similarTemplateMatch?.template.id).toBe('template_similar');
    expect(result.nextTemplate.approvals).toBe(5);
  });

  it('forces a new template when merge mode is new and resolves id collisions', () => {
    const existing = buildTemplate('template_collision', {
      title: 'Some Existing Rule',
    });

    const result = upsertLearnedTemplate({
      templates: [existing],
      segmentType: 'list',
      title: 'Some Existing Rule',
      sourceText: 'Some Existing Rule with new anchors',
      sampleText: 'New sample content',
      similarityThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
      mergeMode: 'new',
      now: '2026-02-13T11:20:00.000Z',
      createTemplateId: () => 'template_collision',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mergeOutcome).toBe('forced_new');
    expect(result.nextTemplate.id).toBe('template_collision_x');
    expect(result.nextTemplates).toHaveLength(2);
  });

  it('returns a clear error when selected target template is missing', () => {
    const result = upsertLearnedTemplate({
      templates: [],
      segmentType: 'list',
      title: 'Targeted rule',
      sourceText: 'Targeted rule source',
      sampleText: 'Targeted rule sample',
      similarityThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
      mergeMode: 'target',
      targetTemplateId: 'missing_template',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errorCode).toBe('TARGET_TEMPLATE_NOT_FOUND');
  });

  it('returns a clear error when selected target type mismatches', () => {
    const target = buildTemplate('template_target', {
      segmentType: 'metadata',
    });

    const result = upsertLearnedTemplate({
      templates: [target],
      segmentType: 'list',
      title: 'Targeted rule',
      sourceText: 'Targeted rule source',
      sampleText: 'Targeted rule sample',
      similarityThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
      mergeMode: 'target',
      targetTemplateId: 'template_target',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errorCode).toBe('TARGET_TEMPLATE_TYPE_MISMATCH');
  });

  it('finds the highest-scoring similar template candidate', () => {
    const templates = [
      buildTemplate('one', {
        title: 'Random Metadata Block',
        normalizedTitle: normalizeLearningText('Random Metadata Block'),
        anchorTokens: ['metadata', 'comment'],
        sampleText: 'metadata comments',
      }),
      buildTemplate('two', {
        title: 'FINAL QA CHECKLIST',
        normalizedTitle: normalizeLearningText('FINAL QA CHECKLIST'),
        anchorTokens: ['qa', 'pass', 'fail'],
        sampleText: 'QA1 PASS QA2 FAIL QA3 PASS',
      }),
    ];

    const match = findSimilarTemplateMatch({
      templates,
      segmentType: 'list',
      sourceText: 'Final QA checklist with pass/fail outcomes',
      similarityThreshold: 0.63,
    });

    expect(match?.template.id).toBe('two');
    expect((match?.score ?? 0) > 0.5).toBe(true);
  });
});
