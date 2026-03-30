/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AlphabetBasicsGuideSurface,
} from '@/features/kangur/ui/components/AlphabetBasicsLesson';
import {
  AlphabetCopyGuideSurface,
} from '@/features/kangur/ui/components/AlphabetCopyLesson';

describe('Alphabet lesson visuals', () => {
  it('renders upgraded tracing and copying guide surfaces with atmosphere and frame hooks', () => {
    render(
      <>
        <AlphabetBasicsGuideSurface
          guideColor='#fdba74'
          glowColor='#f59e0b'
          letter='A'
          paths={['M100 200 L180 40 L260 200', 'M130 140 L230 140']}
        />
        <AlphabetCopyGuideSurface
          guideColor='#fde68a'
          inkColor='#f59e0b'
          letter='L'
          word='lion'
          writeHereLabel='Write here'
        />
      </>
    );

    expect(screen.getByTestId('alphabet-basics-guide-animation')).toBeInTheDocument();
    expect(screen.getByTestId('alphabet-basics-guide-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('alphabet-basics-guide-frame')).toBeInTheDocument();

    expect(screen.getByTestId('alphabet-copy-guide-animation')).toBeInTheDocument();
    expect(screen.getByTestId('alphabet-copy-guide-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('alphabet-copy-guide-frame')).toBeInTheDocument();
  });
});
