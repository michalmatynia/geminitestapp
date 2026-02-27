import { describe, expect, it } from 'vitest';

import type {
  PromptExploderRuleSegmentType,
  PromptValidationRule,
} from '@/shared/lib/prompt-engine/settings';
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
* If add_new_ground_shadow=true AND preserve_original_shadows=false: add ONE neutral gray soft shadow.

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

const PREMIUM_REGRESSION_PROMPT = `=== PREMIUM E-COMMERCE IMAGE EDITING PROMPT WITH STUDIO RELIGHTING ver. 0.8 ===

ROLE
Use the image Edit Tool (NOT Python). Edit the provided RAW product photo into a premium, catalog-ready, photorealistic e-commerce image.

PARAMS
params = {
  "apply_studio_relighting": true,
  "preserve_original_shadows": false,
  "add_new_ground_shadow": true,
  "background_rgb": [255,255,255],
  "relight": {
    "add_rim_light": true
  }
}

P0 — PRODUCT INTEGRITY (ABSOLUTE)
* Color: NO hue shift. Allowed: exposure/contrast/neutral WB + subtle saturation if true-to-life.
  Rule: if unsure whether a mark is real vs artifact => KEEP (unless remove_uncertain_marks=true).

REQUIREMENTS

A) BG (PURE WHITE)
* Replace entire background with exact RGB(255,255,255).

B) SHADOW (ONE ONLY, COMPACT UNDER-BASE)
* If add_new_ground_shadow=true: add ONE neutral gray soft shadow under product base.
* If preserve_original_shadows=false: remove/neutralize original BG shadows so only new shadow remains.

C) COMPOSITION
* Fill ~80–90% of frame (target_product_fill_ratio). Center if enabled; if allow_intentional_offcenter=true, keep intentional premium off-center.

E) DETAILS
* Remove only obvious photo/handling artifacts (dust/lint/sensor spots/smudges clearly not part of product) if enabled; avoid logos/text/patterns/stitching/texture.

=== STUDIO RELIGHTING EXTENSION (COMPACT, PROGRAMMABLE) ===
RELIGHTING RULES (ONLY ACTIVE WHEN apply_studio_relighting=true):

RL0 (Mandatory): Produce a new studio lighting look that is clearly different from the original capture lighting.
* This must look like a different studio setup.

RL1 (Dramatic but real): Increase dimensionality using directional key + controlled fill.
* More highlight-to-shadow separation without crushing blacks or blowing highlights.

RL2 (Color/material integrity): Relighting must NOT change:
* perceived hue
* logos/text/labels

RL3 (Specular control): If the product is reflective:
* reduce harsh clipping hotspots

RL4 (Shadow coherence): If new lighting direction is applied:
* new ground shadow direction/offset MUST match relight.key_light_direction (and be grounded)
* remove/neutralize original background shadows if preserve_original_shadows=false

RL5 (Rim light use): If relight.add_rim_light=true:
* subtle edge separation only

PIPELINE
1. Mask product cleanly.
2. Set BG to pure white RGB(255,255,255) outside product+shadow.
3. Artifact cleanup ONLY when clearly non-product.
4. Step 4 — Tone/WB & (Conditional) Relighting
   * Always: neutralize unwanted color cast; retain highlight/shadow detail; NO hue shift.
   * If apply_studio_relighting=false:
     * Preserve original lighting intent.

FINAL QA (output PASS/FAIL; fix until all PASS)
QA1 Integrity: no structural/design/logo/text/material changes

FINAL QA — ADD THESE RELIGHTING CHECKS (only if apply_studio_relighting=true)
QA_R1 Relighting Applied:
* PASS if lighting direction/contrast/highlight placement is noticeably different vs original AND remains photorealistic.
* FAIL if it looks like only global exposure/contrast was changed.

QA_R2 Relighting Coherence:
* PASS if ground shadow direction/offset matches the new key light direction and looks grounded, while remaining compact under the base.
* FAIL if shadow conflicts with highlights, becomes a long cast trail, or if rim looks like a halo.

QA_R3 Material/Hue Preservation:
* PASS if finish class (matte/gloss), texture realism, and hue remain consistent with original product.
* FAIL if "CG/plastic" look, invented texture, or hue shift appears.
END`;

