/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnglishSubjectVerbGuideAnimation } from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson';

describe('EnglishSubjectVerbAgreementLesson visuals', () => {
  it('renders the upgraded subject-verb guide surface with atmosphere and frame', () => {
    render(<EnglishSubjectVerbGuideAnimation />);

    expect(screen.getByTestId('english-agreement-subject-verb-link-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-agreement-subject-verb-link-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-agreement-subject-verb-link-frame')).toBeInTheDocument();
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Verb')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('english-agreement-subject-verb-link-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });
});
