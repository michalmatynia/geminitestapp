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
    expect(parsed.case_resolver_document_relations.version).toBe(2);
    expect(parsed.case_resolver_nodefile_relations.version).toBe(2);
    expect(parsed.case_resolver_scanfile_relations.version).toBe(2);
    expect(parsed.validator_list_tree.version).toBe(2);
    expect(parsed.validator_pattern_tree.version).toBe(2);
    expect(parsed.prompt_exploder_segments.version).toBe(2);
    expect(parsed.prompt_exploder_hierarchy.version).toBe(2);
    expect(parsed.brain_catalog_tree.version).toBe(2);
    expect(parsed.brain_routing_tree.version).toBe(2);
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

  it('keeps prompt exploder segments flat at root', () => {
    const profile = defaultFolderTreeProfilesV2.prompt_exploder_segments;

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'prompt_segment',
        targetType: 'root',
        targetFolderKind: 'root',
      })
    ).toBe(true);

    expect(
      canNestTreeNodeV2({
        profile,
        nodeType: 'file',
        nodeKind: 'prompt_segment',
        targetType: 'folder',
        targetFolderKind: 'prompt_segment',
      })
    ).toBe(false);
  });

  it('old JSON without optional capability fields parses to undefined (backward compat)', () => {
    const parsed = parseFolderTreeProfilesV2(
      JSON.stringify({
        notes: {
          version: 2,
          placeholders: { preset: 'sublime', style: 'ghost', emphasis: 'subtle', rootDropLabel: 'Drop to Root', inlineDropLabel: 'Drop here' },
          icons: { slots: { folderClosed: 'Folder', folderOpen: 'FolderOpen', file: 'FileText', root: 'Folder', dragHandle: 'GripVertical' }, byKind: {} },
          nesting: { defaultAllow: false, blockedTargetKinds: [], rules: [] },
          interactions: { selectionBehavior: 'click_away' },
        },
      })
    );

    expect(parsed.notes.badges).toBeUndefined();
    expect(parsed.notes.keyboard).toBeUndefined();
    expect(parsed.notes.multiSelect).toBeUndefined();
    expect(parsed.notes.search).toBeUndefined();
    expect(parsed.notes.statusIcons).toBeUndefined();
  });

  it('roundtrips capability sections through parseFolderTreeProfilesV2', () => {
    const parsed = parseFolderTreeProfilesV2(
      JSON.stringify({
        notes: {
          version: 2,
          placeholders: { preset: 'sublime', style: 'ghost', emphasis: 'subtle', rootDropLabel: 'Drop to Root', inlineDropLabel: 'Drop here' },
          icons: { slots: { folderClosed: 'Folder', folderOpen: 'FolderOpen', file: 'FileText', root: 'Folder', dragHandle: 'GripVertical' }, byKind: {} },
          nesting: { defaultAllow: false, blockedTargetKinds: [], rules: [] },
          interactions: { selectionBehavior: 'click_away' },
          keyboard: { enabled: true, arrowNavigation: true, enterToRename: false, deleteKey: true },
          multiSelect: { enabled: true, ctrlClick: true, shiftClick: false, selectAll: true },
          search: { enabled: true, debounceMs: 150, filterMode: 'filter_tree', matchFields: ['name', 'path'], minQueryLength: 2 },
          statusIcons: { loading: 'Loader', error: 'AlertCircle', success: 'CheckCircle' },
          badges: { field: 'children_count', position: 'trailing', style: 'count' },
        },
      })
    );

    const profile = parsed.notes;
    expect(profile.keyboard?.enabled).toBe(true);
    expect(profile.keyboard?.enterToRename).toBe(false);
    expect(profile.keyboard?.deleteKey).toBe(true);
    expect(profile.multiSelect?.enabled).toBe(true);
    expect(profile.multiSelect?.shiftClick).toBe(false);
    expect(profile.search?.enabled).toBe(true);
    expect(profile.search?.debounceMs).toBe(150);
    expect(profile.search?.filterMode).toBe('filter_tree');
    expect(profile.search?.matchFields).toEqual(['name', 'path']);
    expect(profile.search?.minQueryLength).toBe(2);
    expect(profile.statusIcons?.loading).toBe('Loader');
    expect(profile.statusIcons?.error).toBe('AlertCircle');
    expect(profile.statusIcons?.success).toBe('CheckCircle');
    expect(profile.statusIcons?.warning).toBeUndefined();
    expect(profile.badges?.field).toBe('children_count');
    expect(profile.badges?.style).toBe('count');
  });

  it('unrecognized statusIcons values parse to undefined', () => {
    const parsed = parseFolderTreeProfilesV2(
      JSON.stringify({
        notes: {
          statusIcons: { invalid_status: 'SomeIcon', loading: 'Loader2' },
        },
      })
    );
    // Only known status keys survive
    expect(parsed.notes.statusIcons?.loading).toBe('Loader2');
    // Unknown keys are stripped by Zod schema
    expect((parsed.notes.statusIcons as Record<string, unknown>)?.['invalid_status']).toBeUndefined();
  });
});
