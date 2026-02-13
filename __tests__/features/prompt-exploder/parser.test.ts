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
});