const CUSTOM_BOUNDARY_PROMPT = `WORKSTEPS
1. Parse prompt.
2. Apply parameters.
3. Run quality checks.

FINAL CHECKS
QA1 Integrity: no structure changes
QA2 Hue: no hue shift`;

const CUSTOM_SUBSECTION_PROMPT = `REQUIREMENTS
RULE RL0 :: Mandatory :: Produce a new studio lighting look.
* Must be visibly different from original capture.

RULE RL3 :: Specular control :: If the product is reflective:
* Reduce clipping hotspots.
* Keep reflections plausible.`;

const createRegexRule = (args: {
  id: string;
  pattern: string;
  title?: string;
  message?: string;
  segmentType?: PromptExploderRuleSegmentType;
}): PromptValidationRule => ({
  kind: 'regex',
  id: args.id,
  enabled: true,
  severity: 'info',
  title: args.title ?? args.id,
  description: null,
  pattern: args.pattern,
  flags: 'mi',
  message: args.message ?? args.id,
  similar: [],
  autofix: {
    enabled: false,
    operations: [],
  },
  sequenceGroupId: 'test',
  sequenceGroupLabel: 'test',
  sequenceGroupDebounceMs: 0,
  sequence: 1,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: ['prompt_exploder'],
  launchEnabled: false,
  launchAppliesToScopes: ['prompt_exploder'],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: args.segmentType ?? null,
  promptExploderConfidenceBoost: 0.1,
  promptExploderPriority: 20,
  promptExploderTreatAsHeading: true,
});

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

    expect(document.segments.some( (segment: any) => segment.type === 'parameter_block')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'sequence')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'referential_list')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'hierarchical_list')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'qa_matrix')).toBe(true);
    expect(
      document.segments
        .filter( (segment: any) => segment.type === 'qa_matrix')
        .some( (segment: any) => segment.subsections.some( (subsection: any) => subsection.code === 'QA_R2'))
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
    expect(document.bindings.some( (binding: any) => binding.type === 'references')).toBe(true);
    expect(document.bindings.some( (binding: any) => binding.type === 'uses_param')).toBe(true);
    expect(
      document.bindings.some(
        (binding: any) =>
          binding.type === 'references' &&
          /RL4/i.test(binding.targetLabel) &&
          binding.origin === 'auto' &&
          Boolean(binding.toSubsectionId)
      )
    ).toBe(true);
  });

  it('extracts logical operators and referenced params from list statements', () => {
    const document = explodePromptText({
      prompt: SAMPLE_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const allItems = document.segments.flatMap( (segment: any) => [
      ...segment.listItems,
      ...segment.subsections.flatMap( (subsection: any) => subsection.items),
    ]);
    const conditionalItem = allItems.find(
      (item: any) =>
        item.logicalOperator === 'if' &&
        item.referencedParamPath === 'add_new_ground_shadow'
    );

    expect(conditionalItem).toBeTruthy();
    expect(conditionalItem?.referencedComparator).toBe('equals');
    expect(conditionalItem?.referencedValue).toBe(true);
    expect(conditionalItem?.logicalConditions).toHaveLength(2);
    expect(conditionalItem?.logicalConditions?.[0]?.paramPath).toBe('add_new_ground_shadow');
    expect(conditionalItem?.logicalConditions?.[0]?.comparator).toBe('equals');
    expect(conditionalItem?.logicalConditions?.[0]?.value).toBe(true);
    expect(conditionalItem?.logicalConditions?.[1]?.joinWithPrevious).toBe('and');
    expect(conditionalItem?.logicalConditions?.[1]?.paramPath).toBe('preserve_original_shadows');
    expect(conditionalItem?.logicalConditions?.[1]?.comparator).toBe('equals');
    expect(conditionalItem?.logicalConditions?.[1]?.value).toBe(false);
    expect(conditionalItem?.text.toLowerCase()).toContain('add one neutral gray soft shadow');
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
    const qaSegment = document.segments.find( (segment: any) => segment.type === 'qa_matrix');
    const qaSubsection = qaSegment?.subsections.find( (subsection: any) => subsection.code === 'QA_R2');
    const relightSegment = document.segments.find(
      (segment: any) =>
        segment.type === 'sequence' && /STUDIO RELIGHTING/i.test(segment.title)
    );
    const relightSubsection = relightSegment?.subsections.find(
      (subsection: any) => subsection.code === 'RL4'
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
        sourceLabel: first!.title ?? undefined,
        targetLabel: second!.title ?? undefined,
        origin: 'manual',
      },
      {
        id: 'manual_binding_subsection',
        type: 'depends_on',
        fromSegmentId: qaSegment!.id,
        fromSubsectionId: qaSubsection!.id as any,
        toSegmentId: relightSegment!.id,
        toSubsectionId: relightSubsection!.id as any,
        sourceLabel: qaSubsection!.title,
        targetLabel: relightSubsection!.title,
        origin: 'manual',
      },
    ]);

    expect(withManual.bindings.some( (binding: any) => binding.origin === 'manual')).toBe(true);
    expect(
      withManual.bindings.some(
        (binding: any) =>
          binding.origin === 'manual' &&
          binding.fromSegmentId === first!.id &&
          binding.toSegmentId === second!.id
      )
    ).toBe(true);
    expect(
      withManual.bindings.some(
        (binding: any) =>
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
          state: 'active',
          createdAt: '2026-02-13T00:00:00.000Z',
          updatedAt: '2026-02-13T00:00:00.000Z',
        },
      ],
      similarityThreshold: 0.4,
    });

    expect(document.segments[0]?.type).toBe('qa_matrix');
    expect(
      document.segments[0]?.matchedPatternIds.some( (patternId: any) =>
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

    expect(document.segments.some( (segment: any) => segment.type === 'parameter_block')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'sequence')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'hierarchical_list')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'qa_matrix')).toBe(true);
    expect(document.segments.some( (segment: any) => segment.type === 'conditional_list')).toBe(true);

    const headings = document.segments.map( (segment: any) => segment.title);
    expect(headings.some( (title: any) => title.includes('GLOBAL_SETTINGS'))).toBe(true);
    expect(headings.some( (title: any) => title.includes('EXECUTION_TEMPLATE'))).toBe(true);
    expect(headings.some( (title: any) => title.includes('VALIDATION_MODULE'))).toBe(true);
  });

  it('splits numbered section prompts into multiple heading-driven segments', () => {
    const document = explodePromptText({
      prompt: NUMBERED_SECTIONS_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(document.segments.length).toBeGreaterThanOrEqual(4);
    expect(
      document.segments.some(
        (segment: any) =>
          segment.title.includes('Preserve the Product Exactly') &&
          (segment.type === 'sequence' || segment.type === 'list')
      )
    ).toBe(true);
    expect(
      document.segments.some( (segment: any) => segment.title.includes('Background Replacement'))
    ).toBe(true);
  });

  it('classifies validation module and dry-run behavior blocks with locked types', () => {
    const document = explodePromptText({
      prompt: VALIDATION_AND_DRY_RUN_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const validationSegment = document.segments.find(
      (segment: any) => segment.title === 'VALIDATION_MODULE'
    );
    const dryRunSegment = document.segments.find(
      (segment: any) => segment.title === 'DRY_RUN_BEHAVIOR'
    );

    expect(validationSegment?.type).toBe('qa_matrix');
    expect(validationSegment?.subsections.some( (subsection: any) => subsection.code === 'QA1')).toBe(
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
    headingTitles.forEach( (title: any) => {
      const segment = document.segments.find( (candidate: any) => candidate.title === title);
      expect(segment?.type).toBe('sequence');
      expect(segment?.subsections.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('fixes premium prompt regressions for structure and reassembly', () => {
    const document = explodePromptText({
      prompt: PREMIUM_REGRESSION_PROMPT,
      validationRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    const reassembled = reassemblePromptSegments(document.segments);
    expect(reassembled.includes('ROLE\nROLE')).toBe(false);
    expect(reassembled.includes('PARAMS\nPARAMS')).toBe(false);
    expect(reassembled).toContain(
      'Rule: if unsure whether a mark is real vs artifact => KEEP (unless remove_uncertain_marks=true).'
    );
    expect(reassembled).toContain('4. Step 4 — Tone/WB & (Conditional) Relighting');
    expect(
      (reassembled.match(
        /If add_new_ground_shadow=true: add ONE neutral gray soft shadow under product base\./g
      ) ?? []).length
    ).toBe(1);

    const requirements = document.segments.find( (segment: any) => segment.title === 'REQUIREMENTS');
    expect(requirements?.type).toBe('sequence');
    expect(requirements?.subsections.length).toBeGreaterThanOrEqual(4);
    expect(requirements?.subsections.every( (subsection: any) => subsection.condition === null)).toBe(
      true
    );
    const composition = requirements?.subsections.find( (subsection: any) =>
      subsection.title.toUpperCase().includes('COMPOSITION')
    );
    expect(composition?.items).toHaveLength(1);
    expect(composition!.items![0]?.text).toContain(
      'allow_intentional_offcenter=true, keep intentional premium off-center.'
    );
    const details = requirements?.subsections.find( (subsection: any) =>
      subsection.title.toUpperCase().includes('DETAILS')
    );
    expect(details?.items).toHaveLength(1);
    expect(details!.items![0]?.text).toContain(
      'if enabled; avoid logos/text/patterns/stitching/texture.'
    );

    const relighting = document.segments.find(
      (segment: any) =>
        segment.type === 'sequence' &&
        /STUDIO RELIGHTING EXTENSION/i.test(segment.title)
    );
    expect(relighting?.condition).toBe(
      'RELIGHTING RULES (ONLY ACTIVE WHEN apply_studio_relighting=true):'
    );

    const rl0 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL0');
    const rl1 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL1');
    const rl2 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL2');
    const rl3 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL3');
    const rl4 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL4');
    const rl5 = relighting?.subsections.find( (subsection: any) => subsection.code === 'RL5');
    expect(rl0?.title).toBe('Mandatory');
    expect(rl0?.guidance).toBe(
      'Produce a new studio lighting look that is clearly different from the original capture lighting.'
    );
    expect(rl1?.title).toBe('Dramatic but real');
    expect(rl1?.guidance).toBe('Increase dimensionality using directional key + controlled fill.');
    expect(rl2?.title).toBe('Color/material integrity');
    expect(rl2?.guidance).toBe('Relighting must NOT change:');
    expect(rl3?.title).toBe('Specular control');
    expect(rl3?.condition).toBe('If the product is reflective:');
    expect(rl4?.title).toBe('Shadow coherence');
    expect(rl4?.condition).toBe('If new lighting direction is applied:');
    expect(rl5?.title).toBe('Rim light use');
    expect(rl5?.condition).toBe('If relight.add_rim_light=true:');

    const pipeline = document.segments.find( (segment: any) => segment.title === 'PIPELINE');
    expect(pipeline?.type).toBe('hierarchical_list');
    expect(pipeline?.listItems.some( (item: any) => /Step 4/i.test(item.text))).toBe(true);

    const qa = document.segments.find( (segment: any) => segment.type === 'qa_matrix');
    const qaR1 = qa?.subsections.find( (subsection: any) => subsection.code === 'QA_R1');
    const qaR2 = qa?.subsections.find( (subsection: any) => subsection.code === 'QA_R2');
    const qaR3 = qa?.subsections.find( (subsection: any) => subsection.code === 'QA_R3');
    expect(qaR1?.items).toHaveLength(2);
    expect(qaR2?.items).toHaveLength(2);
    expect(qaR3?.items).toHaveLength(2);
  });

  it('keeps indented list continuation lines under P0 even with aggressive heading rules', () => {
    const document = explodePromptText({
      prompt: PREMIUM_REGRESSION_PROMPT,
      validationRules: [
        ...PROMPT_EXPLODER_PATTERN_PACK,
        createRegexRule({
          id: 'segment.heading.overeager_colon_line',
          pattern: '^\\s*[A-Za-z][^\\n]*:\\s+.+$',
          title: 'Overeager Colon Heading',
          message: 'Treat any colon line as heading',
          segmentType: 'assigned_text',
        }),
      ],
    });

    const p0 = document.segments.find( (segment: any) => segment.code === 'P0');
    expect(p0?.type).toBe('referential_list');
    expect(p0?.listItems).toHaveLength(1);
    expect(p0?.listItems[0]?.text).toContain(
      'Rule: if unsure whether a mark is real vs artifact => KEEP (unless remove_uncertain_marks=true).'
    );

    const reassembled = reassemblePromptSegments(document.segments);
    expect(reassembled).toContain(
      'Rule: if unsure whether a mark is real vs artifact => KEEP (unless remove_uncertain_marks=true).'
    );
  });

  it('allows boundary headings to be tuned via validation rules', () => {
    const document = explodePromptText({
      prompt: CUSTOM_BOUNDARY_PROMPT,
      validationRules: [
        ...PROMPT_EXPLODER_PATTERN_PACK,
        createRegexRule({
          id: 'segment.boundary.pipeline',
          pattern: '^\\s*WORKSTEPS\\b',
          title: 'Boundary Pipeline Override',
          message: 'Pipeline boundary override',
          segmentType: 'hierarchical_list',
        }),
        createRegexRule({
          id: 'segment.boundary.final_qa',
          pattern: '^\\s*FINAL\\s+CHECKS\\b',
          title: 'Boundary Final QA Override',
          message: 'Final QA boundary override',
          segmentType: 'qa_matrix',
        }),
      ],
    });

    const pipeline = document.segments.find( (segment: any) => segment.title === 'WORKSTEPS');
    const qa = document.segments.find( (segment: any) => segment.title === 'FINAL CHECKS');

    expect(pipeline?.type).toBe('hierarchical_list');
    expect(pipeline?.listItems.map( (item: any) => item.text)).toEqual([
      'Parse prompt.',
      'Apply parameters.',
      'Run quality checks.',
    ]);

    expect(qa?.type).toBe('qa_matrix');
    expect(qa?.subsections.map( (subsection: any) => subsection.code)).toEqual(['QA1', 'QA2']);
  });

  it('allows subsection grammar to be tuned via validation rules', () => {
    const document = explodePromptText({
      prompt: CUSTOM_SUBSECTION_PROMPT,
      validationRules: [
        ...PROMPT_EXPLODER_PATTERN_PACK,
        createRegexRule({
          id: 'segment.subsection.reference_named',
          pattern: '^\\s*RULE\\s+(RL\\d+)\\s*::\\s*([^:]+)\\s*::\\s*(.+)$',
          title: 'Custom RL Subsection Grammar',
          message: 'Custom RL grammar',
          segmentType: 'sequence',
        }),
      ],
    });

    const requirements = document.segments.find( (segment: any) => segment.title === 'REQUIREMENTS');
    expect(requirements?.type).toBe('sequence');
    expect(requirements?.subsections).toHaveLength(2);

    const rl0 = requirements?.subsections[0];
    const rl3 = requirements?.subsections[1];
    expect(rl0?.code).toBe('RL0');
    expect(rl0?.title).toBe('Mandatory');
    expect(rl0?.guidance).toBe('Produce a new studio lighting look.');
    expect(rl3?.code).toBe('RL3');
    expect(rl3?.title).toBe('Specular control');
    expect(rl3?.condition).toBe('If the product is reflective:');
  });

  it('applies Case Resolver scoped rules only when case_resolver scope is selected', () => {
    const caseResolverRule: PromptValidationRule = {
      ...createRegexRule({
        id: 'segment.boundary.pipeline',
        pattern: '^\\s*WORKSTEPS\\b',
        title: 'Case Resolver Pipeline Override',
        message: 'Case Resolver pipeline override',
        segmentType: 'hierarchical_list',
      }),
      appliesToScopes: ['case_resolver_prompt_exploder'],
      launchAppliesToScopes: ['case_resolver_prompt_exploder'],
    };

    const withoutCaseScope = explodePromptText({
      prompt: CUSTOM_BOUNDARY_PROMPT,
      validationRules: [caseResolverRule],
      validationScope: 'prompt_exploder',
    });
    const withoutCaseScopeSegment = withoutCaseScope.segments.find(
      (segment: any) => segment.title === 'WORKSTEPS'
    );
    expect(withoutCaseScopeSegment?.type).not.toBe('hierarchical_list');

    const withCaseScope = explodePromptText({
      prompt: CUSTOM_BOUNDARY_PROMPT,
      validationRules: [caseResolverRule],
      validationScope: 'case_resolver_prompt_exploder',
    });
    const withCaseScopeSegment = withCaseScope.segments.find(
      (segment: any) => segment.title === 'WORKSTEPS'
    );
    expect(withCaseScopeSegment?.type).toBe('hierarchical_list');
  });

  it('normalizes WYSIWYG HTML and segments Case Resolver input using scoped heading rules', () => {
    const htmlPrompt = '<p>Szczecin 25.01.2026</p><p></p><p><strong>Wniosek o umorzenie zadłużenia</strong></p><p><strong>Dotyczy: postępowanie administracyjne</strong></p><p>Niniejszym wnoszę o umorzenie powstałego zadłużenia.</p><p><strong>Uzasadnienie</strong></p><p>Przez kilka lat nie nastąpiło skuteczne doręczenie informacji.</p><p>Z poważaniem,</p>';
    const toCaseScopedRule = (rule: PromptValidationRule): PromptValidationRule => ({
      ...rule,
      appliesToScopes: ['case_resolver_prompt_exploder'],
      launchAppliesToScopes: ['case_resolver_prompt_exploder'],
    });
    const caseRules: PromptValidationRule[] = [
      toCaseScopedRule(
        createRegexRule({
          id: 'segment.case.heading.date',
          pattern: '^\\s*Szczecin\\s+\\d{2}\\.\\d{2}\\.\\d{4}\\s*$',
          title: 'Case Date Heading',
          message: 'Case date heading',
          segmentType: 'metadata',
        })
      ),
      toCaseScopedRule(
        createRegexRule({
          id: 'segment.case.heading.main',
          pattern: '^\\s*Wniosek\\b',
          title: 'Case Main Heading',
          message: 'Case main heading',
          segmentType: 'sequence',
        })
      ),
      toCaseScopedRule(
        createRegexRule({
          id: 'segment.case.heading.subject',
          pattern: '^\\s*Dotyczy:',
          title: 'Case Subject Heading',
          message: 'Case subject heading',
          segmentType: 'assigned_text',
        })
      ),
      toCaseScopedRule(
        createRegexRule({
          id: 'segment.case.heading.reasoning',
          pattern: '^\\s*Uzasadnienie\\s*$',
          title: 'Case Reasoning Heading',
          message: 'Case reasoning heading',
          segmentType: 'sequence',
        })
      ),
    ];

    const document = explodePromptText({
      prompt: htmlPrompt,
      validationRules: caseRules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    expect(document.sourcePrompt).toContain('Szczecin 25.01.2026');
    expect(document.sourcePrompt).toContain('Wniosek o umorzenie zadłużenia');
    expect(document.sourcePrompt).not.toContain('<p>');
    expect(document.segments.map( (segment: any) => segment.title)).toEqual(
      expect.arrayContaining([
        'Szczecin 25.01.2026',
        'Wniosek o umorzenie zadłużenia',
        'Dotyczy: postępowanie administracyjne',
        'Uzasadnienie',
      ])
    );
  });
});
