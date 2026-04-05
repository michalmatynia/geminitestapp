import { describe, expect, it } from 'vitest';

import {
  createSentenceStructureRoundState,
  ENGLISH_SENTENCE_STRUCTURE_ROUNDS,
  evaluateSentenceStructureRound,
  isSentenceStructureRoundReady,
} from './EnglishSentenceStructureGame.helpers';

const getRound = (roundId: string) => {
  const round = ENGLISH_SENTENCE_STRUCTURE_ROUNDS.find(
    (candidate) => candidate.id === roundId
  );
  if (!round) {
    throw new Error(`Missing round: ${roundId}`);
  }
  return round;
};

describe('EnglishSentenceStructureGame helpers', () => {
  it('evaluates choice, order, and fill rounds', () => {
    expect(
      evaluateSentenceStructureRound(getRound('svo-order'), {
        selection: 'The drummer plays the rhythm.',
        orderTokens: [],
        fillValue: '',
      })
    ).toEqual({
      isCorrect: true,
      correctAnswerLabel: 'The drummer plays the rhythm.',
    });

    expect(
      evaluateSentenceStructureRound(getRound('order-words'), {
        selection: null,
        orderTokens: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
        fillValue: '',
      })
    ).toEqual({
      isCorrect: true,
      correctAnswerLabel: 'My friend always finishes homework on time',
    });

    expect(
      evaluateSentenceStructureRound(getRound('does-negative'), {
        selection: null,
        orderTokens: [],
        fillValue: 'does not',
      })
    ).toEqual({
      isCorrect: true,
      correctAnswerLabel: "doesn't",
    });
  });

  it('reports readiness only when the active round has usable input', () => {
    expect(
      isSentenceStructureRoundReady(getRound('svo-order'), {
        selection: null,
        orderTokens: [],
        fillValue: '',
      })
    ).toBe(false);

    expect(
      isSentenceStructureRoundReady(getRound('svo-order'), {
        selection: 'The drummer plays the rhythm.',
        orderTokens: [],
        fillValue: '',
      })
    ).toBe(true);

    expect(
      isSentenceStructureRoundReady(getRound('order-words'), {
        selection: null,
        orderTokens: ['My'],
        fillValue: '',
      })
    ).toBe(true);

    expect(
      isSentenceStructureRoundReady(getRound('do-question'), {
        selection: null,
        orderTokens: [],
        fillValue: '   ',
      })
    ).toBe(false);
  });

  it('creates round state with shuffled order tokens only for order rounds', () => {
    const choiceState = createSentenceStructureRoundState(getRound('svo-order'));
    expect(choiceState).toEqual({
      selection: null,
      orderTokens: [],
      fillValue: '',
    });

    const orderRound = getRound('order-words');
    const orderState = createSentenceStructureRoundState(orderRound);
    expect(orderState.selection).toBeNull();
    expect(orderState.fillValue).toBe('');
    expect([...orderState.orderTokens].sort()).toEqual([...orderRound.tokens].sort());
  });
});
