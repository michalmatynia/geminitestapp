/* eslint-disable max-lines */

import { caseResolverProfiles } from './defaults-case-resolver';
import { imageStudioProfiles } from './defaults-image-studio';
import { type FolderTreeProfilesV2Map, type FolderTreeProfileV2 } from './types';

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
  ai_paths: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop into group',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileCode2',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        path: 'FileCode2',
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
          childKinds: ['path'],
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
          childKinds: ['path'],
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

  image_studio: imageStudioProfiles['image_studio'] as FolderTreeProfileV2,
  case_resolver: caseResolverProfiles['case_resolver'] as FolderTreeProfileV2,
  case_resolver_case_hierarchy: caseResolverProfiles['case_resolver_case_hierarchy'] as FolderTreeProfileV2,
  case_resolver_document_relations: caseResolverProfiles['case_resolver_document_relations'] as FolderTreeProfileV2,
  case_resolver_nodefile_relations: caseResolverProfiles['case_resolver_nodefile_relations'] as FolderTreeProfileV2,
  case_resolver_scanfile_relations: caseResolverProfiles['case_resolver_scanfile_relations'] as FolderTreeProfileV2,

  product_categories: {
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
      defaultAllow: true,
      blockedTargetKinds: [],
      rules: [],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  cms_page_builder: {
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
      defaultAllow: true,
      blockedTargetKinds: [],
      rules: [],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  filemaker_organizations: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to organization group',
    },
    icons: {
      slots: {
        folderClosed: 'folder',
        folderOpen: 'folder-open',
        file: 'building-2',
        root: 'folder',
        dragHandle: 'grip-vertical',
      },
      byKind: {
        filemaker_organization: 'building-2',
        filemaker_organization_group: 'folder',
      },
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
  filemaker_persons: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to person group',
    },
    icons: {
      slots: {
        folderClosed: 'folder',
        folderOpen: 'folder-open',
        file: 'user',
        root: 'folder',
        dragHandle: 'grip-vertical',
      },
      byKind: {
        filemaker_person: 'user',
        filemaker_person_group: 'folder',
      },
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
  filemaker_events: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to event',
    },
    icons: {
      slots: {
        folderClosed: 'folder',
        folderOpen: 'folder-open',
        file: 'calendar-days',
        root: 'folder',
        dragHandle: 'grip-vertical',
      },
      byKind: {
        filemaker_event: 'calendar-days',
      },
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
  filemaker_invoices: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to invoice',
    },
    icons: {
      slots: {
        folderClosed: 'folder',
        folderOpen: 'folder-open',
        file: 'file-text',
        root: 'folder',
        dragHandle: 'grip-vertical',
      },
      byKind: {
        filemaker_invoice: 'file-text',
      },
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
  filemaker_values: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to value',
    },
    icons: {
      slots: {
        folderClosed: 'folder',
        folderOpen: 'folder-open',
        file: 'tag',
        root: 'folder',
        dragHandle: 'grip-vertical',
      },
      byKind: {
        filemaker_value: 'tag',
      },
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
  filemaker_mail: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Mail',
      inlineDropLabel: 'Open',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['mail_attention'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['mail_attention_account'],
          targetType: 'folder',
          targetKinds: ['mail_attention'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_new_account'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account_compose'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account_sync'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account_status_toggle'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account_recent'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_account_settings'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['mail_folder'],
          targetType: 'folder',
          targetKinds: ['mail_account'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['mail_thread'],
          targetType: 'folder',
          targetKinds: ['mail_folder'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['mail_recent_thread'],
          targetType: 'folder',
          targetKinds: ['mail_account_recent'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  kangur_lessons_manager: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move lesson',
      inlineDropLabel: 'Drop lesson',
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
          childKinds: ['kangur-lesson'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  kangur_lessons_manager_catalog: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Browse lessons',
      inlineDropLabel: 'Drop lesson',
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
      rules: [],
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  kangur_test_suites_manager: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move test suite',
      inlineDropLabel: 'Drop test suite',
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
          childKinds: ['kangur-test-suite'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  kangur_test_suites_manager_catalog: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Browse test suites',
      inlineDropLabel: 'Drop test suite',
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
      rules: [],
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
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
  kangur_social_capture_browser: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Lessons',
      inlineDropLabel: 'Lessons',
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
      rules: [],
    },
    search: {
      enabled: true,
      debounceMs: 120,
      filterMode: 'filter_tree',
      matchFields: ['name', 'path', 'metadata'],
      minQueryLength: 1,
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
  playwright_step_seq_constructor: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to step',
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
          childKinds: ['playwright_step'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['playwright_action'],
          targetType: 'folder',
          targetKinds: ['playwright_step'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  playwright_step_seq_action_runs: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to run',
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
          childKinds: ['playwright_action_run_date'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['playwright_action_run'],
          targetType: 'folder',
          targetKinds: ['playwright_action_run_date'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['playwright_action_run_step'],
          targetType: 'folder',
          targetKinds: ['playwright_action_run'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['playwright_action_run_step'],
          targetType: 'folder',
          targetKinds: ['playwright_action_run_step'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['playwright_action_run_step'],
          targetType: 'folder',
          targetKinds: ['playwright_action_run'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
};
