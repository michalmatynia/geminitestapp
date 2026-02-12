import { describe, expect, it } from 'vitest';

import { createDefaultFolderTreeProfiles } from '@/shared/utils/folder-tree-profiles';
import {
  canNestTreeNodeV2,
  createDefaultFolderTreeProfilesV2,
  parseFolderTreeProfilesV2,
  resolveFolderTreeIconV2,
  upgradeFolderTreeProfileV1ToV2,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('returns default v2 profiles for invalid json', () => {
    const parsed = parseFolderTreeProfilesV2('{broken-json');

    expect(parsed.notes.version).toBe(2);
    expect(parsed.notes.placeholders.style).toBe('ghost');
    expect(parsed.image_studio.nesting.rules.length).toBeGreaterThan(0);
  });

  it('upgrades v1 profile into v2 matrix and visual fields', () => {
    const v1 = createDefaultFolderTreeProfiles().notes;
    const upgraded = upgradeFolderTreeProfileV1ToV2(v1);

    expect(upgraded.version).toBe(2);
    expect(upgraded.placeholders.preset).toBe(v1.placeholders.preset);
    expect(upgraded.placeholders.rootDropLabel).toBe(v1.placeholders.rootDropLabel);
    expect(upgraded.icons.slots.folderClosed).toBe(v1.icons.folderClosed);
    expect(upgraded.nesting.rules.some((rule) => rule.targetType === 'root')).toBe(true);
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
