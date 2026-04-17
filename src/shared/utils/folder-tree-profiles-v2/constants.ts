/* eslint-disable max-lines */
import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  type FolderTreePlaceholderPreset,
  type FolderTreePlaceholderStyle,
  type FolderTreePlaceholderEmphasis,
  type FolderTreeSelectionBehavior,
  type FolderTreeIconSlot,
  type FolderTreeInstance,
  type FolderTreeInstanceSettingsMeta,
  type FolderTreePersistFeedback,
  folderTreeInstanceValues,
} from './types';

export const folderTreePlaceholderPresetValues: FolderTreePlaceholderPreset[] = [
  'sublime',
  'classic',
  'vivid',
];

export const folderTreePlaceholderPresetOptions: Array<
  LabeledOptionDto<FolderTreePlaceholderPreset>
> = [
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
  ai_paths: {
    title: 'AI Paths',
    description: 'Controls grouped path navigation and drag/drop behavior in AI Paths canvas.',
    fileHint: 'Example: path',
    folderHint: 'Example: path_group',
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
  admin_menu_layout: {
    title: 'Admin Menu Layout',
    description: 'Controls hierarchy placeholders and drag/drop behavior in Admin Menu Builder.',
    fileHint: 'Not used (menu nodes are folder-type entries).',
    folderHint: 'Example: folder',
  },
  filemaker_mail: {
    title: 'Filemaker Mail',
    description: 'Controls the mailbox account and folder tree shown in Filemaker mail.',
    fileHint: 'Example: mail_attention_account, mail_thread, mail_recent_thread',
    folderHint:
      'Example: mail_attention, mail_new_account, mail_account, mail_account_compose, mail_account_sync, mail_account_status_toggle, mail_account_recent, mail_account_settings, mail_folder',
  },
  kangur_lessons_manager: {
    title: 'StudiQ Lessons Manager',
    description: 'Controls drag/drop ordering for StudiQ lessons in admin.',
    fileHint: 'Example: kangur-lesson',
    folderHint: 'Not used (flat list at root).',
  },
  kangur_lessons_manager_catalog: {
    title: 'StudiQ Lessons Manager Catalog',
    description: 'Controls grouped catalog tree behavior for StudiQ lessons in admin.',
    fileHint: 'Example: kangur-lesson',
    folderHint: 'Example: kangur-lesson-group, kangur-lesson-component-group',
  },
  kangur_test_suites_manager: {
    title: 'StudiQ Test Suites Manager',
    description: 'Controls drag/drop ordering for StudiQ test suites in admin.',
    fileHint: 'Example: kangur-test-suite',
    folderHint: 'Not used (flat list at root).',
  },
  kangur_test_suites_manager_catalog: {
    title: 'StudiQ Test Suites Manager Catalog',
    description: 'Controls grouped catalog tree behavior for StudiQ test suites in admin.',
    fileHint: 'Example: kangur-test-suite',
    folderHint: 'Example: kangur-test-suite-group',
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
  kangur_social_capture_browser: {
    title: 'StudiQ Social Capture Browser',
    description: 'Read-only tree for browsing lessons by section in the Social capture content browser.',
    fileHint: 'Example: social-capture-slide',
    folderHint: 'Example: social-capture-section, social-capture-subsection',
  },
  playwright_step_seq_constructor: {
    title: 'Playwright Step Sequencer',
    description: 'Controls action and step ordering in the Playwright Step Sequencer.',
    fileHint: 'Example: playwright_action',
    folderHint: 'Example: playwright_step',
  },
  playwright_step_seq_action_runs: {
    title: 'Playwright Action Runs',
    description: 'Controls the retained Step Sequencer action run history tree.',
    fileHint: 'Example: playwright_action_run_step',
    folderHint: 'Example: playwright_action_run',
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
  ai_paths: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'AI paths grouping updated.',
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
  admin_menu_layout: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Admin menu layout updated.',
  },
  filemaker_mail: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Mail tree updated.',
  },
  kangur_lessons_manager: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'StudiQ lessons reordered.',
  },
  kangur_lessons_manager_catalog: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'StudiQ lessons catalog updated.',
  },
  kangur_test_suites_manager: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'StudiQ test suites reordered.',
  },
  kangur_test_suites_manager_catalog: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'StudiQ test suites catalog updated.',
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
  kangur_social_capture_browser: {
    notifySuccess: false,
    notifyError: false,
    successMessage: 'Social capture browser updated.',
  },
  playwright_step_seq_constructor: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Step sequence updated.',
  },
  playwright_step_seq_action_runs: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Action run history tree updated.',
  },
};

export const folderTreeProfileV2Instances = [...folderTreeInstanceValues];
