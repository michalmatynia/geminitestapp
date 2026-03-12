import { describe, expect, it } from 'vitest';

import { resolveKangurTutorSectionKnowledgeReference } from '@/features/kangur/ai-tutor-section-knowledge';

describe('resolveKangurTutorSectionKnowledgeReference', () => {
  it('returns canonical page-content ids for matched sections', () => {
    expect(
      resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-leaderboard',
        contentId: 'game:home',
        focusKind: 'leaderboard',
      })
    ).toEqual({
      sourceCollection: 'kangur_page_content',
      sourceRecordId: 'game-home-leaderboard',
      sourcePath: 'entry:game-home-leaderboard',
    });
  });
});
