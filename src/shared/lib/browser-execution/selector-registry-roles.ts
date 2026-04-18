import type {
  SelectorRegistryEntry,
  SelectorRegistryKind,
  SelectorRegistryNamespace,
  SelectorRegistryRole,
} from '@/shared/contracts/integrations/selector-registry';
import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';

const ROLE_LABELS: Record<SelectorRegistryRole, string> = {
  generic: 'Generic',
  input: 'Input',
  upload_input: 'Upload input',
  trigger: 'Trigger',
  option: 'Option',
  submit: 'Submit',
  ready_signal: 'Ready signal',
  result_hint: 'Result hint',
  result_shell: 'Result shell',
  candidate_hint: 'Candidate hint',
  overlay_accept: 'Overlay accept',
  overlay_dismiss: 'Overlay dismiss',
  navigation: 'Navigation',
  content: 'Content',
  content_title: 'Title content',
  content_price: 'Price content',
  content_description: 'Description content',
  content_image: 'Image content',
  feedback: 'Feedback',
  barrier: 'Barrier',
  barrier_title: 'Barrier title',
  text_hint: 'Text hint',
  negative_text_hint: 'Negative text hint',
  pattern: 'Pattern',
  path: 'Path',
  label: 'Label',
};

const tokenize = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase();
};

const includesAny = (value: string, needles: readonly string[]): boolean =>
  needles.some((needle) => value.includes(needle));

const inferRoleFromHintKey = (normalizedKey: string): SelectorRegistryRole => {
  if (
    includesAny(normalizedKey, [
      'captcha',
      'verification',
      'auth_error',
      'login_hint',
      'login_text',
      'block_hint',
      'barrier',
    ])
  ) {
    return 'barrier';
  }
  if (includesAny(normalizedKey, ['reject', 'decline', 'cancel'])) {
    return 'negative_text_hint';
  }
  if (
    includesAny(normalizedKey, [
      'error',
      'required',
      'pending',
      'progress',
      'saving',
      'saved',
      'validation',
      'notification',
      'wishlist',
      'autofill',
    ])
  ) {
    return 'feedback';
  }
  return 'text_hint';
};

const inferRoleFromLabelKey = (normalizedKey: string): SelectorRegistryRole => {
  if (includesAny(normalizedKey, ['dismiss', 'close', 'cancel'])) {
    return 'overlay_dismiss';
  }
  if (includesAny(normalizedKey, ['submit', 'save', 'publish', 'login_button'])) {
    return 'submit';
  }
  if (
    includesAny(normalizedKey, ['option', 'format', 'condition', 'department', 'delivery', 'shipping'])
  ) {
    return 'option';
  }
  if (
    includesAny(normalizedKey, [
      'trigger',
      'edit_listing',
      'create_listing',
      'continue',
      'tab',
      'offer_shipping',
      'offer_pickup',
    ])
  ) {
    return 'trigger';
  }
  return 'label';
};

const inferRoleFromSelectorKey = (normalizedKey: string): SelectorRegistryRole => {
  if (includesAny(normalizedKey, ['file_input', 'fileinputs', 'image_input'])) {
    return 'upload_input';
  }
  if (includesAny(normalizedKey, ['candidate_hint', 'candidatehints', 'resultlink'])) {
    return 'candidate_hint';
  }
  if (includesAny(normalizedKey, ['result_shell', 'resultshell'])) {
    return 'result_shell';
  }
  if (includesAny(normalizedKey, ['result_hint', 'resulthint'])) {
    return 'result_hint';
  }
  if (includesAny(normalizedKey, ['ready', 'content_ready', 'success', 'state_selector'])) {
    return 'ready_signal';
  }
  if (includesAny(normalizedKey, ['cookie_accept', 'acceptcontrols'])) {
    return 'overlay_accept';
  }
  if (
    includesAny(normalizedKey, [
      'dismiss',
      'close',
      'remove',
      'reject',
      'cancel',
      'error_close',
    ])
  ) {
    return 'overlay_dismiss';
  }
  if (includesAny(normalizedKey, ['title'])) {
    return 'content_title';
  }
  if (includesAny(normalizedKey, ['price'])) {
    return 'content_price';
  }
  if (includesAny(normalizedKey, ['description'])) {
    return 'content_description';
  }
  if (includesAny(normalizedKey, ['heroimage', 'hero_image', 'preview', 'image'])) {
    return 'content_image';
  }
  if (
    includesAny(normalizedKey, [
      'entry_trigger',
      'trigger',
      'open',
      'continue',
      'menu',
      'autofill_selector',
      'proceed',
    ])
  ) {
    return 'trigger';
  }
  if (includesAny(normalizedKey, ['submit', 'publish', 'save', 'login_button'])) {
    return 'submit';
  }
  if (includesAny(normalizedKey, ['input', 'username', 'password', 'search_selector'])) {
    return 'input';
  }
  if (
    includesAny(normalizedKey, [
      'progress',
      'pending',
      'error',
      'validation',
      'notification',
      'autofill',
      'draft_saved',
      'draft_saving',
      'required_hint',
    ])
  ) {
    return 'feedback';
  }
  if (includesAny(normalizedKey, ['hard_blocking', 'soft_blocking', 'login_form', 'auth_error'])) {
    return 'barrier';
  }
  if (includesAny(normalizedKey, ['product_content', 'supplier_ready', 'content'])) {
    return 'content';
  }
  return 'generic';
};

