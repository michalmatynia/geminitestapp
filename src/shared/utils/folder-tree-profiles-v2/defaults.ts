import { FolderTreeProfilesV2Map } from './types';

export const defaultFolderTreeProfilesV2: FolderTreeProfilesV2Map = {
  notes: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to folder',
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
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['note'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['note'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  image_studio: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop card',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'LayoutGrid',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        card: 'LayoutGrid',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['card', 'generation', 'mask', 'variant', 'part', 'version', 'derived'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['card', 'generation', 'mask', 'variant', 'part', 'version', 'derived'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'toggle_only',
    },
  },
  product_categories: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to root category',
      inlineDropLabel: 'Drop category',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['category'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['*'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: false,
        },
        {
          childType: 'folder',
          childKinds: ['category'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['*'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: false,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  cms_page_builder: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Drop section',
      inlineDropLabel: 'Drop here',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'Box',
        root: 'LayoutGrid',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['zone', 'section'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['section', 'block'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['zone', 'section'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['section', 'block'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  case_resolver: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop case',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        case_file: 'FileText',
        node_file: 'FileCode2',
        asset_image: 'FileImage',
        asset_pdf: 'FileText',
        asset_file: 'FileText',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: [
            'case_file',
            'case_file_scan',
            'node_file',
            'asset_image',
            'asset_pdf',
            'asset_file',
          ],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: [
            'case_file',
            'case_file_scan',
            'node_file',
            'asset_image',
            'asset_pdf',
            'asset_file',
          ],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
  },
  case_resolver_case_hierarchy: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move case to root',
      inlineDropLabel: 'Drop case',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'Folder',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        case_entry: 'Folder',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['case_entry'],
          targetType: 'folder',
          targetKinds: ['case_entry'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['case_entry'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
  },
  case_resolver_document_relations: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Move relation to root',
      inlineDropLabel: 'Drop relation',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        relation_case: 'Folder',
        relation_folder: 'Folder',
        relation_file: 'FileText',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: false,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
  },
  case_resolver_nodefile_relations: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Move relation to root',
      inlineDropLabel: 'Drop relation',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        relation_case: 'Folder',
        relation_folder: 'Folder',
        relation_file: 'FileText',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: false,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
  },
  case_resolver_scanfile_relations: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Move relation to root',
      inlineDropLabel: 'Drop relation',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        relation_case: 'Folder',
        relation_folder: 'Folder',
        relation_file: 'FileText',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'folder',
          targetKinds: ['relation_case', 'relation_folder'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['relation_case', 'relation_folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['relation_file'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: false,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
  },
  validator_list_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: '',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['validator-list'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  validator_pattern_tree: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move to root',
      inlineDropLabel: 'Add to group',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['pattern'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['pattern'],
          targetType: 'folder',
          targetKinds: ['sequence-group'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['sequence-group'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  prompt_exploder_segments: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to Root',
      inlineDropLabel: 'Drop segment',
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
      rules: [
        {
          childType: 'file',
          childKinds: ['prompt_segment'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  prompt_exploder_hierarchy: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to Root',
      inlineDropLabel: 'Drop item',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  admin_menu_layout: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to Root',
      inlineDropLabel: 'Drop item',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  brain_catalog_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: '',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['brain-catalog-entry'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  brain_routing_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: 'Drop route',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['brain-routing-capability'],
          targetType: 'folder',
          targetKinds: ['brain-routing-feature'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['brain-routing-feature'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
};
