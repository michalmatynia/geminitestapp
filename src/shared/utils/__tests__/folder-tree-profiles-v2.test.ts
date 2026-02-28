import { describe, expect, it } from 'vitest';

import {
  canNestTreeNodeV2,
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfilesV2,
  resolveFolderTreeIconV2,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('returns defaults when raw payload is invalid', () => {
    const parsed = parseFolderTreeProfilesV2('{"notes": ');
    expect(parsed.notes.version).toBe(2);
    expect(parsed.image_studio.version).toBe(2);
    expect(parsed.product_categories.version).toBe(2);
    expect(parsed.cms_page_builder.version).toBe(2);
    expect(parsed.case_resolver.version).toBe(2);
    expect(parsed.case_resolver_cases.version).toBe(2);
    expect(parsed.validator_list_tree.version).toBe(2);
    expect(parsed.validator_pattern_tree.version).toBe(2);
    expect(parsed.prompt_exploder_hierarchy.version).toBe(2);
    expect(parsed.brain_catalog_tree.version).toBe(2);
  });

  it('normalizes nesting kinds to lowercase and applies them in canNest rules', () => {
    const parsed = parseFolderTreeProfilesV2(
      JSON.stringify({
        notes: {
          version: 2,
          placeholders: {
            preset: 'sublime',
            style: 'ghost',
            emphasis: 'subtle',
            rootDropLabel: 'Drop to Root',
            inlineDropLabel: 'Drop here',
          },
          icons: {
            slots: {
              folderClosed: 'Folder',
              folderOpen: 'FolderOpen',
              file: 'FileText',
              root: 'Folder',
              dragHandle: 'GripVertical',
            },
            byKind: {},
          },
          nesting: {
            defaultAllow: false,
            blockedTargetKinds: ['ARCHIVE'],
            rules: [
              {
                childType: 'file',
                childKinds: ['NoTe'],
                targetType: 'folder',
                targetKinds: ['WORKSPACE'],
                allow: true,
              },
            ],
          },
          interactions: {
            selectionBehavior: 'click_away',
          },
        },
      })
    );

    const profile = parsed.notes;
    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'NOTE',
        targetType: 'folder',
        targetFolderKind: 'WORKSPACE',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'NOTE',
        targetType: 'folder',
        targetFolderKind: 'ARCHIVE',
      })
    ).toBe(false);
  });

  it('uses icon overrides by kind before slot fallback', () => {
    const profile = {
      ...defaultFolderTreeProfilesV2.image_studio,
      icons: {
        ...defaultFolderTreeProfilesV2.image_studio.icons,
        byKind: {
          ...defaultFolderTreeProfilesV2.image_studio.icons.byKind,
          card: 'Image',
        },
      },
    };

    expect(resolveFolderTreeIconV2(profile, 'file', 'card')).toBe('Image');
    expect(resolveFolderTreeIconV2(profile, 'file', 'unknown-kind')).toBe(profile.icons.slots.file);
  });

  it('allows case resolver folder and case file nesting on folder and root', () => {
    const profile = defaultFolderTreeProfilesV2.case_resolver;

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'folder',
        nodeKind: 'folder',
        targetType: 'folder',
        targetFolderKind: 'folder',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'case_file',
        targetType: 'folder',
        targetFolderKind: 'folder',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'folder',
        nodeKind: 'folder',
        targetType: 'root',
        targetFolderKind: 'root',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'case_file',
        targetType: 'root',
        targetFolderKind: 'root',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'node_file',
        targetType: 'folder',
        targetFolderKind: 'folder',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'asset_image',
        targetType: 'root',
        targetFolderKind: 'root',
      })
    ).toBe(true);
  });

  it('keeps validator list tree flat at root', () => {
    const profile = defaultFolderTreeProfilesV2.validator_list_tree;

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'validator-list',
        targetType: 'root',
        targetFolderKind: 'root',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'validator-list',
        targetType: 'folder',
        targetFolderKind: 'sequence-group',
      })
    ).toBe(false);
  });
});
