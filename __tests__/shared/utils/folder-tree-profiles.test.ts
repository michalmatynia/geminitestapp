import { describe, expect, it } from 'vitest';

import {
  folderTreeInstanceValues,
  folderTreePersistFeedbackByInstance,
  folderTreePlaceholderPresetOptions,
  folderTreeSettingsMetaByInstance,
  getFolderTreeInstanceSettingsHref,
  getFolderTreePlaceholderClasses,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('exposes the unified folder tree instances', () => {
    expect(Array.from(folderTreeInstanceValues)).toEqual([
      'notes',
      'image_studio',
      'product_categories',
      'cms_page_builder',
      'case_resolver',
      'case_resolver_case_hierarchy',
      'case_resolver_document_relations',
      'case_resolver_nodefile_relations',
      'case_resolver_scanfile_relations',
      'validator_list_tree',
      'validator_pattern_tree',
      'prompt_exploder_segments',
      'prompt_exploder_hierarchy',
      'admin_menu_layout',
      'brain_catalog_tree',
      'brain_routing_tree',
    ]);
  });

  it('returns class presets', () => {
    expect(getFolderTreePlaceholderClasses('classic').rootIdle).toContain('border-sky-500');
    expect(getFolderTreePlaceholderClasses('sublime').badgeActive).toContain('text-sky-100');
    expect(getFolderTreePlaceholderClasses('vivid').lineActive).toContain('bg-fuchsia');
  });

  it('exposes settings metadata and persist feedback for every instance', () => {
    folderTreeInstanceValues.forEach((instance) => {
      expect(folderTreeSettingsMetaByInstance[instance].title.length).toBeGreaterThan(0);
      expect(folderTreeSettingsMetaByInstance[instance].description.length).toBeGreaterThan(0);
      expect(folderTreeSettingsMetaByInstance[instance].fileHint.length).toBeGreaterThan(0);
      expect(folderTreeSettingsMetaByInstance[instance].folderHint.length).toBeGreaterThan(0);
      expect(folderTreePersistFeedbackByInstance[instance].successMessage.length).toBeGreaterThan(0);
    });
  });

  it('exposes selectable placeholder options', () => {
    expect(folderTreePlaceholderPresetOptions).toEqual([
      { value: 'sublime', label: 'Sublime' },
      { value: 'classic', label: 'Classic' },
      { value: 'vivid', label: 'Vivid' },
    ]);
  });

  it('builds settings hrefs for every instance', () => {
    folderTreeInstanceValues.forEach((instance) => {
      expect(getFolderTreeInstanceSettingsHref(instance)).toBe(
        `/admin/settings/folder-trees#folder-tree-instance-${instance}`
      );
    });
  });
});
