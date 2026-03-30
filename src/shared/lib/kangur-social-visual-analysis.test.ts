import { describe, expect, it } from 'vitest';

import {
  normalizeKangurSocialVisualAnalysis,
  sanitizeKangurSocialVisualHighlights,
  sanitizeKangurSocialVisualSummary,
} from './kangur-social-visual-analysis';

describe('kangur social visual analysis normalization', () => {
  it('strips non-visual narrative sections from legacy summaries', () => {
    expect(
      sanitizeKangurSocialVisualSummary(`Okay, I've reviewed the provided text and images. Here's a summary of the key information. The screenshots show a Polish-localized navigation, updated lesson labels, and refreshed card styling across the app.

**Potential Documentation/Communication Narrative**
Here's a draft you could use for release notes.
`)
    ).toBe(
      'The screenshots show a Polish-localized navigation, updated lesson labels, and refreshed card styling across the app.'
    );
  });

  it('filters non-visual legacy proposal bullets from highlights', () => {
    expect(
      sanitizeKangurSocialVisualHighlights([
        '- Larger classroom card in the hero',
        'Documentation update proposal for the homepage docs',
        'LinkedIn post suggestion about the release',
      ])
    ).toEqual(['Larger classroom card in the hero']);
  });

  it('normalizes nullable analysis fields into a clean visual-only result', () => {
    expect(
      normalizeKangurSocialVisualAnalysis({
        summary: '  ',
        highlights: ['- Updated navigation labels'],
      })
    ).toEqual({
      summary: '',
      highlights: ['Updated navigation labels'],
    });
  });
});
