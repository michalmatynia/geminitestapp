import { describe, expect, it } from 'vitest';

import { defaultPromptEngineSettings } from '@/features/prompt-engine/settings';
import { explodePromptText } from '@/features/prompt-exploder/parser';
import { getPromptExploderScopedRules } from '@/features/prompt-exploder/pattern-pack';

describe('case resolver prompt exploder segmentation', () => {
  it('splits place/date, addresser, and addressee blocks from HTML input', () => {
    const prompt = [
      '<p style="text-align: right;">Szczecin 25.01.2026</p>',
      '<p></p>',
      '<p>Michał Matynia</p>',
      '<p>Fioletowa 71/2</p>',
      '<p>70-781 Szczecin</p>',
      '<p>Polska</p>',
      '<p style="text-align: right;">Inspektorat ZUS w Gryficach</p>',
      '<p style="text-align: right;">Dąbskiego 5</p>',
      '<p style="text-align: right;">72-300 Gryfice</p>',
      '<p></p>',
      '<p><strong>Wniosek o umorzenie zadłużenia</strong></p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const segmentBodies = document.segments.map((segment) => segment.raw || segment.text);
    const addresserIndex = segmentBodies.findIndex((value) =>
      value.includes('Michał Matynia')
    );
    const addresseeIndex = segmentBodies.findIndex((value) =>
      value.includes('Inspektorat ZUS w Gryficach')
    );
    const placeDateIndex = segmentBodies.findIndex((value) =>
      value.includes('Szczecin 25.01.2026')
    );

    expect(placeDateIndex).toBeGreaterThanOrEqual(0);
    expect(addresserIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThan(addresserIndex);

    const addresserSegment = document.segments[addresserIndex];
    const addresseeSegment = document.segments[addresseeIndex];
    const placeDateSegment = document.segments[placeDateIndex];
    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('72-300 Gryfice');
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Addressee Organization'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Place + Date'
    );
    expect(addresseeSegment?.matchedSequenceLabels).toContain('Case Resolver Structure');
  });
});
