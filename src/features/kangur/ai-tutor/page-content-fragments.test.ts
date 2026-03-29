import { describe, expect, it } from 'vitest';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/ai-tutor/page-content-catalog';
import { resolveKangurPageContentFragment } from '@/features/kangur/ai-tutor/page-content-fragments';

const getTestsQuestionEntry = () => {
  const entry = buildDefaultKangurPageContentStore('pl').entries.find(
    (candidate) => candidate.id === 'tests-question'
  );
  expect(entry).toBeTruthy();
  return entry!;
};

describe('resolveKangurPageContentFragment', () => {
  it('matches the Kangur squares question when the selected text is missing the first character', () => {
    const fragment = resolveKangurPageContentFragment({
      entry: getTestsQuestionEntry(),
      selectedText:
        'tóry kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    });

    expect(fragment?.id).toBe('kangur-q1-squares');
  });

  it('matches the Kangur squares question when the selected text includes the answer-range suffix', () => {
    const fragment = resolveKangurPageContentFragment({
      entry: getTestsQuestionEntry(),
      selectedText:
        'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A-E)',
    });

    expect(fragment?.id).toBe('kangur-q1-squares');
  });
});
