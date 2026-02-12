import { describe, expect, it } from 'vitest';

import {
  canNestTreeNode,
  createDefaultFolderTreeProfiles,
  getFolderTreePlaceholderClasses,
  parseFolderTreeProfiles,
} from '@/shared/utils/folder-tree-profiles';

describe('folder-tree-profiles', () => {
  it('returns defaults for invalid json', () => {
    const parsed = parseFolderTreeProfiles('{bad-json');

    expect(parsed.notes.placeholders.preset).toBe('sublime');
    expect(parsed.image_studio.nesting.allowRootFileDrop).toBe(true);
  });

  it('merges partial profile payload with defaults', () => {
    const parsed = parseFolderTreeProfiles(
      JSON.stringify({
        notes: {
          placeholders: {
            preset: 'vivid',
            rootDropLabel: 'Drop Here',
            inlineDropLabel: 'Move item',
          },
          nesting: {
            allowRootFileDrop: false,
            fileKindsAllowedAsChildren: ['note', 'task'],
          },
        },
      })
    );

    expect(parsed.notes.placeholders.preset).toBe('vivid');
    expect(parsed.notes.placeholders.rootDropLabel).toBe('Drop Here');
    expect(parsed.notes.nesting.allowRootFileDrop).toBe(false);
    expect(parsed.notes.nesting.allowFolderToFolder).toBe(true);
    expect(parsed.notes.nesting.fileKindsAllowedAsChildren).toEqual(['note', 'task']);
  });

  it('enforces root and folder nesting constraints', () => {
    const defaults = createDefaultFolderTreeProfiles();
    const categoryProfile = defaults.product_categories;

    expect(
      canNestTreeNode({
        profile: categoryProfile,
        nodeType: 'file',
        nodeKind: 'card',
        targetIsRoot: true,
      })
    ).toBe(false);

    expect(
      canNestTreeNode({
        profile: categoryProfile,
        nodeType: 'folder',
        nodeKind: 'category',
        targetFolderKind: 'category',
      })
    ).toBe(true);

    expect(
      canNestTreeNode({
        profile: categoryProfile,
        nodeType: 'folder',
        nodeKind: 'folder',
        targetFolderKind: 'category',
      })
    ).toBe(false);
  });

  it('returns class presets', () => {
    expect(getFolderTreePlaceholderClasses('classic').rootIdle).toContain('border-sky-500');
    expect(getFolderTreePlaceholderClasses('sublime').badgeActive).toContain('text-sky-100');
    expect(getFolderTreePlaceholderClasses('vivid').lineActive).toContain('bg-fuchsia');
  });
});
