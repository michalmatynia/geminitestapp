 
import { type FolderTreeProfileV2 } from '../../contracts/master-folder-tree';

export const caseResolverProfiles: Record<string, FolderTreeProfileV2> = {
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
};
