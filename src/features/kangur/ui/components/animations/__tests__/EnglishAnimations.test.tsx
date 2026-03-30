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
  EnglishAdverbActionStyleAnimation,
  EnglishAdverbHabitCardAnimation,
  EnglishAdverbPlaceRoutineAnimation,
  EnglishAdverbRepairAnimation,
  EnglishAdverbRoutineAnimation,
  EnglishAdverbSentenceRepairAnimation,
  EnglishAdverbTransformationAnimation,
  EnglishAdverbWordOrderAnimation,
  EnglishArticleFocusAnimation,
  EnglishArticleVowelAnimation,
  EnglishBeVerbSwitchAnimation,
  EnglishComparativeRepairAnimation,
  EnglishComparativeScaleAnimation,
  EnglishComparativeSpellingAnimation,
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
  EnglishSuperlativeCrownAnimation,
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

    const focusAnimation = screen.getByTestId('english-article-focus-animation');
    expect(focusAnimation).toBeInTheDocument();
    expect(screen.getByTestId('english-article-focus-atmosphere')).toBeInTheDocument();
    expect(focusAnimation.querySelectorAll('rect[fill="none"]').length).toBeGreaterThanOrEqual(2);
    expect(focusAnimation.querySelector('circle.focus-ring')).not.toBeNull();

    const vowelAnimation = screen.getByTestId('english-article-vowel-animation');
    expect(vowelAnimation).toBeInTheDocument();
    expect(screen.getByTestId('english-article-vowel-atmosphere')).toBeInTheDocument();
    expect(vowelAnimation.querySelectorAll('rect.frame').length).toBeGreaterThanOrEqual(3);

    expect(
      focusAnimation.querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);
  });

  it('renders upgraded adverb lesson surfaces with clipped frames and atmosphere', () => {
    render(
      <>
        <EnglishAdverbActionStyleAnimation />
        <EnglishAdverbTransformationAnimation />
        <EnglishAdverbRepairAnimation />
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

    expect(screen.getByTestId('english-adverb-action-style-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-action-style-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-action-style-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-transformation-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-transformation-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-transformation-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-adverb-repair-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-repair-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverb-repair-frame')).toBeInTheDocument();

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

    const roomAnimation = screen.getByTestId('english-adjective-room-animation');
    expect(roomAnimation).toBeInTheDocument();
    expect(roomAnimation.querySelector('.frame')).not.toBeNull();
    expect(roomAnimation.querySelector('g.cupboard rect')).not.toBeNull();
    expect(roomAnimation.querySelector('g.curtains rect')).not.toBeNull();
    expect(roomAnimation.querySelector('g.rug ellipse')).not.toBeNull();

    const orderAnimation = screen.getByTestId('english-adjective-order-animation');
    expect(orderAnimation).toBeInTheDocument();
    expect(orderAnimation.querySelector('.frame')).not.toBeNull();
    expect(orderAnimation.querySelectorAll('rect.adj').length).toBeGreaterThanOrEqual(2);
    expect(orderAnimation.querySelector('rect.noun')).not.toBeNull();

    const repairAnimation = screen.getByTestId('english-adjective-repair-animation');
    expect(repairAnimation).toBeInTheDocument();
    expect(repairAnimation.querySelector('.frame')).not.toBeNull();
    expect(repairAnimation.querySelector('.bad')).not.toBeNull();
    expect(repairAnimation.querySelector('.good')).not.toBeNull();

    expect(
      roomAnimation.querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);
  });

  it('renders comparative and superlative lesson surfaces with frames and atmosphere', () => {
    render(
      <>
        <EnglishComparativeScaleAnimation />
        <EnglishSuperlativeCrownAnimation />
        <EnglishComparativeSpellingAnimation />
        <EnglishComparativeRepairAnimation />
      </>
    );

    expect(screen.getByTestId('english-comparative-scale-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-scale-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-scale-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-superlative-crown-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-superlative-crown-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-superlative-crown-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-comparative-spelling-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-spelling-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-spelling-frame')).toBeInTheDocument();

    expect(screen.getByTestId('english-comparative-repair-animation')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-repair-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('english-comparative-repair-frame')).toBeInTheDocument();
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

    const agreementAnimation = screen.getByTestId('english-agreement-balance-animation');
    expect(agreementAnimation).toBeInTheDocument();
    expect(agreementAnimation.querySelector('.frame')).not.toBeNull();
    expect(
      agreementAnimation.querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);

    const thirdPersonAnimation = screen.getByTestId('english-third-person-s-animation');
    expect(thirdPersonAnimation).toBeInTheDocument();
    expect(thirdPersonAnimation.querySelector('.frame')).not.toBeNull();
    expect(thirdPersonAnimation.querySelector('.reveal-s')).not.toBeNull();

    const beVerbAnimation = screen.getByTestId('english-be-verb-switch-animation');
    expect(beVerbAnimation).toBeInTheDocument();
    expect(beVerbAnimation.querySelector('.frame')).not.toBeNull();
    expect(beVerbAnimation.querySelectorAll('.step').length).toBeGreaterThanOrEqual(3);

    const zeroArticleAnimation = screen.getByTestId('english-zero-article-animation');
    expect(zeroArticleAnimation).toBeInTheDocument();
    expect(zeroArticleAnimation.querySelector('.frame')).not.toBeNull();
    expect(zeroArticleAnimation.querySelector('.strike')).not.toBeNull();
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

    const blueprintAnimation = screen.getByTestId('english-sentence-blueprint-animation');
    expect(blueprintAnimation).toBeInTheDocument();
    expect(blueprintAnimation.querySelector('.frame')).not.toBeNull();
    expect(blueprintAnimation.querySelectorAll('rect.block').length).toBeGreaterThanOrEqual(3);

    const questionFlipAnimation = screen.getByTestId('english-question-flip-animation');
    expect(questionFlipAnimation).toBeInTheDocument();
    expect(questionFlipAnimation.querySelector('.frame')).not.toBeNull();
    expect(questionFlipAnimation.querySelector('.swap-a')).not.toBeNull();
    expect(questionFlipAnimation.querySelector('.swap-b')).not.toBeNull();

    const connectorBridgeAnimation = screen.getByTestId('english-connector-bridge-animation');
    expect(connectorBridgeAnimation).toBeInTheDocument();
    expect(connectorBridgeAnimation.querySelectorAll('.frame').length).toBeGreaterThanOrEqual(2);

    const prepositionsTimeAnimation = screen.getByTestId('english-prepositions-time-animation');
    expect(prepositionsTimeAnimation).toBeInTheDocument();
    expect(prepositionsTimeAnimation.querySelectorAll('.frame').length).toBeGreaterThanOrEqual(3);

    const prepositionsTimelineAnimation = screen.getByTestId('english-prepositions-timeline-animation');
    expect(prepositionsTimelineAnimation).toBeInTheDocument();
    expect(prepositionsTimelineAnimation.querySelector('.frame')).not.toBeNull();
    expect(
      prepositionsTimelineAnimation.querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);
    expect(
      blueprintAnimation.querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBeGreaterThan(0);

    const prepositionsPlaceAnimation = screen.getByTestId('english-prepositions-place-animation');
    expect(prepositionsPlaceAnimation).toBeInTheDocument();
    expect(prepositionsPlaceAnimation.querySelectorAll('.frame').length).toBeGreaterThanOrEqual(3);

    const prepositionsRelationsAnimation = screen.getByTestId(
      'english-prepositions-relations-animation'
    );
    expect(prepositionsRelationsAnimation).toBeInTheDocument();
    expect(prepositionsRelationsAnimation.querySelectorAll('.frame').length).toBeGreaterThanOrEqual(
      2
    );
  });
});