export const inferSelectorRegistryRole = (input: {
  namespace?: SelectorRegistryNamespace | null;
  key: string;
  kind: SelectorRegistryKind;
  group?: string | null;
}): SelectorRegistryRole => {
  const normalizedKey = tokenize(input.key);
  const normalizedGroup = tokenize(input.group);
  const combined = [normalizedKey, normalizedGroup].filter(Boolean).join('_');

  if (input.kind === 'pattern') {
    return 'pattern';
  }
  if (input.kind === 'paths') {
    return 'path';
  }
  if (input.kind === 'labels') {
    return inferRoleFromLabelKey(combined);
  }
  if (input.kind === 'text_hint' || input.kind === 'hints') {
    return inferRoleFromHintKey(combined);
  }

  return inferRoleFromSelectorKey(combined);
};

export const formatSelectorRegistryRoleLabel = (
  role: SelectorRegistryRole | null | undefined
): string | null => {
  if (!role) {
    return null;
  }
  return ROLE_LABELS[role] ?? null;
};

export const getExpectedSelectorRolesForBindingField = (
  field: string | null | undefined
): SelectorRegistryRole[] => {
  const normalizedField = tokenize(field);
  if (!normalizedField) {
    return [];
  }

  if (includesAny(normalizedField, ['fileinput', 'file_input'])) {
    return ['upload_input'];
  }
  if (includesAny(normalizedField, ['entrytrigger', 'entry_trigger'])) {
    return ['trigger'];
  }
  if (includesAny(normalizedField, ['uploadtab', 'upload_tab'])) {
    return ['trigger', 'navigation'];
  }
  if (includesAny(normalizedField, ['submit'])) {
    return ['submit', 'trigger'];
  }
  if (includesAny(normalizedField, ['accept'])) {
    return ['overlay_accept'];
  }
  if (includesAny(normalizedField, ['dismiss', 'close'])) {
    return ['overlay_dismiss'];
  }
  if (includesAny(normalizedField, ['proceed'])) {
    return ['navigation', 'trigger'];
  }
  if (includesAny(normalizedField, ['resulthint'])) {
    return ['result_hint'];
  }
  if (includesAny(normalizedField, ['resultshell'])) {
    return ['result_shell'];
  }
  if (includesAny(normalizedField, ['candidatehint'])) {
    return ['candidate_hint'];
  }
  if (includesAny(normalizedField, ['readysignal', 'readysignals'])) {
    return ['ready_signal'];
  }
  if (includesAny(normalizedField, ['processing'])) {
    return ['feedback', 'ready_signal'];
  }
  if (includesAny(normalizedField, ['title'])) {
    return ['content_title', 'content'];
  }
  if (includesAny(normalizedField, ['price'])) {
    return ['content_price', 'content'];
  }
  if (includesAny(normalizedField, ['description'])) {
    return ['content_description', 'content'];
  }
  if (includesAny(normalizedField, ['heroimage', 'image'])) {
    return ['content_image', 'content'];
  }
  if (includesAny(normalizedField, ['input'])) {
    return ['input', 'upload_input'];
  }
  if (includesAny(normalizedField, ['hint'])) {
    return ['text_hint', 'feedback', 'barrier'];
  }

  return [];
};

export const getCompatibleSelectorRolesForStepField = (
  stepType: PlaywrightStepType,
  field: string = 'selector'
): SelectorRegistryRole[] => {
  if (field !== 'selector') {
    return getExpectedSelectorRolesForBindingField(field);
  }

  switch (stepType) {
    case 'fill':
    case 'select':
      return ['input', 'generic'];
    case 'check':
    case 'uncheck':
      return ['input', 'option', 'generic'];
    case 'upload_file':
      return ['upload_input', 'input'];
    case 'click':
      return [
        'trigger',
        'submit',
        'option',
        'overlay_accept',
        'overlay_dismiss',
        'navigation',
        'candidate_hint',
        'generic',
      ];
    case 'assert_text':
      return [
        'content',
        'content_title',
        'content_price',
        'content_description',
        'feedback',
        'barrier',
        'ready_signal',
        'result_shell',
        'result_hint',
        'generic',
      ];
    case 'hover':
    case 'wait_for_selector':
    case 'assert_visible':
    case 'scroll':
      return [
        'generic',
        'content',
        'content_title',
        'content_price',
        'content_description',
        'content_image',
        'ready_signal',
        'feedback',
        'barrier',
        'result_shell',
        'result_hint',
        'candidate_hint',
      ];
    default:
      return ['generic'];
  }
};

export const isSelectorRoleCompatibleWithStepField = (
  role: SelectorRegistryRole | null | undefined,
  stepType: PlaywrightStepType,
  field: string = 'selector'
): boolean => {
  if (!role) {
    return true;
  }

  const expectedRoles = getCompatibleSelectorRolesForStepField(stepType, field);
  return expectedRoles.length === 0 || expectedRoles.includes(role);
};

export const isSelectorRegistryEntryCompatibleWithStepField = (
  entry: Pick<SelectorRegistryEntry, 'role'>,
  stepType: PlaywrightStepType,
  field: string = 'selector'
): boolean => isSelectorRoleCompatibleWithStepField(entry.role, stepType, field);

const CAPTURE_COMPATIBLE_ROLES = new Set<SelectorRegistryRole>([
  'generic',
  'content',
  'content_title',
  'content_price',
  'content_description',
  'content_image',
  'ready_signal',
  'feedback',
  'result_shell',
  'result_hint',
]);

export const isSelectorRoleCompatibleWithCaptureTarget = (
  role: SelectorRegistryRole | null | undefined
): boolean => !role || CAPTURE_COMPATIBLE_ROLES.has(role);

export const getCaptureCompatibleSelectorRoles = (): SelectorRegistryRole[] => [
  'content',
  'content_title',
  'content_price',
  'content_description',
  'content_image',
  'ready_signal',
  'feedback',
  'generic',
];
