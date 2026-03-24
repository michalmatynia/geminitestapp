/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  EnglishAgreementBalanceAnimation,
  EnglishAdjectiveOrderAnimation,
  EnglishAdjectiveRepairAnimation,
  EnglishAdjectiveRoomAnimation,
  EnglishAdverbFrequencyScaleAnimation,
  EnglishAdverbHabitCardAnimation,
  EnglishAdverbPlaceRoutineAnimation,
  EnglishAdverbRoutineAnimation,
  EnglishAdverbSentenceRepairAnimation,
  EnglishAdverbWordOrderAnimation,
  EnglishArticleFocusAnimation,
  EnglishArticleVowelAnimation,
  EnglishBeVerbSwitchAnimation,
  EnglishConnectorBridgeAnimation,
  EnglishPossessiveAdjectiveAnimation,
  EnglishPossessivePronounAnimation,
  EnglishPrepositionsPlaceAnimation,
  EnglishPrepositionsRelationsDiagram,
  EnglishPrepositionsTimeAnimation,
  EnglishPrepositionsTimelineAnimation,
  EnglishPronounSwapAnimation,
  EnglishQuestionFlipAnimation,
  EnglishSentenceBlueprintAnimation,
  EnglishThirdPersonSAnimation,
  EnglishZeroArticleAnimation,
} from '@/features/kangur/ui/components/animations/EnglishAnimations';

describe('EnglishAnimations visuals', () => {
  it('renders upgraded article lesson surfaces with frames and atmosphere', () => {
    render(
      <>
        <EnglishArticleFocusAnimation />
        <EnglishArticleVowelAnimation />
      </>
    );

    expect(screen.getByTestId('english-article-focus-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-focus-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-focus-panel-a-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-focus-panel-the-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-focus-panel-the-focus')).toBeInTheDocument();

    expect(screen.getByTestId('english-article-vowel-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-vowel-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-vowel-card-equation-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-vowel-card-graph-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-article-vowel-card-angle-frame')).toBeInTheDocument();

    expect(
      screen
        .getByTestId('english-article-focus-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);
  });

  it('renders upgraded adverb lesson surfaces with clipped frames and atmosphere', () => {
    render(
      <>
        <EnglishAdverbFrequencyScaleAnimation />
        <EnglishAdverbRoutineAnimation />
        <EnglishAdverbWordOrderAnimation mode='mainVerb' />
        <EnglishAdverbWordOrderAnimation mode='beVerb' />
        <EnglishAdverbSentenceRepairAnimation />
        <EnglishAdverbHabitCardAnimation />
        <EnglishAdverbPlaceRoutineAnimation />
      </>
    );

    expect(screen.getByTestId('english-adverb-frequency-scale-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-frequency-scale-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-frequency-scale-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-routine-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-routine-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-routine-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-word-order-mainVerb-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-word-order-mainVerb-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-word-order-mainVerb-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-word-order-beVerb-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-word-order-beVerb-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-word-order-beVerb-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-sentence-repair-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-sentence-repair-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-sentence-repair-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-habit-card-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-habit-card-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-habit-card-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-place-routine-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-place-routine-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-place-routine-frame')).toBeInTheDocument();
  });

  it('renders upgraded adjective lesson surfaces with richer frames and illustrated layers', () => {
    render(
      <>
        <EnglishAdjectiveRoomAnimation />
        <EnglishAdjectiveOrderAnimation />
        <EnglishAdjectiveRepairAnimation />
      </>
    );

    expect(screen.getByTestId('english-adjective-room-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-room-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-room-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-room-cupboard-surface')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-room-curtains-surface')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-room-rug-surface')).toBeInTheDocument();

    expect(screen.getByTestId('english-adjective-order-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-order-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-order-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-order-small-card')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-order-blue-card')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-order-noun-card')).toBeInTheDocument();

    expect(screen.getByTestId('english-adjective-repair-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-repair-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adjective-repair-frame')).toBeInTheDocument();

    expect(
      screen
        .getByTestId('english-adjective-room-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);
  });

  it('renders upgraded core grammar surfaces for pronouns, agreement, and zero article', () => {
    render(
      <>
        <EnglishPronounSwapAnimation />
        <EnglishPossessiveAdjectiveAnimation />
        <EnglishPossessivePronounAnimation />
        <EnglishAgreementBalanceAnimation />
        <EnglishThirdPersonSAnimation />
        <EnglishBeVerbSwitchAnimation />
        <EnglishZeroArticleAnimation />
      </>
    );

    expect(screen.getByTestId('english-pronoun-swap-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronoun-swap-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-pronoun-swap-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-possessive-adjective-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-adjective-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-adjective-my-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-adjective-your-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-adjective-their-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-possessive-pronoun-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-pronoun-mine-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-possessive-pronoun-yours-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-agreement-balance-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-agreement-balance-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-agreement-balance-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-third-person-s-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-third-person-s-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-third-person-s-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-be-verb-switch-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-be-verb-switch-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-be-verb-switch-card-0-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-be-verb-switch-card-1-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-be-verb-switch-card-2-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-zero-article-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-zero-article-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-zero-article-frame')).toBeInTheDocument();
  });

  it('renders upgraded sentence structure and prepositions teaching surfaces', () => {
    render(
      <>
        <EnglishSentenceBlueprintAnimation />
        <EnglishQuestionFlipAnimation />
        <EnglishConnectorBridgeAnimation />
        <EnglishPrepositionsTimeAnimation />
        <EnglishPrepositionsTimelineAnimation />
        <EnglishPrepositionsPlaceAnimation />
        <EnglishPrepositionsRelationsDiagram />
      </>
    );

    expect(screen.getByTestId('english-sentence-blueprint-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-sentence-blueprint-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-sentence-blueprint-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-sentence-blueprint-subject-card')).toBeInTheDocument();
    expect(screen.getByTestId('english-sentence-blueprint-verb-card')).toBeInTheDocument();
    expect(screen.getByTestId('english-sentence-blueprint-object-card')).toBeInTheDocument();

    expect(screen.getByTestId('english-question-flip-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-question-flip-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-question-flip-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-connector-bridge-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-connector-bridge-left-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-connector-bridge-right-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-prepositions-time-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-time-at-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-time-on-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-time-in-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-prepositions-timeline-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-timeline-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-timeline-frame')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('english-sentence-blueprint-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);

    expect(screen.getByTestId('english-prepositions-place-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-place-at-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-place-in-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-place-on-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-prepositions-relations-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-relations-between-frame')).toBeInTheDocument();
    expect(screen.getByTestId('english-prepositions-relations-vertical-frame')).toBeInTheDocument();
  });
});
