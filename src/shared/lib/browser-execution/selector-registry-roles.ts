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

const PRICE_SIGNAL_PATTERN =
  /(?:[$€£¥]|(?:\b(?:usd|eur|sek|pln|cad|aud|nok|dkk|czk|huf|kr)\b)).*\d|\d(?:[\d\s.,])*(?:[$€£¥]|(?:\b(?:usd|eur|sek|pln|cad|aud|nok|dkk|czk|huf|kr)\b))/i;

export type SelectorRegistryProbeRoleInput = {
  tag: string;
  role: string | null;
  textPreview: string | null;
  attrs: Record<string, string>;
  classes: string[];
  repeatedSiblingCount?: number;
  childLinkCount?: number;
  childImageCount?: number;
};

export type SelectorRegistryProbeRoleClassification = {
  role: SelectorRegistryRole;
  confidence: number;
  evidence: string[];
  draftTargetHints: string[];
};

const collectProbeSearchText = ({
  tag,
  role,
  textPreview,
  attrs,
  classes,
}: SelectorRegistryProbeRoleInput): string =>
  [
    tag,
    role ?? '',
    textPreview ?? '',
    ...classes,
    ...Object.keys(attrs),
    ...Object.values(attrs),
  ]
    .map((value) => tokenize(value))
    .filter(Boolean)
    .join('_');

const getDraftTargetHintsForRole = (
  role: SelectorRegistryRole,
  input: SelectorRegistryProbeRoleInput
): string[] => {
  if (role === 'content_title') return ['name_en'];
  if (role === 'content_price') return ['price'];
  if (role === 'content_description') return ['description_en'];
  if (role === 'content_image') return ['imageLinks'];

  const href = input.attrs['href']?.trim() ?? '';
  if ((role === 'candidate_hint' || role === 'result_hint' || role === 'navigation') && href.length > 0) {
    return ['supplierLink'];
  }

  return [];
};

const buildProbeClassification = (
  role: SelectorRegistryRole,
  confidence: number,
  evidence: string[],
  input: SelectorRegistryProbeRoleInput
): SelectorRegistryProbeRoleClassification => ({
  role,
  confidence,
  evidence,
  draftTargetHints: getDraftTargetHintsForRole(role, input),
});

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

export const inferSelectorRegistryRoleFromProbe = (
  input: SelectorRegistryProbeRoleInput
): SelectorRegistryProbeRoleClassification => {
  const normalizedTag = tokenize(input.tag);
  const normalizedRole = tokenize(input.role);
  const normalizedText = (input.textPreview ?? '').trim();
  const searchText = collectProbeSearchText(input);
  const href = input.attrs['href']?.trim() ?? '';
  const type = tokenize(input.attrs['type']);
  const repeatedSiblingCount = input.repeatedSiblingCount ?? 0;
  const childLinkCount = input.childLinkCount ?? 0;
  const childImageCount = input.childImageCount ?? 0;

  if (
    normalizedTag === 'img' ||
    normalizedRole === 'img' ||
    includesAny(searchText, ['image', 'gallery', 'thumbnail', 'heroimage', 'hero_image']) ||
    typeof input.attrs['src'] === 'string'
  ) {
    return buildProbeClassification(
      'content_image',
      0.94,
      ['Image semantics detected in the element tag or attributes.'],
      input
    );
  }

  if (
    PRICE_SIGNAL_PATTERN.test(normalizedText) ||
    includesAny(searchText, ['price', 'amount', 'saleprice', 'sale_price', 'currentprice', 'current_price'])
  ) {
    return buildProbeClassification(
      'content_price',
      0.96,
      ['Visible text or attributes look like a price.'],
      input
    );
  }

  if (
    normalizedTag === 'input' ||
    normalizedTag === 'textarea' ||
    normalizedTag === 'select' ||
    includesAny(normalizedRole, ['textbox', 'combobox', 'checkbox', 'radio'])
  ) {
    return buildProbeClassification(
      type === 'file' ? 'upload_input' : 'input',
      0.92,
      ['Form control semantics detected.'],
      input
    );
  }

  if (
    normalizedTag === 'button' ||
    (normalizedTag === 'input' && includesAny(type, ['submit', 'button'])) ||
    (includesAny(normalizedRole, ['button']) &&
      includesAny(searchText, ['submit', 'save', 'publish', 'confirm', 'continue', 'login']))
  ) {
    return buildProbeClassification(
      includesAny(searchText, ['submit', 'save', 'publish', 'confirm']) ? 'submit' : 'trigger',
      0.9,
      ['Interactive button semantics detected.'],
      input
    );
  }

  if (
    normalizedTag === 'a' &&
    href.length > 0 &&
    includesAny(searchText, ['next', 'previous', 'prev', 'pagination', 'page']) &&
    repeatedSiblingCount <= 2
  ) {
    return buildProbeClassification(
      'navigation',
      0.88,
      ['Link text suggests page navigation.'],
      input
    );
  }

  if (
    normalizedTag === 'a' &&
    href.length > 0 &&
    (repeatedSiblingCount >= 2 || childImageCount > 0 || childLinkCount > 0)
  ) {
    return buildProbeClassification(
      'candidate_hint',
      0.87,
      ['Repeated link candidate looks like a product/result entry.'],
      input
    );
  }

  if (
    includesAny(normalizedTag, ['h1', 'h2', 'h3']) ||
    includesAny(searchText, ['title', 'productname', 'product_name', 'listingname', 'listing_name']) ||
    (normalizedText.length >= 4 && normalizedText.length <= 160 && repeatedSiblingCount <= 2)
  ) {
    return buildProbeClassification(
      'content_title',
      0.84,
      ['Heading or concise content text looks like a title.'],
      input
    );
  }

  if (
    normalizedText.length >= 120 ||
    includesAny(searchText, ['description', 'details', 'about', 'summary'])
  ) {
    return buildProbeClassification(
      'content_description',
      0.82,
      ['Long-form visible text looks descriptive.'],
      input
    );
  }

  if (
    repeatedSiblingCount >= 2 &&
    (childLinkCount > 0 || childImageCount > 0) &&
    includesAny(normalizedTag, ['article', 'li', 'div', 'section'])
  ) {
    return buildProbeClassification(
      'result_shell',
      0.78,
      ['Repeated container with links or images looks like a result shell.'],
      input
    );
  }

  if (normalizedText.length > 0) {
    return buildProbeClassification(
      'content',
      0.6,
      ['Visible content text is available but not strongly classified.'],
      input
    );
  }

  return buildProbeClassification('generic', 0.35, ['No strong semantic signal detected.'], input);
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
