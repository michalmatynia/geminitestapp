import type {
  KangurQuestionIllustration,
  KangurTestChoice,
  KangurTestQuestion,
  KangurTestQuestionEditorial,
  KangurTestQuestionWorkflowStatus,
} from '@/features/kangur/shared/contracts/kangur-tests';

import type { KangurAdminLocaleDto } from './kangur-admin-locale';
import { resolveKangurAdminLocale } from './kangur-admin-locale';
import type { QuestionFormData } from '../test-suites/questions';

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
  | 'legacy_review_required'
  | 'ready_workflow_requires_clean_review'
  | 'published_workflow_requires_clean_review';

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
  workflowStatus: KangurTestQuestionWorkflowStatus;
};

const QUESTION_AUTHORING_MESSAGES: Record<
  KangurAdminLocaleDto,
  {
    workflowLabels: Record<KangurTestQuestionWorkflowStatus, string>;
    issues: Record<QuestionAuthoringIssueCode, string>;
    publishedClean: string;
    readyToPublish: string;
    savedDraft: string;
  }
> = {
  en: {
    workflowLabels: {
      draft: 'Draft',
      ready: 'Ready to publish',
      published: 'Published',
    },
    issues: {
      missing_prompt: 'Add the learner-facing question prompt.',
      not_enough_choices: 'Add at least two answer choices.',
      missing_choice_label: 'Every answer choice needs a label.',
      duplicate_choice_labels: 'Answer choice labels must stay unique.',
      empty_choice_text: 'Every answer choice needs visible text.',
      duplicate_choice_text: 'Duplicate answer texts make the question ambiguous.',
      missing_correct_choice: 'Mark one of the current choices as the correct answer.',
      split_layout_without_illustration: 'Split layouts need an illustration before they can be saved.',
      legacy_fix_required: 'Legacy import contains inconsistent answer or explanation data.',
      missing_explanation:
        'Add an explanation so learners can review the reasoning after answering.',
      visual_prompt_without_visuals:
        'The prompt appears to reference a visual, but no SVG or illustration is attached yet.',
      choice_svg_without_note: 'Add a short note or visual description for SVG-backed choices.',
      legacy_review_required:
        'Legacy import should be reviewed before the question is published.',
      ready_workflow_requires_clean_review:
        'Resolve review warnings before marking this question ready to publish.',
      published_workflow_requires_clean_review:
        'Resolve review warnings before publishing this question.',
    },
    publishedClean: 'Question is published and structurally clean.',
    readyToPublish: 'Question is ready to publish.',
    savedDraft: 'Question is saved as a draft. Mark it ready when review is complete.',
  },
  pl: {
    workflowLabels: {
      draft: 'Szkic',
      ready: 'Gotowe do publikacji',
      published: 'Opublikowane',
    },
    issues: {
      missing_prompt: 'Dodaj treść pytania widoczną dla ucznia.',
      not_enough_choices: 'Dodaj co najmniej dwie odpowiedzi.',
      missing_choice_label: 'Każda odpowiedź potrzebuje etykiety.',
      duplicate_choice_labels: 'Etykiety odpowiedzi muszą pozostać unikalne.',
      empty_choice_text: 'Każda odpowiedź potrzebuje widocznego tekstu.',
      duplicate_choice_text: 'Zduplikowane teksty odpowiedzi sprawiają, że pytanie jest niejednoznaczne.',
      missing_correct_choice: 'Oznacz jedną z obecnych odpowiedzi jako poprawną.',
      split_layout_without_illustration:
        'Układy split wymagają ilustracji, zanim będzie można je zapisać.',
      legacy_fix_required: 'Import legacy zawiera niespójne dane odpowiedzi lub wyjaśnienia.',
      missing_explanation:
        'Dodaj wyjaśnienie, żeby uczniowie mogli przejrzeć tok rozumowania po odpowiedzi.',
      visual_prompt_without_visuals:
        'Prompt wygląda na odwołujący się do elementu wizualnego, ale nie ma jeszcze dołączonego SVG ani ilustracji.',
      choice_svg_without_note:
        'Dodaj krótką notatkę lub opis wizualny dla odpowiedzi opartych na SVG.',
      legacy_review_required:
        'Import legacy powinien zostać sprawdzony przed publikacją pytania.',
      ready_workflow_requires_clean_review:
        'Rozwiąż uwagi z review, zanim oznaczysz to pytanie jako gotowe do publikacji.',
      published_workflow_requires_clean_review:
        'Rozwiąż uwagi z review, zanim opublikujesz to pytanie.',
    },
    publishedClean: 'Pytanie jest opublikowane i strukturalnie czyste.',
    readyToPublish: 'Pytanie jest gotowe do publikacji.',
    savedDraft:
      'Pytanie jest zapisane jako szkic. Oznacz je jako gotowe, gdy review będzie zakończone.',
  },
  uk: {
    workflowLabels: {
      draft: 'Чернетка',
      ready: 'Готово до публікації',
      published: 'Опубліковано',
    },
    issues: {
      missing_prompt: 'Додайте текст запитання для учня.',
      not_enough_choices: 'Додайте щонайменше два варіанти відповіді.',
      missing_choice_label: 'Кожен варіант відповіді повинен мати позначку.',
      duplicate_choice_labels: 'Позначки варіантів мають залишатися унікальними.',
      empty_choice_text: 'Кожен варіант відповіді повинен мати видимий текст.',
      duplicate_choice_text:
        'Дубльовані тексти відповідей роблять запитання неоднозначним.',
      missing_correct_choice: 'Позначте один із поточних варіантів як правильну відповідь.',
      split_layout_without_illustration:
        'Split-макети потребують ілюстрації, перш ніж їх можна буде зберегти.',
      legacy_fix_required: 'Legacy-імпорт містить неузгоджені дані відповіді або пояснення.',
      missing_explanation:
        'Додайте пояснення, щоб учні могли переглянути міркування після відповіді.',
      visual_prompt_without_visuals:
        'Схоже, prompt посилається на візуальний елемент, але SVG або ілюстрацію ще не додано.',
      choice_svg_without_note:
        'Додайте коротку нотатку або візуальний опис для варіантів на основі SVG.',
      legacy_review_required:
        'Legacy-імпорт потрібно перевірити перед публікацією запитання.',
      ready_workflow_requires_clean_review:
        'Приберіть попередження review, перш ніж позначати це запитання як готове до публікації.',
      published_workflow_requires_clean_review:
        'Приберіть попередження review, перш ніж публікувати це запитання.',
    },
    publishedClean: 'Запитання опубліковане й структурно чисте.',
    readyToPublish: 'Запитання готове до публікації.',
    savedDraft:
      'Запитання збережене як чернетка. Позначте його як готове, коли review буде завершено.',
  },
};

