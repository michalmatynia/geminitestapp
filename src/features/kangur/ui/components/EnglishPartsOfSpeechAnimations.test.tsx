/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PartsOfSpeechCardPulseAnimation,
  PartsOfSpeechGraphAnimation,
  PartsOfSpeechPrepositionAnimation,
} from './EnglishPartsOfSpeechAnimations';

describe('EnglishPartsOfSpeechAnimations visuals', () => {
  it('renders upgraded parts-of-speech teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <PartsOfSpeechCardPulseAnimation />
        <PartsOfSpeechGraphAnimation />
        <PartsOfSpeechPrepositionAnimation />
      </>
    );

    [
      'english-parts-of-speech-cards',
      'english-parts-of-speech-graph',
      'english-parts-of-speech-preposition',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
