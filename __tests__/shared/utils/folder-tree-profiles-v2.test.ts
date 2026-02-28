import { describe, expect, it } from 'vitest';

import {
  canNestTreeNodeV2,
  createDefaultFolderTreeProfilesV2,
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfilesV2,
  resolveFolderTreeIconV2,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('returns default v2 profiles for invalid json', () => {
    const parsed = parseFolderTreeProfilesV2('{broken-json');

    expect(parsed.notes.version).toBe(2);
    expect(parsed.notes.placeholders.style).toBe('ghost');
    expect(parsed.image_studio.nesting.rules.length).toBeGreaterThan(0);
  });

  it('ships native v2 defaults for every tree instance', () => {
    expect(defaultFolderTreeProfilesV2.notes.version).toBe(2);
    expect(defaultFolderTreeProfilesV2.notes.placeholders.style).toBe('ghost');
    expect(defaultFolderTreeProfilesV2.product_categories.placeholders.preset).toBe('classic');
    expect(defaultFolderTreeProfilesV2.product_categories.icons.slots.file).toBeNull();
    expect(defaultFolderTreeProfilesV2.cms_page_builder.icons.slots.root).toBe('LayoutGrid');
    expect(
      defaultFolderTreeProfilesV2.image_studio.nesting.rules.some(
        (rule) => rule.targetType === 'root'
      )
    ).toBe(true);
  });

  it('merges partial v2 payload with defaults and normalizes kind icon keys', () => {
    const parsed = parseFolderTreeProfilesV2(
      JSON.stringify({
        notes: {
          placeholders: {
            style: 'pill',
            emphasis: 'bold',
          },
          icons: {
            byKind: {
              NOTE: 'FileCode',
            },
          },
          nesting: {
            defaultAllow: false,
            rules: [
              {
                childType: 'file',
                childKinds: ['note'],
                targetType: 'folder',
                targetKinds: ['folder'],
                allow: true,
              },
            ],
          },
        },
      })
    );

    expect(parsed.notes.placeholders.style).toBe('pill');
    expect(parsed.notes.placeholders.emphasis).toBe('bold');
    expect(resolveFolderTreeIconV2(parsed.notes, 'file', 'note')).toBe('FileCode');
    expect(parsed.notes.icons.slots.folderOpen).toBe('FolderOpen');
  });

  it('evaluates matrix rules with blocked target kinds and fallback default', () => {
    const defaults = createDefaultFolderTreeProfilesV2();
    const profile = {
      ...defaults.notes,
      nesting: {
        ...defaults.notes.nesting,
        defaultAllow: false,
        blockedTargetKinds: ['locked'],
        rules: [
          {
            childType: 'file' as const,
            childKinds: ['*'],
            targetType: 'folder' as const,
            targetKinds: ['*'],
            allow: true,
          },
          {
            childType: 'file' as const,
            childKinds: ['secret'],
            targetType: 'folder' as const,
            targetKinds: ['vault'],
            allow: false,
          },
        ],
      },
    };

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'note',
        targetType: 'folder',
        targetFolderKind: 'folder',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'secret',
        targetType: 'folder',
        targetFolderKind: 'vault',
      })
    ).toBe(false);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'note',
        targetType: 'folder',
        targetFolderKind: 'locked',
      })
    ).toBe(false);
  });
});