export const getQuestionWorkflowLabel = (
  workflowStatus: KangurTestQuestionWorkflowStatus,
  locale: string | null | undefined = 'en'
): string => {
  const resolvedLocale = resolveKangurAdminLocale(locale);

  return QUESTION_AUTHORING_MESSAGES[resolvedLocale].workflowLabels[workflowStatus];
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

const getLegacyFixMessage = (
  editorial: KangurTestQuestionEditorial,
  locale: KangurAdminLocaleDto
): string =>
  editorial.note?.trim() || QUESTION_AUTHORING_MESSAGES[locale].issues.legacy_fix_required;

const buildIssues = (
  draft: QuestionAuthoringDraftLike,
  locale: KangurAdminLocaleDto
): QuestionAuthoringIssue[] => {
  const issues: QuestionAuthoringIssue[] = [];
  const localizedMessages = QUESTION_AUTHORING_MESSAGES[locale].issues;
  const prompt = draft.prompt.trim();
  const explanation = (draft.explanation ?? '').trim();
  const hasVisualSupport =
    hasIllustrationContent(draft.illustration) || hasChoiceSvg(draft.choices);

  if (!prompt) {
    issues.push({
      code: 'missing_prompt',
      severity: 'blocker',
      message: localizedMessages.missing_prompt,
    });
  }

  if (draft.choices.length < 2) {
    issues.push({
      code: 'not_enough_choices',
      severity: 'blocker',
      message: localizedMessages.not_enough_choices,
    });
  }

  if (draft.choices.some((choice) => choice.label.trim().length === 0)) {
    issues.push({
      code: 'missing_choice_label',
      severity: 'blocker',
      message: localizedMessages.missing_choice_label,
    });
  }

  if (hasDuplicateLabels(draft.choices)) {
    issues.push({
      code: 'duplicate_choice_labels',
      severity: 'blocker',
      message: localizedMessages.duplicate_choice_labels,
    });
  }

  if (draft.choices.some((choice) => choice.text.trim().length === 0)) {
    issues.push({
      code: 'empty_choice_text',
      severity: 'blocker',
      message: localizedMessages.empty_choice_text,
    });
  }

  if (hasDuplicateNormalizedChoiceText(draft.choices)) {
    issues.push({
      code: 'duplicate_choice_text',
      severity: 'blocker',
      message: localizedMessages.duplicate_choice_text,
    });
  }

  if (!draft.choices.some((choice) => choice.label === draft.correctChoiceLabel)) {
    issues.push({
      code: 'missing_correct_choice',
      severity: 'blocker',
      message: localizedMessages.missing_correct_choice,
    });
  }

  if (
    draft.presentation.layout !== 'classic' &&
    !hasIllustrationContent(draft.illustration)
  ) {
    issues.push({
      code: 'split_layout_without_illustration',
      severity: 'blocker',
      message: localizedMessages.split_layout_without_illustration,
    });
  }

  if (draft.editorial.reviewStatus === 'needs-fix') {
    issues.push({
      code: 'legacy_fix_required',
      severity: 'blocker',
      message: getLegacyFixMessage(draft.editorial, locale),
    });
  }

  if (!explanation) {
    issues.push({
      code: 'missing_explanation',
      severity: 'warning',
      message: localizedMessages.missing_explanation,
    });
  }

  if (prompt && VISUAL_PROMPT_PATTERN.test(prompt) && !hasVisualSupport) {
    issues.push({
      code: 'visual_prompt_without_visuals',
      severity: 'warning',
      message: localizedMessages.visual_prompt_without_visuals,
    });
  }

  if (hasChoiceSvgWithoutDescription(draft.choices)) {
    issues.push({
      code: 'choice_svg_without_note',
      severity: 'warning',
      message: localizedMessages.choice_svg_without_note,
    });
  }

  if (draft.editorial.reviewStatus === 'needs-review') {
    issues.push({
      code: 'legacy_review_required',
      severity: 'warning',
      message:
        draft.editorial.note?.trim() ||
        localizedMessages.legacy_review_required,
    });
  }

  const hasWarnings = issues.some((issue) => issue.severity === 'warning');
  if (draft.editorial.workflowStatus === 'ready' && hasWarnings) {
    issues.push({
      code: 'ready_workflow_requires_clean_review',
      severity: 'blocker',
      message: localizedMessages.ready_workflow_requires_clean_review,
    });
  }

  if (draft.editorial.workflowStatus === 'published' && hasWarnings) {
    issues.push({
      code: 'published_workflow_requires_clean_review',
      severity: 'blocker',
      message: localizedMessages.published_workflow_requires_clean_review,
    });
  }

  return issues;
};

export const getQuestionAuthoringSummary = (
  draft: QuestionAuthoringDraftLike | KangurTestQuestion,
  locale: string | null | undefined = 'en'
): QuestionAuthoringSummary => {
  const resolvedLocale = resolveKangurAdminLocale(locale);
  const localizedMessages = QUESTION_AUTHORING_MESSAGES[resolvedLocale];
  const issues = buildIssues(draft, resolvedLocale);
  const blockers = issues.filter((issue) => issue.severity === 'blocker');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const status: QuestionAuthoringStatus =
    blockers.length > 0 ? 'needs-fix' : warnings.length > 0 ? 'needs-review' : 'ready';

  const nextAction =
    blockers[0]?.message ||
    warnings[0]?.message ||
    (draft.editorial.workflowStatus === 'published'
      ? localizedMessages.publishedClean
      : draft.editorial.workflowStatus === 'ready'
        ? localizedMessages.readyToPublish
        : localizedMessages.savedDraft);

  return {
    status,
    blockers,
    warnings,
    nextAction,
    workflowStatus: draft.editorial.workflowStatus,
  };
};
