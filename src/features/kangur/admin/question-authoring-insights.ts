import type {
  KangurQuestionIllustration,
  KangurTestChoice,
  KangurTestQuestion,
  KangurTestQuestionEditorial,
} from '@/shared/contracts/kangur-tests';
import type { QuestionFormData } from '../test-questions';

type QuestionAuthoringDraftLike = Pick<
  QuestionFormData,
  'prompt' | 'choices' | 'correctChoiceLabel' | 'illustration' | 'presentation' | 'editorial'
> & {
  explanation?: string;
};

export type QuestionAuthoringIssueSeverity = 'blocker' | 'warning';

export type QuestionAuthoringIssueCode =
  | 'missing_prompt'
  | 'not_enough_choices'
  | 'missing_choice_label'
  | 'duplicate_choice_labels'
  | 'empty_choice_text'
  | 'duplicate_choice_text'
  | 'missing_correct_choice'
  | 'split_layout_without_illustration'
  | 'legacy_fix_required'
  | 'missing_explanation'
  | 'visual_prompt_without_visuals'
  | 'choice_svg_without_note'
  | 'legacy_review_required';

export type QuestionAuthoringIssue = {
  code: QuestionAuthoringIssueCode;
  severity: QuestionAuthoringIssueSeverity;
  message: string;
};

export type QuestionAuthoringStatus = 'ready' | 'needs-review' | 'needs-fix';

export type QuestionAuthoringSummary = {
  status: QuestionAuthoringStatus;
  blockers: QuestionAuthoringIssue[];
  warnings: QuestionAuthoringIssue[];
  nextAction: string;
};

const VISUAL_PROMPT_PATTERN =
  /(patrz|rysun(?:ek|ku)?|obraz(?:ek|ku)?|diagram|schemat|widoczne|zobacz|plansz|tabel|figu|klo(?:cek|cki)|plytk|płytk)/i;

const normalizeChoiceText = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

const hasIllustrationContent = (illustration: KangurQuestionIllustration): boolean => {
  if (illustration.type === 'none') {
    return false;
  }

  if (illustration.type === 'single') {
    return illustration.svgContent.trim().length > 0;
  }

  return illustration.panels.some((panel) => panel.svgContent.trim().length > 0);
};

const hasChoiceSvg = (choices: KangurTestChoice[]): boolean =>
  choices.some((choice) => choice.svgContent?.trim().length > 0);

const hasChoiceSvgWithoutDescription = (choices: KangurTestChoice[]): boolean =>
  choices.some(
    (choice) =>
      choice.svgContent?.trim().length > 0 && (choice.description?.trim().length ?? 0) === 0
  );

const hasDuplicateNormalizedChoiceText = (choices: KangurTestChoice[]): boolean => {
  const seen = new Set<string>();
  for (const choice of choices) {
    const normalized = normalizeChoiceText(choice.text);
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }
  return false;
};

const hasDuplicateLabels = (choices: KangurTestChoice[]): boolean => {
  const seen = new Set<string>();
  for (const choice of choices) {
    const normalized = choice.label.trim().toUpperCase();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }
  return false;
};

const getLegacyFixMessage = (editorial: KangurTestQuestionEditorial): string =>
  editorial.note?.trim() || 'Legacy import contains inconsistent answer or explanation data.';

const buildIssues = (draft: QuestionAuthoringDraftLike): QuestionAuthoringIssue[] => {
  const issues: QuestionAuthoringIssue[] = [];
  const prompt = draft.prompt.trim();
  const explanation = (draft.explanation ?? '').trim();
  const hasVisualSupport =
    hasIllustrationContent(draft.illustration) || hasChoiceSvg(draft.choices);

  if (!prompt) {
    issues.push({
      code: 'missing_prompt',
      severity: 'blocker',
      message: 'Add the learner-facing question prompt.',
    });
  }

  if (draft.choices.length < 2) {
    issues.push({
      code: 'not_enough_choices',
      severity: 'blocker',
      message: 'Add at least two answer choices.',
    });
  }

  if (draft.choices.some((choice) => choice.label.trim().length === 0)) {
    issues.push({
      code: 'missing_choice_label',
      severity: 'blocker',
      message: 'Every answer choice needs a label.',
    });
  }

  if (hasDuplicateLabels(draft.choices)) {
    issues.push({
      code: 'duplicate_choice_labels',
      severity: 'blocker',
      message: 'Answer choice labels must stay unique.',
    });
  }

  if (draft.choices.some((choice) => choice.text.trim().length === 0)) {
    issues.push({
      code: 'empty_choice_text',
      severity: 'blocker',
      message: 'Every answer choice needs visible text.',
    });
  }

  if (hasDuplicateNormalizedChoiceText(draft.choices)) {
    issues.push({
      code: 'duplicate_choice_text',
      severity: 'blocker',
      message: 'Duplicate answer texts make the question ambiguous.',
    });
  }

  if (!draft.choices.some((choice) => choice.label === draft.correctChoiceLabel)) {
    issues.push({
      code: 'missing_correct_choice',
      severity: 'blocker',
      message: 'Mark one of the current choices as the correct answer.',
    });
  }

  if (
    draft.presentation.layout !== 'classic' &&
    !hasIllustrationContent(draft.illustration)
  ) {
    issues.push({
      code: 'split_layout_without_illustration',
      severity: 'blocker',
      message: 'Split layouts need an illustration before they can be saved.',
    });
  }

  if (draft.editorial.reviewStatus === 'needs-fix') {
    issues.push({
      code: 'legacy_fix_required',
      severity: 'blocker',
      message: getLegacyFixMessage(draft.editorial),
    });
  }

  if (!explanation) {
    issues.push({
      code: 'missing_explanation',
      severity: 'warning',
      message: 'Add an explanation so learners can review the reasoning after answering.',
    });
  }

  if (prompt && VISUAL_PROMPT_PATTERN.test(prompt) && !hasVisualSupport) {
    issues.push({
      code: 'visual_prompt_without_visuals',
      severity: 'warning',
      message: 'The prompt appears to reference a visual, but no SVG or illustration is attached yet.',
    });
  }

  if (hasChoiceSvgWithoutDescription(draft.choices)) {
    issues.push({
      code: 'choice_svg_without_note',
      severity: 'warning',
      message: 'Add a short note or visual description for SVG-backed choices.',
    });
  }

  if (draft.editorial.reviewStatus === 'needs-review') {
    issues.push({
      code: 'legacy_review_required',
      severity: 'warning',
      message:
        draft.editorial.note?.trim() ||
        'Legacy import should be reviewed before the question is published.',
    });
  }

  return issues;
};

export const getQuestionAuthoringSummary = (
  draft: QuestionAuthoringDraftLike | KangurTestQuestion
): QuestionAuthoringSummary => {
  const issues = buildIssues(draft);
  const blockers = issues.filter((issue) => issue.severity === 'blocker');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const status: QuestionAuthoringStatus =
    blockers.length > 0 ? 'needs-fix' : warnings.length > 0 ? 'needs-review' : 'ready';

  const nextAction =
    blockers[0]?.message ||
    warnings[0]?.message ||
    'Question is structurally ready for review and publishing.';

  return {
    status,
    blockers,
    warnings,
    nextAction,
  };
};
