import { describe, expect, it } from 'vitest';

import {
  explodePromptText,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '@/features/prompt-exploder/parser';
import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack';

const SAMPLE_PROMPT = `=== PREMIUM E-COMMERCE IMAGE EDITING PROMPT WITH STUDIO RELIGHTING ver. 0.8 ===

NON-NEGOTIABLE GOAL (all must be true)
1) Product integrity: the product must remain 100% truthful/unchanged.
2) Background: pure white #FFFFFF.

PARAMS
params = {
  "apply_studio_relighting": true,
  "relight": {
    "key_light_direction": "top_left"
  }
}

P0 — PRODUCT INTEGRITY (ABSOLUTE)
* Do NOT redraw/regenerate/replace/repaint any part of the product.

REQUIREMENTS
A) BG (PURE WHITE)
* Replace entire background with exact RGB(255,255,255).

B) SHADOW
* If add_new_ground_shadow=true: add ONE neutral gray soft shadow.

=== STUDIO RELIGHTING EXTENSION (COMPACT, PROGRAMMABLE) ===
RELIGHTING RULES (ONLY ACTIVE WHEN apply_studio_relighting=true):

RL4 (Shadow coherence): If new lighting direction is applied:
* new ground shadow direction/offset MUST match relight.key_light_direction.

PIPELINE
1. Mask product cleanly.
2. Set BG to pure white RGB(255,255,255).

FINAL QA (output PASS/FAIL; fix until all PASS)
QA1 Integrity: no structural/design/logo/text/material changes

FINAL QA — ADD THESE RELIGHTING CHECKS (only if apply_studio_relighting=true)
QA_R2 Relighting Coherence:
* PASS if ground shadow direction/offset matches the new key light direction.
* FAIL if shadow conflicts with highlights.
* Related rule: RL4 must pass.`;

const COMPLEX_MODULE_PROMPT = `Relic Shield | 4 cm | Metal | Pin | Warhammer 40k

[PURPOSE]
Composite product image onto environment and keep product truthful.

[GLOBAL_SETTINGS]
- [DRY_RUN] = true
- [MAX_RETRY] = 3

## [PARSING & EXECUTION RULES — IMPORTANT]
1. Non-interactive policy.
2. Safety-first & DRY_RUN.

[MODULES]
1. [BASELINKER_IMPORT_MODULE]
Goal: fetch zero-stock products.

2. [MARKETPLACE_MATCHING_MODULE]
Goal: locate active marketplace listings.

[EXECUTION_TEMPLATE]
1. Run import module.
2. Run matching module.
3. Run validation module.

[VALIDATION_MODULE]
FINAL QA (PASS/FAIL)
QA1 Integrity: PASS when product stays unchanged.
QA2 Scope: FAIL when marketplaces are out of scope.

[DRY_RUN_BEHAVIOR]
If [DRY_RUN] = true:
- perform discovery only
If [DRY_RUN] = false:
- perform destructive actions`;

const NUMBERED_SECTIONS_PROMPT = `Perform a professional post-production edit on the raw wallet product photo.

1. Preserve the Product Exactly
Goal: keep the wallet design and hue unchanged.
- No design changes.
- No AI regeneration of the product.

2. Clean Up Only Image Artifacts
Goal: remove dust and sensor spots only.
- Keep real stitches and texture.

3. Background Replacement with Pure White
Goal: set #FFFFFF background with one realistic shadow.
- No halos, no cutout artifacts.`;

const VALIDATION_AND_DRY_RUN_PROMPT = `Relic Shield | 4 cm | Metal | Pin | Warhammer 40k

[VALIDATION_MODULE]
Sanity checks:
- Confirm ZeroStockProducts is non-empty.
- Verify each planned end_listing has a performed status.
FINAL QA (PASS/FAIL)
QA1 Integrity: PASS

[DRY_RUN_BEHAVIOR]
If [DRY_RUN] = true:
- plan actions only
If [DRY_RUN] = false:
- apply actions`;

const OPS_HEADINGS_PROMPT = `# Automation Governance

[LOGGING_AND_AUDIT]
- Emit JSON run report.
- Track product-level errors.

[ERROR_HANDLING]
- Retry transient network failures.
- Stop on auth_error escalation.

[SECURITY_NOTES]
- Never log credentials or session tokens.`;

describe('prompt exploder parser', () => {
  it('detects typed segments and defaults metadata to omitted', () => {
    const document = explodePromptText({
      prompt: SAMPLE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(document.segments.length).toBeGreaterThan(6);

    const metadata = document.segments[0];
    expect(metadata?.type).toBe('metadata');
    expect(metadata?.includeInOutput).toBe(false);

    expect(document.segments.some((segment) => segment.type === 'parameter_block')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'sequence')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'referential_list')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'hierarchical_list')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'qa_matrix')).toBe(true);
    expect(
      document.segments
        .filter((segment) => segment.type === 'qa_matrix')
        .some((segment) => segment.subsections.some((subsection) => subsection.code === 'QA_R2'))
    ).toBe(true);
  });

  it('reassembles without metadata by default', () => {
    const document = explodePromptText({
      prompt: SAMPLE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const reassembled = reassemblePromptSegments(document.segments);
    expect(reassembled.includes('=== PREMIUM E-COMMERCE IMAGE EDITING PROMPT')).toBe(false);
    expect(reassembled.includes('PARAMS')).toBe(true);
    expect(reassembled.includes('FINAL QA')).toBe(true);
  });

  it('creates bindings for references and params usage', () => {
    const document = explodePromptText({
      prompt: SAMPLE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(document.bindings.length).toBeGreaterThan(0);
    expect(document.bindings.some((binding) => binding.type === 'references')).toBe(true);
    expect(document.bindings.some((binding) => binding.type === 'uses_param')).toBe(true);
    expect(
      document.bindings.some(
        (binding) =>
          binding.type === 'references' &&
          /RL4/i.test(binding.targetLabel) &&
          binding.origin === 'auto' &&
          Boolean(binding.toSubsectionId)
      )
    ).toBe(true);
  });

  it('merges manual bindings with auto bindings', () => {
    const document = explodePromptText({
      prompt: SAMPLE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });
    const first = document.segments[0];
    const second = document.segments[1];
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    const qaSegment = document.segments.find((segment) => segment.type === 'qa_matrix');
    const qaSubsection = qaSegment?.subsections.find((subsection) => subsection.code === 'QA_R2');
    const relightSegment = document.segments.find(
      (segment) =>
        segment.type === 'sequence' && /STUDIO RELIGHTING/i.test(segment.title)
    );
    const relightSubsection = relightSegment?.subsections.find(
      (subsection) => subsection.code === 'RL4'
    );
    expect(qaSegment).toBeTruthy();
    expect(qaSubsection).toBeTruthy();
    expect(relightSegment).toBeTruthy();
    expect(relightSubsection).toBeTruthy();

    const withManual = updatePromptExploderDocument(document, document.segments, [
      {
        id: 'manual_binding_1',
        type: 'depends_on',
        fromSegmentId: first!.id,
        toSegmentId: second!.id,
        sourceLabel: first!.title,
        targetLabel: second!.title,
        origin: 'manual',
      },
      {
        id: 'manual_binding_subsection',
        type: 'depends_on',
        fromSegmentId: qaSegment!.id,
        fromSubsectionId: qaSubsection!.id,
        toSegmentId: relightSegment!.id,
        toSubsectionId: relightSubsection!.id,
        sourceLabel: qaSubsection!.title,
        targetLabel: relightSubsection!.title,
        origin: 'manual',
      },
    ]);

    expect(withManual.bindings.some((binding) => binding.origin === 'manual')).toBe(true);
    expect(
      withManual.bindings.some(
        (binding) =>
          binding.origin === 'manual' &&
          binding.fromSegmentId === first!.id &&
          binding.toSegmentId === second!.id
      )
    ).toBe(true);
    expect(
      withManual.bindings.some(
        (binding) =>
          binding.origin === 'manual' &&
          binding.fromSegmentId === qaSegment!.id &&
          binding.fromSubsectionId === qaSubsection!.id &&
          binding.toSegmentId === relightSegment!.id &&
          binding.toSubsectionId === relightSubsection!.id
      )
    ).toBe(true);
  });

  it('learns similar-but-not-identical segments via approved templates', () => {
    const prompt = `DELIVERY ACCEPTANCE MATRIX
Accepted when product integrity, color and shadows are compliant.
Rejected when visual coherence does not hold.`;

    const document = explodePromptText({
      prompt,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
      learnedTemplates: [
        {
          id: 'template_qa_matrix_demo',
          segmentType: 'qa_matrix',
          title: 'FINAL QA ACCEPTANCE MATRIX',
          normalizedTitle: 'final qa acceptance matrix',
          anchorTokens: ['acceptance', 'accepted', 'rejected'],
          sampleText: 'Accepted when ... Rejected when ...',
          approvals: 2,
          createdAt: '2026-02-13T00:00:00.000Z',
          updatedAt: '2026-02-13T00:00:00.000Z',
        },
      ],
      similarityThreshold: 0.4,
    });

    expect(document.segments[0]?.type).toBe('qa_matrix');
    expect(
      document.segments[0]?.matchedPatternIds.some((patternId) =>
        patternId.includes('segment.learned.qa_matrix.template_qa_matrix_demo')
      )
    ).toBe(true);
  });

  it('detects bracket, markdown and module sections from complex prompts', () => {
    const document = explodePromptText({
      prompt: COMPLEX_MODULE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(document.segments.length).toBeGreaterThanOrEqual(6);
    expect(document.segments[0]?.type).toBe('metadata');
    expect(document.segments[0]?.includeInOutput).toBe(false);

    expect(document.segments.some((segment) => segment.type === 'parameter_block')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'sequence')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'hierarchical_list')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'qa_matrix')).toBe(true);
    expect(document.segments.some((segment) => segment.type === 'conditional_list')).toBe(true);

    const headings = document.segments.map((segment) => segment.title);
    expect(headings.some((title) => title.includes('GLOBAL_SETTINGS'))).toBe(true);
    expect(headings.some((title) => title.includes('EXECUTION_TEMPLATE'))).toBe(true);
    expect(headings.some((title) => title.includes('VALIDATION_MODULE'))).toBe(true);
  });

  it('splits numbered section prompts into multiple heading-driven segments', () => {
    const document = explodePromptText({
      prompt: NUMBERED_SECTIONS_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(document.segments.length).toBeGreaterThanOrEqual(4);
    expect(
      document.segments.some(
        (segment) =>
          segment.title.includes('Preserve the Product Exactly') &&
          (segment.type === 'sequence' || segment.type === 'list')
      )
    ).toBe(true);
    expect(
      document.segments.some((segment) => segment.title.includes('Background Replacement'))
    ).toBe(true);
  });

  it('classifies validation module and dry-run behavior blocks with locked types', () => {
    const document = explodePromptText({
      prompt: VALIDATION_AND_DRY_RUN_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const validationSegment = document.segments.find(
      (segment) => segment.title === 'VALIDATION_MODULE'
    );
    const dryRunSegment = document.segments.find(
      (segment) => segment.title === 'DRY_RUN_BEHAVIOR'
    );

    expect(validationSegment?.type).toBe('qa_matrix');
    expect(validationSegment?.subsections.some((subsection) => subsection.code === 'QA1')).toBe(
      true
    );
    expect(dryRunSegment?.type).toBe('conditional_list');
    expect(dryRunSegment?.condition).toBe('dry_run_branching');
  });

  it('treats logging/error/security governance headings as sequence segments', () => {
    const document = explodePromptText({
      prompt: OPS_HEADINGS_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const headingTitles = ['LOGGING_AND_AUDIT', 'ERROR_HANDLING', 'SECURITY_NOTES'];
    headingTitles.forEach((title) => {
      const segment = document.segments.find((candidate) => candidate.title === title);
      expect(segment?.type).toBe('sequence');
      expect(segment?.subsections.length).toBeGreaterThanOrEqual(1);
    });
  });
});
