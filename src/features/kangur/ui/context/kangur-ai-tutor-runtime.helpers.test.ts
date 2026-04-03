import { describe, expect, it } from 'vitest';

import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

import {
  areConversationContextsEqual,
  buildNextLearnerMemory,
} from './kangur-ai-tutor-runtime.helpers';

const makeContext = (
  overrides: Partial<KangurAiTutorConversationContext> = {}
): KangurAiTutorConversationContext => ({
  surface: 'lesson',
  contentId: 'lesson-1',
  ...overrides,
});

describe('kangur-ai-tutor-runtime helpers', () => {
  it('builds learner memory focus labels from the first populated context field', () => {
    expect(
      buildNextLearnerMemory({
        current: null,
        context: makeContext({
          focusLabel: '   ',
          title: '  Fractions  ',
          selectedText: 'Should not be used',
        }),
        userMessage: 'Help',
        assistantMessage: 'Try this step first.',
        followUpActions: [],
        coachingFrame: null,
      }).lastFocusLabel
    ).toBe('Fractions');

    expect(
      buildNextLearnerMemory({
        current: null,
        context: makeContext({
          focusLabel: '   ',
          title: '   ',
          selectedText: '  Selected snippet  ',
          currentQuestion: 'Fallback question',
        }),
        userMessage: 'Help',
        assistantMessage: 'Try this step first.',
        followUpActions: [],
        coachingFrame: null,
      }).lastFocusLabel
    ).toBe('Selected snippet');
  });

  it('compares conversation contexts by shared fields and knowledge references', () => {
    const left = makeContext({
      questionId: 'question-1',
      selectedText: 'Hint',
      knowledgeReference: {
        sourceCollection: 'lessons',
        sourceRecordId: 'record-1',
        sourcePath: 'blocks.0',
      },
      interactionIntent: 'ask_for_hint',
    });
    const same = makeContext({
      questionId: 'question-1',
      selectedText: 'Hint',
      knowledgeReference: {
        sourceCollection: 'lessons',
        sourceRecordId: 'record-1',
        sourcePath: 'blocks.0',
      },
      interactionIntent: 'ask_for_hint',
    });
    const differentKnowledgePath = makeContext({
      questionId: 'question-1',
      selectedText: 'Hint',
      knowledgeReference: {
        sourceCollection: 'lessons',
        sourceRecordId: 'record-1',
        sourcePath: 'blocks.1',
      },
      interactionIntent: 'ask_for_hint',
    });

    expect(areConversationContextsEqual(left, same)).toBe(true);
    expect(areConversationContextsEqual(left, differentKnowledgePath)).toBe(false);
    expect(
      areConversationContextsEqual(left, makeContext({ ...same, interactionIntent: 'explain_answer' }))
    ).toBe(false);
  });
});
