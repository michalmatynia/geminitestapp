/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnglishPronounsPulseAnimation } from '@/features/kangur/ui/components/EnglishPronounsAnimations';

describe('EnglishPronounsAnimations visuals', () => {
  it('renders the upgraded pronoun pulse surface with atmosphere and frame', () => {
    render(<EnglishPronounsPulseAnimation />);

    expect(screen.getByTestId('english-pronouns-pulse-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronouns-pulse-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronouns-pulse-frame')).toBeInTheDocument();
    expect(screen.getByText('Pronoun Remix')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('english-pronouns-pulse-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });
});
