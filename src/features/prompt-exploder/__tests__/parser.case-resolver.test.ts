import { describe, expect, it } from 'vitest';

import { defaultPromptEngineSettings } from '@/features/prompt-engine/settings';
import { explodePromptText } from '@/features/prompt-exploder/parser';
import { getPromptExploderScopedRules } from '@/features/prompt-exploder/pattern-pack';

describe('case resolver prompt exploder segmentation', () => {
  it('splits place/date, addresser, and addressee blocks from HTML input', () => {
    const prompt = [
      '<p style="text-align: right;">Szczecin, 25.01.2026 r.</p>',
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
      value.includes('Szczecin, 25.01.2026 r.')
    );

    expect(placeDateIndex).toBeGreaterThanOrEqual(0);
    expect(addresserIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThanOrEqual(0);
    expect(addresserIndex).not.toBe(placeDateIndex);
    expect(addresseeIndex).toBeGreaterThan(addresserIndex);

    const addresserSegment = document.segments[addresserIndex];
    const addresseeSegment = document.segments[addresseeIndex];
    const placeDateSegment = document.segments[placeDateIndex];
    const subjectSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Wniosek o umorzenie zadłużenia')
    );
    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).toContain('Polska');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('72-300 Gryfice');
    expect(placeDateSegment?.raw).not.toContain('Michał Matynia');
    expect(addresserSegment?.raw).not.toContain('Szczecin, 25.01.2026 r.');
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date City'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Day'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Month'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Year'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Addresser First Name'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Street'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Street Number'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address House Number'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Postal Code'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address City'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Country'
    );
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Addressee Organization'
    );
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Addressee Organization Name'
    );
    expect(addresseeSegment?.matchedPatternLabels).not.toContain(
      'Case Resolver Extract: Address Country'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Place + Date'
    );
    expect(addresseeSegment?.matchedSequenceLabels).toContain('Case Resolver Structure');
    expect(placeDateSegment?.title).toBe('');
    expect(addresserSegment?.title).toBe('');
    expect(addresseeSegment?.title).toBe('');
    expect(subjectSegment?.title).toMatch(/^Wniosek/i);
  });

  it('keeps plain place/date line isolated from addresser block without comma suffix', () => {
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

    const placeDateSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Szczecin 25.01.2026')
    );
    const addresserSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Michał Matynia')
    );
    const addresseeSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Inspektorat ZUS w Gryficach')
    );
    const subjectSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Wniosek o umorzenie zadłużenia')
    );

    expect(placeDateSegment).toBeDefined();
    expect(addresserSegment).toBeDefined();
    expect(addresseeSegment).toBeDefined();
    expect(placeDateSegment?.id).not.toBe(addresserSegment?.id);
    expect(addresserSegment?.id).not.toBe(addresseeSegment?.id);
    expect(placeDateSegment?.raw).toBe('Szczecin 25.01.2026');
    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).toContain('70-781 Szczecin');
    expect(addresserSegment?.raw).toContain('Polska');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Dąbskiego 5');
    expect(addresseeSegment?.raw).toContain('72-300 Gryfice');
    expect(placeDateSegment?.title).toBe('');
    expect(addresserSegment?.title).toBe('');
    expect(addresseeSegment?.title).toBe('');
    expect(subjectSegment?.title).toMatch(/^Wniosek/i);
  });

  it('splits Dotyczy subheading into its own segment and keeps the title empty', () => {
    const prompt = [
      '<p><strong>Wniosek o umorzenie zadłużenia</strong></p>',
      '<p><strong>Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282</strong></p>',
      '<p>Niniejszym wnoszę o umorzenie powstałego zadłużenia z tytułu należności składkowych.</p>',
      '<p><strong>Uzasadnienie</strong></p>',
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

    const dotyczySegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes(
        'Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282'
      )
    );
    const bodySegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes(
        'Niniejszym wnoszę o umorzenie powstałego zadłużenia'
      )
    );

    expect(dotyczySegment).toBeDefined();
    expect(bodySegment).toBeDefined();
    expect(dotyczySegment?.id).not.toBe(bodySegment?.id);
    expect(dotyczySegment?.raw.trim()).toBe(
      'Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282'
    );
    expect(dotyczySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Dotyczy Subheading'
    );
    expect(dotyczySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Subject/Section'
    );
    expect(dotyczySegment?.title).toBe('');
    expect(bodySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Body Statement Start'
    );
    expect(bodySegment?.title).toBe('');
  });

  it('keeps Uzasadnienie in title only and removes it from body text', () => {
    const prompt = [
      '<p><strong>Uzasadnienie</strong></p>',
      '<p>Przez kilka lat nie nastąpiło skuteczne doręczenie wnioskodawcy informacji o narastającym zadłużeniu względem ZUS.</p>',
      '<p>Organ rentowy nie dopełnił tym samym obowiązków wynikających z art. 9 i art. 10 KPA.</p>',
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

    const uzasadnienieSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes(
        'Przez kilka lat nie nastąpiło skuteczne doręczenie wnioskodawcy'
      )
    );

    expect(uzasadnienieSegment).toBeDefined();
    expect(uzasadnienieSegment?.title).toBe('Uzasadnienie');
    const uzasadnienieBody = uzasadnienieSegment?.raw || uzasadnienieSegment?.text || '';
    expect(uzasadnienieBody.startsWith('Uzasadnienie')).toBe(false);
  });

  it('keeps Na zakończenie closing segment title empty', () => {
    const prompt = [
      '<p>Na zakończenie, na podstawie art. 73 § 1 KPA, wnoszę o umożliwienie dostępu do akt sprawy.</p>',
      '<p>Proszę o udostępnienie mi akt postępowania do wglądu.</p>',
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

    const closingSegment = document.segments.find((segment) =>
      (segment.raw || segment.text).includes('Na zakończenie, na podstawie art. 73 § 1 KPA')
    );

    expect(closingSegment).toBeDefined();
    expect(closingSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Closing Statement'
    );
    expect(closingSegment?.title).toBe('');
  });
});
