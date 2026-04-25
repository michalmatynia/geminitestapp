import { type MasterTreeNodeType, type MasterTreeTargetType } from '../master-folder-tree-contract';

import type {
  FolderTreeBadgeSpec,
  FolderTreeIconSlot,
  FolderTreeKeyboardConfig,
  FolderTreeMultiSelectConfig,
  FolderTreeNestingRuleV2,
  FolderTreePlaceholderEmphasis,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreeProfileV2,
  FolderTreeSearchConfig,
  FolderTreeSelectionBehavior,
  MasterTreeNodeStatus,
} from '../../contracts/master-folder-tree';

export type {
  FolderTreeBadgeSpec,
  FolderTreeIconSlot,
  FolderTreeKeyboardConfig,
  FolderTreeMultiSelectConfig,
  FolderTreeNestingRuleV2,
  FolderTreePlaceholderEmphasis,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreeProfileV2,
  FolderTreeSearchConfig,
  FolderTreeSelectionBehavior,
  MasterTreeNodeStatus,
};

export const folderTreeInstanceValues = [
  'notes',
  'ai_paths',
  'image_studio',
  'product_categories',
  'cms_page_builder',
  'case_resolver',
  'case_resolver_case_hierarchy',
  'case_resolver_document_relations',
  'case_resolver_nodefile_relations',
  'case_resolver_scanfile_relations',
  'validator_list_tree',
  'validator_pattern_tree',
  'prompt_exploder_segments',
  'prompt_exploder_hierarchy',
  'admin_menu_layout',
  'filemaker_mail',
  'filemaker_organizations',
  'filemaker_persons',
  'filemaker_values',
  'kangur_lessons_manager',
  'kangur_lessons_manager_catalog',
  'kangur_test_suites_manager',
  'kangur_test_suites_manager_catalog',
  'brain_catalog_tree',
  'brain_routing_tree',
  'kangur_social_capture_browser',
  'playwright_step_seq_constructor',
  'playwright_step_seq_action_runs',
] as const;

export type FolderTreeInstance = (typeof folderTreeInstanceValues)[number];

export type FolderTreePlaceholderClassSet = {
  rootIdle: string;
  rootActive: string;
  lineIdle: string;
  lineActive: string;
  badgeIdle: string;
  badgeActive: string;
};

export type FolderTreeProfilesV2Map = Record<FolderTreeInstance, FolderTreeProfileV2>;

export type FolderTreeInstanceSettingsMeta = {
  title: string;
  description: string;
  fileHint: string;
  folderHint: string;
};

export type FolderTreePersistFeedback = {
  notifySuccess: boolean;
  notifyError: boolean;
  successMessage: string;
};

export type CanNestTreeNodeV2Input = {
  profile: FolderTreeProfileV2;
  nodeType: MasterTreeNodeType;
  nodeKind?: string | null;
  targetType: MasterTreeTargetType;
  targetFolderKind?: string | null;
};
