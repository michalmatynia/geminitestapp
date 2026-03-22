import { describe, expect, it } from 'vitest';

import { selectKangurMobileAiTutorGuideEntry } from './selectKangurMobileAiTutorGuideEntry';

const overviewEntry = {
  contentIdPrefixes: [],
  enabled: true,
  focusIdPrefixes: [],
  focusKind: null,
  followUpActions: [],
  fullDescription: 'Test overview',
  hints: [],
  id: 'test-overview',
  relatedGames: [],
  relatedTests: [],
  shortDescription: 'Overview',
  sortOrder: 10,
  surface: 'test' as const,
  title: 'Ekran testu',
  triggerPhrases: [],
};

const questionEntry = {
  contentIdPrefixes: [],
  enabled: true,
  focusIdPrefixes: ['kangur-test-question:'],
  focusKind: 'question' as const,
  followUpActions: [],
  fullDescription: 'Question help',
  hints: [],
  id: 'test-question',
  relatedGames: [],
  relatedTests: [],
  shortDescription: 'Question',
  sortOrder: 20,
  surface: 'test' as const,
  title: 'Pytanie testowe',
  triggerPhrases: [],
};

describe('selectKangurMobileAiTutorGuideEntry', () => {
  it('prefers the surface overview when there is no more specific context', () => {
    expect(
      selectKangurMobileAiTutorGuideEntry([questionEntry, overviewEntry], {
        surface: 'test',
      }),
    )?.toMatchObject({
      id: 'test-overview',
    });
  });

  it('prefers the focused question entry when question context is available', () => {
    expect(
      selectKangurMobileAiTutorGuideEntry([overviewEntry, questionEntry], {
        contentId: 'suite-clock-2025',
        currentQuestion: 'Ile to 2 + 2?',
        focusId: 'kangur-test-question:question-1',
        focusKind: 'question',
        questionId: 'question-1',
        surface: 'test',
        title: 'Test startowy',
      }),
    )?.toMatchObject({
      id: 'test-question',
    });
  });
});
