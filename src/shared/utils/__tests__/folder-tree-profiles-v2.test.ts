import { describe, expect, it } from 'vitest';

import {
  canNestTreeNodeV2,
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfileV2Strict,
  resolveFolderTreeIconV2,
  resolveFolderTreeKeyboardConfig,
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';

describe('folder-tree-profiles-v2', () => {
  it('rejects invalid profile payloads in strict mode', () => {
    expect(() =>
      parseFolderTreeProfileV2Strict({ legacy: true }, defaultFolderTreeProfilesV2.notes)
    ).toThrow();
  });

  it('normalizes nesting kinds to lowercase and applies them in canNest rules', () => {
    const profile = parseFolderTreeProfileV2Strict(
      {
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
      defaultFolderTreeProfilesV2.notes
    );
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

  it('JSON without optional capability fields parses to undefined capability sections', () => {
    const profile = parseFolderTreeProfileV2Strict(
      {
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
        nesting: { defaultAllow: false, blockedTargetKinds: [], rules: [] },
        interactions: { selectionBehavior: 'click_away' },
      },
      defaultFolderTreeProfilesV2.notes
    );

    expect(profile.badges).toBeUndefined();
    expect(profile.keyboard).toBeUndefined();
    expect(profile.multiSelect).toBeUndefined();
    expect(profile.search).toBeUndefined();
    expect(profile.statusIcons).toBeUndefined();
  });

  it('roundtrips capability sections through strict profile parsing', () => {
    const profile = parseFolderTreeProfileV2Strict(
      {
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
        nesting: { defaultAllow: false, blockedTargetKinds: [], rules: [] },
        interactions: { selectionBehavior: 'click_away' },
        keyboard: { enabled: true, arrowNavigation: true, enterToRename: false, deleteKey: true },
        multiSelect: { enabled: true, ctrlClick: true, shiftClick: false, selectAll: true },
        search: {
          enabled: true,
          debounceMs: 150,
          filterMode: 'filter_tree',
          matchFields: ['name', 'path'],
          minQueryLength: 2,
        },
        statusIcons: { loading: 'Loader', error: 'AlertCircle', success: 'CheckCircle' },
        badges: { field: 'children_count', position: 'trailing', style: 'count' },
      },
      defaultFolderTreeProfilesV2.notes
    );
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

  it('resolves capability defaults when optional sections are unset', () => {
    const profile = parseFolderTreeProfileV2Strict(
      {
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
          blockedTargetKinds: [],
          rules: [],
        },
        interactions: {
          selectionBehavior: 'click_away',
        },
      },
      defaultFolderTreeProfilesV2.notes
    );

    expect(resolveFolderTreeKeyboardConfig(profile)).toEqual({
      enabled: true,
      arrowNavigation: true,
      enterToRename: true,
      deleteKey: false,
    });
    expect(resolveFolderTreeMultiSelectConfig(profile)).toEqual({
      enabled: false,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    });
    expect(resolveFolderTreeSearchConfig(profile)).toEqual({
      enabled: false,
      debounceMs: 200,
      filterMode: 'highlight',
      matchFields: ['name'],
      minQueryLength: 1,
    });
  });

  it('inherits fallback search config when payload omits search section for case resolver', () => {
    const { search: _ignored, ...candidateWithoutSearch } =
      defaultFolderTreeProfilesV2.case_resolver;
    const profile = parseFolderTreeProfileV2Strict(
      candidateWithoutSearch,
      defaultFolderTreeProfilesV2.case_resolver
    );

    expect(profile.search).toEqual(defaultFolderTreeProfilesV2.case_resolver.search);
    expect(resolveFolderTreeSearchConfig(profile)).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
  });

  it('merges partial search overrides with fallback instance defaults', () => {
    const { search: _ignored, ...candidateWithoutSearch } =
      defaultFolderTreeProfilesV2.case_resolver;
    const profile = parseFolderTreeProfileV2Strict(
      {
        ...candidateWithoutSearch,
        search: {
          debounceMs: 400,
          minQueryLength: 3,
        },
      },
      defaultFolderTreeProfilesV2.case_resolver
    );

    expect(profile.search).toEqual({
      enabled: true,
      debounceMs: 400,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 3,
    });
    expect(resolveFolderTreeSearchConfig(profile)).toEqual({
      enabled: true,
      debounceMs: 400,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 3,
    });
  });

  it('keeps explicit capability overrides in resolved configs', () => {
    const profile = parseFolderTreeProfileV2Strict(
      {
        ...defaultFolderTreeProfilesV2.notes,
        keyboard: {
          enabled: false,
          arrowNavigation: false,
          enterToRename: false,
          deleteKey: true,
        },
        multiSelect: {
          enabled: true,
          ctrlClick: false,
          shiftClick: false,
          selectAll: false,
        },
        search: {
          enabled: true,
          debounceMs: 150,
          filterMode: 'filter_tree',
          matchFields: ['name', 'metadata'],
          minQueryLength: 2,
        },
      },
      defaultFolderTreeProfilesV2.notes
    );

    expect(resolveFolderTreeKeyboardConfig(profile)).toEqual({
      enabled: false,
      arrowNavigation: false,
      enterToRename: false,
      deleteKey: true,
    });
    expect(resolveFolderTreeMultiSelectConfig(profile)).toEqual({
      enabled: true,
      ctrlClick: false,
      shiftClick: false,
      selectAll: false,
    });
    expect(resolveFolderTreeSearchConfig(profile)).toEqual({
      enabled: true,
      debounceMs: 150,
      filterMode: 'filter_tree',
      matchFields: ['name', 'metadata'],
      minQueryLength: 2,
    });
  });

  it('ships case-resolver search defaults for all active case-resolver tree instances', () => {
    expect(defaultFolderTreeProfilesV2.case_resolver.search).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
    expect(defaultFolderTreeProfilesV2.case_resolver_case_hierarchy.search).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
    expect(defaultFolderTreeProfilesV2.case_resolver_document_relations.search).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
    expect(defaultFolderTreeProfilesV2.case_resolver_nodefile_relations.search).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
    expect(defaultFolderTreeProfilesV2.case_resolver_scanfile_relations.search).toEqual({
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    });
  });

  it('rejects unknown statusIcons values in strict mode', () => {
    expect(() =>
      parseFolderTreeProfileV2Strict(
        {
          ...defaultFolderTreeProfilesV2.notes,
          statusIcons: {
            invalid_status: 'SomeIcon',
            loading: 'Loader2',
          } as Record<string, string>,
        },
        defaultFolderTreeProfilesV2.notes
      )
    ).toThrow();
  });
});
