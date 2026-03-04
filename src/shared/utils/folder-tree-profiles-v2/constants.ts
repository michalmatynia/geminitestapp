import {
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreePlaceholderEmphasis,
  FolderTreeSelectionBehavior,
  FolderTreeIconSlot,
  FolderTreeInstance,
  FolderTreeInstanceSettingsMeta,
  FolderTreePersistFeedback,
  folderTreeInstanceValues,
} from './types';

export const FOLDER_TREE_PROFILES_V2_SETTING_KEY = 'folder_tree_profiles_v2';

export const folderTreePlaceholderPresetValues: FolderTreePlaceholderPreset[] = [
  'sublime',
  'classic',
  'vivid',
];

export const folderTreePlaceholderPresetOptions: Array<{
  value: FolderTreePlaceholderPreset;
  label: string;
}> = [
  { value: 'sublime', label: 'Sublime' },
  { value: 'classic', label: 'Classic' },
  { value: 'vivid', label: 'Vivid' },
];

export const folderTreePlaceholderStyleValues: FolderTreePlaceholderStyle[] = [
  'line',
  'pill',
  'ghost',
];

export const folderTreePlaceholderEmphasisValues: FolderTreePlaceholderEmphasis[] = [
  'subtle',
  'balanced',
  'bold',
];

export const folderTreeSelectionBehaviorValues: FolderTreeSelectionBehavior[] = [
  'click_away',
  'toggle_only',
];

export const folderTreeIconSlotValues: FolderTreeIconSlot[] = [
  'folderClosed',
  'folderOpen',
  'file',
  'root',
  'dragHandle',
];

export const folderTreeSettingsMetaByInstance: Record<
  FolderTreeInstance,
  FolderTreeInstanceSettingsMeta
> = {
  notes: {
    title: 'Notes App',
    description: 'Controls the notes folder tree shown in the Notes workspace.',
    fileHint: 'Example: note',
    folderHint: 'Example: folder',
  },
  image_studio: {
    title: 'Image Studio',
    description: 'Controls folder/card nesting and placeholders in Image Studio.',
    fileHint: 'Example: card, generation, mask',
    folderHint: 'Example: folder',
  },
  product_categories: {
    title: 'Product Categories',
    description: 'Controls nesting behavior and visuals in Product Category tree.',
    fileHint: 'Usually empty for categories-only trees.',
    folderHint: 'Example: category',
  },
  cms_page_builder: {
    title: 'CMS Page Builder',
    description: 'Controls drop placeholders in the CMS structure tree.',
    fileHint: 'Example: section, block',
    folderHint: 'Example: zone, section',
  },
  case_resolver: {
    title: 'Case Resolver',
    description: 'Controls folder/case nesting and placeholders in Case Resolver.',
    fileHint: 'Example: case_file, node_file, asset_image, asset_pdf',
    folderHint: 'Example: folder',
  },
  case_resolver_case_hierarchy: {
    title: 'Case Resolver Cases',
    description: 'Controls hierarchy placeholders and drag/drop behavior on the Cases list page.',
    fileHint: 'Not used (case hierarchy nodes are folder-type entries).',
    folderHint: 'Example: case_entry',
  },
  case_resolver_document_relations: {
    title: 'Case Resolver Document Relations',
    description: 'Controls relation tree behavior in the Document editor relation browser.',
    fileHint: 'Example: relation_file',
    folderHint: 'Example: relation_case, relation_folder',
  },
  case_resolver_nodefile_relations: {
    title: 'Case Resolver Nodefile Relations',
    description: 'Controls relation tree behavior in the Nodefile document-to-canvas browser.',
    fileHint: 'Example: relation_file',
    folderHint: 'Example: relation_case, relation_folder',
  },
  case_resolver_scanfile_relations: {
    title: 'Case Resolver Scanfile Relations',
    description: 'Controls relation tree behavior in the Scanfile editor relation browser.',
    fileHint: 'Example: relation_file',
    folderHint: 'Example: relation_case, relation_folder',
  },
  validator_list_tree: {
    title: 'Validator Lists',
    description: 'Controls drag/drop behavior for validator list ordering in admin settings.',
    fileHint: 'Example: validator-list',
    folderHint: 'Not used (flat list at root).',
  },
  validator_pattern_tree: {
    title: 'Validator Patterns',
    description:
      'Controls pattern-to-group nesting and placeholder behavior in validator settings.',
    fileHint: 'Example: pattern',
    folderHint: 'Example: sequence-group',
  },
  prompt_exploder_segments: {
    title: 'Prompt Exploder Segments',
    description: 'Controls top-level segment ordering in Prompt Exploder.',
    fileHint: 'Example: prompt_segment',
    folderHint: 'Not used (segments remain flat at root).',
  },
  prompt_exploder_hierarchy: {
    title: 'Prompt Exploder Hierarchy',
    description: 'Controls hierarchy nesting and placeholders in Prompt Exploder tree editor.',
    fileHint: 'Not used (hierarchy items are folder-type entries).',
    folderHint: 'Example: folder',
  },
  brain_catalog_tree: {
    title: 'AI Brain Catalog',
    description: 'Controls drag/drop behavior for AI Brain catalog ordering.',
    fileHint: 'Example: brain-catalog-entry',
    folderHint: 'Not used (flat list at root).',
  },
  brain_routing_tree: {
    title: 'AI Brain Routing',
    description: 'Controls grouped routing list behavior for AI Brain capability routes.',
    fileHint: 'Example: brain-routing-capability',
    folderHint: 'Example: brain-routing-feature',
  },
};

export const folderTreePersistFeedbackByInstance: Record<
  FolderTreeInstance,
  FolderTreePersistFeedback
> = {
  notes: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Folder tree updated.',
  },
  image_studio: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Folder tree updated.',
  },
  product_categories: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Category tree updated.',
  },
  cms_page_builder: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Component tree updated.',
  },
  case_resolver: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Case resolver tree updated.',
  },
  case_resolver_case_hierarchy: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Case hierarchy updated.',
  },
  case_resolver_document_relations: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Document relation tree updated.',
  },
  case_resolver_nodefile_relations: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Nodefile relation tree updated.',
  },
  case_resolver_scanfile_relations: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Scanfile relation tree updated.',
  },
  validator_list_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Validation lists reordered.',
  },
  validator_pattern_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Validation patterns reordered.',
  },
  prompt_exploder_segments: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Segments reordered.',
  },
  prompt_exploder_hierarchy: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Hierarchy updated.',
  },
  brain_catalog_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Catalog updated.',
  },
  brain_routing_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Routing tree updated.',
  },
};

export const folderTreeProfileV2Instances = [...folderTreeInstanceValues];
