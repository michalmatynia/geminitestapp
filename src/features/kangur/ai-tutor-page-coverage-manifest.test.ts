import { describe, expect, it } from 'vitest';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_CONTRACT_GAPS,
  KANGUR_AI_TUTOR_PAGE_COVERAGE_CONTEXT_ONLY,
  KANGUR_AI_TUTOR_PAGE_COVERAGE_MANIFEST,
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  KANGUR_AI_TUTOR_PAGE_COVERAGE_SUMMARY,
} from './ai-tutor-page-coverage-manifest';

describe('Kangur tutor page coverage manifest', () => {
  it('keeps a stable inventory summary for the current Kangur UI', () => {
    expect(KANGUR_AI_TUTOR_PAGE_COVERAGE_SUMMARY).toEqual({
      total: 50,
      nativeGuideReady: 50,
      contextOnly: 0,
      contractGap: 0,
    });
  });

  it('uses unique manifest ids for every tracked page section', () => {
    const ids = KANGUR_AI_TUTOR_PAGE_COVERAGE_MANIFEST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tracks the current explicit tutor-anchor coverage points that are already Mongo-ready', () => {
    expect(KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO).toHaveLength(50);
    expect(KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'game-home-actions',
        'game-training-setup',
        'game-operation-selector',
        'game-kangur-setup',
        'game-playing-assignment-banner',
        'game-result-summary',
        'game-result-leaderboard',
        'lessons-list-intro',
        'lessons-library',
        'lessons-list-empty-state',
        'lessons-active-secret-panel',
        'lessons-active-empty-document',
        'lessons-active-navigation',
        'tests-empty-state',
        'tests-question',
        'tests-selection',
        'tests-review',
        'tests-summary',
        'learner-profile-hero',
        'learner-profile-recommendations',
        'learner-profile-sessions',
        'parent-dashboard-guest-hero',
        'parent-dashboard-tabs',
        'parent-dashboard-ai-tutor',
        'login-page-form',
        'login-page-identifier-field',
        'shared-nav-create-account-action',
        'shared-nav-login-action',
      ])
    );
  });

  it('keeps screen-level gaps explicit for pages that still rely on coarse context only', () => {
    expect(KANGUR_AI_TUTOR_PAGE_COVERAGE_CONTEXT_ONLY).toEqual([]);
  });

  it('has no remaining contract gaps after auth coverage is seeded into Mongo', () => {
    expect(KANGUR_AI_TUTOR_PAGE_COVERAGE_CONTRACT_GAPS).toEqual([]);
  });
});
