import { describe, expect, it } from 'vitest';

import {
  canNestTreeNodeV2,
  createDefaultFolderTreeProfilesV2,
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfileV2Strict,
  resolveFolderTreeIconV2,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('rejects invalid profiles in strict mode', () => {
    expect(() =>
      parseFolderTreeProfileV2Strict(
        { broken: true },
        defaultFolderTreeProfilesV2.notes
      )
    ).toThrow();
  });

  it('ships native v2 defaults for every tree instance', () => {
    expect(defaultFolderTreeProfilesV2.notes.version).toBe(2);
    expect(defaultFolderTreeProfilesV2.notes.placeholders.style).toBe('ghost');
    expect(defaultFolderTreeProfilesV2.product_categories.placeholders.preset).toBe('sublime');
    expect(defaultFolderTreeProfilesV2.product_categories.icons.slots.file).toBe('FileText');
    expect(defaultFolderTreeProfilesV2.cms_page_builder.icons.slots.root).toBe('Folder');
    expect(
      defaultFolderTreeProfilesV2.image_studio.nesting.rules.some(
        (rule) => rule.targetType === 'root'
      )
    ).toBe(true);
  });

  it('merges partial v2 payload with defaults and normalizes kind icon keys', () => {
    const parsed = parseFolderTreeProfileV2Strict(
      {
        ...defaultFolderTreeProfilesV2.notes,
        placeholders: {
          ...defaultFolderTreeProfilesV2.notes.placeholders,
          style: 'pill',
          emphasis: 'bold',
        },
        icons: {
          ...defaultFolderTreeProfilesV2.notes.icons,
          byKind: {
            NOTE: 'FileCode',
          },
        },
        nesting: {
          ...defaultFolderTreeProfilesV2.notes.nesting,
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
      defaultFolderTreeProfilesV2.notes
    );

    expect(parsed.placeholders.style).toBe('pill');
    expect(parsed.placeholders.emphasis).toBe('bold');
    expect(resolveFolderTreeIconV2(parsed, 'file', 'note')).toBe('FileCode');
    expect(parsed.icons.slots.folderOpen).toBe('FolderOpen');
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
