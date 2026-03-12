import { describe, expect, it } from 'vitest';

import { resolveKangurTutorSectionKnowledgeReference } from '../ai-tutor-section-knowledge';

// These tests exercise the scoring/ranking logic through the public API.
// Anchor IDs and content IDs are chosen to match entries in the real manifest.

describe('resolveKangurTutorSectionKnowledgeReference', () => {
  describe('null / no-match cases', () => {
    it('returns null when no entry matches focusKind', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'selection',   // no manifest entry has focusKind 'selection'
      });
      expect(result).toBeNull();
    });

    it('returns null when anchorId does not match any prefix for the focusKind', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'completely-unrelated-anchor',
        contentId: null,
        focusKind: 'hero',
      });
      expect(result).toBeNull();
    });

    it('returns null when contentId present but no prefix matches it', () => {
      // hero entries have contentIdPrefixes: ['game:home']
      // a non-matching contentId with no anchor overlap should return null
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'completely-unrelated-anchor',
        contentId: 'tests:session:xyz',
        focusKind: 'hero',
      });
      expect(result).toBeNull();
    });
  });

  describe('anchor prefix matching', () => {
    it('matches entry when anchorId starts with the entry anchorIdPrefix', () => {
      // game-home-hero has anchorIdPrefix 'kangur-game-home-hero' and focusKind 'hero'
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'hero',
      });
      expect(result).not.toBeNull();
      expect(result?.sourceRecordId).toBe('game-home-hero');
      expect(result?.sourceCollection).toBe('kangur_page_content');
      expect(result?.sourcePath).toBe('entry:game-home-hero');
    });

    it('matches entry when anchorId starts with the prefix (anchor extended beyond prefix)', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero-extended-suffix',
        contentId: 'game:home',
        focusKind: 'hero',
      });
      expect(result?.sourceRecordId).toBe('game-home-hero');
    });
  });

  describe('content ID matching', () => {
    it('matches entry when contentId exactly equals a contentIdPrefix', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'hero',
      });
      expect(result?.sourceRecordId).toBe('game-home-hero');
    });

    it('matches entry when contentId starts with a contentIdPrefix', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home:lesson-addition-1',
        focusKind: 'hero',
      });
      expect(result?.sourceRecordId).toBe('game-home-hero');
    });
  });

  describe('anchor vs content match disambiguation', () => {
    it('prefers the entry with a matching anchor prefix when both anchor and content match', () => {
      // game-home-actions has anchorIdPrefix 'kangur-game-home-actions' and focusKind 'home_actions'
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-actions',
        contentId: 'game:home',
        focusKind: 'home_actions',
      });
      expect(result?.sourceRecordId).toBe('game-home-actions');
    });

    it('resolves game-home-quest by anchor prefix', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-quest',
        contentId: 'game:home',
        focusKind: 'home_quest',
      });
      expect(result?.sourceRecordId).toBe('game-home-quest');
    });

    it('resolves priority_assignments entry by anchor prefix', () => {
      // anchorIdPrefix is 'kangur-game-home-assignments', id is 'game-home-priority-assignments'
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-assignments',
        contentId: 'game:home',
        focusKind: 'priority_assignments',
      });
      expect(result?.sourceRecordId).toBe('game-home-priority-assignments');
    });
  });

  describe('focusKind guard', () => {
    it('does not match an entry whose focusKind differs even if anchor prefix matches', () => {
      // anchorId matches game-home-hero's prefix but focusKind is wrong
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'home_actions',  // hero entry has focusKind 'hero'
      });
      // Should not return 'game-home-hero'
      expect(result?.sourceRecordId).not.toBe('game-home-hero');
    });
  });

  describe('return shape', () => {
    it('always returns sourceCollection "kangur_page_content"', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'hero',
      });
      expect(result?.sourceCollection).toBe('kangur_page_content');
    });

    it('always returns sourcePath as "entry:<sourceRecordId>"', () => {
      const result = resolveKangurTutorSectionKnowledgeReference({
        anchorId: 'kangur-game-home-hero',
        contentId: 'game:home',
        focusKind: 'hero',
      });
      expect(result?.sourcePath).toBe(`entry:${result?.sourceRecordId}`);
    });
  });
});
