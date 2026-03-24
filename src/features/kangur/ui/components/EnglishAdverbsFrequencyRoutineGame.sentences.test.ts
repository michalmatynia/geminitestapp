import { describe, expect, it } from 'vitest';

import {
  buildEnglishAdverbsFrequencySentence,
  buildEnglishAdverbsFrequencySentenceParts,
  buildEnglishAdverbsFrequencySentenceTemplate,
  buildEnglishAdverbsFrequencySentenceTemplateParts,
} from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.sentences';

describe('buildEnglishAdverbsFrequencySentence', () => {
  it('builds standard adverb + main verb sentences', () => {
    expect(buildEnglishAdverbsFrequencySentence('go_to_cinema', 'always')).toBe(
      'I always go to the cinema.'
    );
    expect(buildEnglishAdverbsFrequencySentence('eat_popcorn', 'never')).toBe(
      'I never eat popcorn there.'
    );
  });

  it('uses the be-verb pattern for be sentences', () => {
    expect(buildEnglishAdverbsFrequencySentence('be_late_for_school', 'never')).toBe(
      'I am never late for school.'
    );
  });

  it('returns sentence parts with the correct grammar pattern marker', () => {
    expect(buildEnglishAdverbsFrequencySentenceParts('go_to_cinema', 'always')).toEqual({
      pattern: 'mainVerb',
      parts: ['I', 'always', 'go to the cinema'],
    });
    expect(buildEnglishAdverbsFrequencySentenceParts('be_late_for_school', 'never')).toEqual({
      pattern: 'beVerb',
      parts: ['I am', 'never', 'late for school'],
    });
  });

  it('returns empty sentence templates that keep the adverb slot visible', () => {
    expect(buildEnglishAdverbsFrequencySentenceTemplateParts('go_to_cinema')).toEqual({
      pattern: 'mainVerb',
      parts: ['I', '___', 'go to the cinema'],
    });
    expect(buildEnglishAdverbsFrequencySentenceTemplateParts('be_late_for_school')).toEqual({
      pattern: 'beVerb',
      parts: ['I am', '___', 'late for school'],
    });
    expect(buildEnglishAdverbsFrequencySentenceTemplate('go_to_cinema')).toBe(
      'I ___ go to the cinema.'
    );
    expect(buildEnglishAdverbsFrequencySentenceTemplate('be_late_for_school')).toBe(
      'I am ___ late for school.'
    );
  });
});
