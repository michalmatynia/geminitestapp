import { describe, expect, it } from 'vitest';

import { createDefaultFilemakerLexiconValidationPatterns } from '../../filemaker-settings.entities';
import { classifyFilemakerLexiconLabelWithPatterns } from './lexicon-validation-patterns';

const patterns = createDefaultFilemakerLexiconValidationPatterns();

describe('classifyFilemakerLexiconLabelWithPatterns', () => {
  it('uses partial matching for Polish language phrases', () => {
    const result = classifyFilemakerLexiconLabelWithPatterns(patterns, {
      label: 'Komunikatywna znajomość języka angielskiego (praca w zespole międzynarodowym)',
      sourceScope: 'unclassified',
    });

    expect(result).toEqual(
      expect.objectContaining({
        typeKey: 'language',
      })
    );
  });

  it('uses partial matching for capability and accessibility requirement phrases', () => {
    const result = classifyFilemakerLexiconLabelWithPatterns(patterns, {
      label: 'Wsparcie w implementacji SSR (Next.js). Świadomość zasad accessibility (WCAG).',
      sourceScope: 'unclassified',
    });

    expect(result).toEqual(
      expect.objectContaining({
        typeKey: 'requirement',
      })
    );
  });

  it('routes location strings away from address lexicon terms', () => {
    const result = classifyFilemakerLexiconLabelWithPatterns(patterns, {
      label: 'Poznań(wielkopolskie), Cała Polska (praca zdalna), Polska',
      sourceScope: 'unclassified',
    });

    expect(result).toEqual(
      expect.objectContaining({
        typeKey: 'other',
      })
    );
  });
});
