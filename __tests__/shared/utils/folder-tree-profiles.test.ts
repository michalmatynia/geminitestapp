import { describe, expect, it } from 'vitest';

import {
  folderTreeInstanceValues,
  folderTreePlaceholderPresetOptions,
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
    ]);
  });

  it('returns class presets', () => {
    expect(getFolderTreePlaceholderClasses('classic').rootIdle).toContain('border-sky-500');
    expect(getFolderTreePlaceholderClasses('sublime').badgeActive).toContain('text-sky-100');
    expect(getFolderTreePlaceholderClasses('vivid').lineActive).toContain('bg-fuchsia');
  });

  it('exposes selectable placeholder options', () => {
    expect(folderTreePlaceholderPresetOptions).toEqual([
      { value: 'sublime', label: 'Sublime' },
      { value: 'classic', label: 'Classic' },
      { value: 'vivid', label: 'Vivid' },
    ]);
  });
});
