import { describe, expect, it } from 'vitest';

import {
  DOCUMENTATION_MODULE_IDS,
  getDocumentationEntry,
  getDocumentationEntriesByModule,
} from '@/shared/lib/documentation';

import { KANGUR_DOC_CATALOG, KANGUR_DOCUMENTATION_LIBRARY } from '../kangur';

describe('Kangur tooltip catalog', () => {
  it('resolves required Kangur tooltip entries from the central docs catalog', () => {
    const requiredIds = [
      'app_overview',
      'top_nav_home',
      'top_nav_lessons',
      'top_nav_profile',
      'lessons_library_entry',
      'tests_suite_card',
      'learner_daily_plan',
      'parent_progress_tab',
      'settings_docs_tooltips_master_toggle',
      'settings_documentation_library',
      'settings_save',
    ];

    for (const id of requiredIds) {
      expect(getDocumentationEntry(DOCUMENTATION_MODULE_IDS.kangur, id)).not.toBeNull();
    }
  });

  it('does not contain duplicate ids in the Kangur source catalog', () => {
    const ids = KANGUR_DOC_CATALOG.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('registers the expected long-form Kangur documentation guides', () => {
    const guideIds = KANGUR_DOCUMENTATION_LIBRARY.map((guide) => guide.id);
    expect(guideIds).toEqual([
      'overview',
      'learner-navigation',
      'lessons-and-activities',
      'tests-and-exams',
      'profile-and-parent-dashboard',
      'admin-content-authoring',
      'settings-and-narration',
      'svg-and-media-rules',
    ]);
  });

  it('publishes a non-empty Kangur module in the global registry', () => {
    expect(getDocumentationEntriesByModule(DOCUMENTATION_MODULE_IDS.kangur).length).toBeGreaterThan(
      10
    );
  });
});
