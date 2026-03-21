import type { IdLabelOption } from '@/shared/contracts';

import type { QuestionFormData } from '../test-questions';
import { resolveKangurAdminLocale } from './kangur-admin-locale';
import type { QuestionAuthoringIssue } from './question-authoring-insights';

export type QuestionAuthoringRepairId =
  | 'auto-label-choices'
  | 'set-first-choice-correct'
  | 'switch-layout-classic'
  | 'add-explanation-starter'
  | 'add-svg-choice-notes';

export type QuestionAuthoringRepairAction = IdLabelOption<QuestionAuthoringRepairId>;

const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

const uniqueRepairs = (
  repairs: QuestionAuthoringRepairAction[]
): QuestionAuthoringRepairAction[] => {
  const seen = new Set<QuestionAuthoringRepairId>();
  return repairs.filter((repair) => {
    if (seen.has(repair.id)) {
      return false;
    }
    seen.add(repair.id);
    return true;
  });
};

export const getQuestionAuthoringRepairActions = (
  issues: readonly QuestionAuthoringIssue[],
  locale: string | null | undefined = 'en'
): QuestionAuthoringRepairAction[] => {
  const resolvedLocale = resolveKangurAdminLocale(locale);
  const labelsByLocale = {
    en: {
      'auto-label-choices': 'Auto-label choices',
      'set-first-choice-correct': 'Use first choice as correct',
      'switch-layout-classic': 'Switch to classic layout',
      'add-explanation-starter': 'Add explanation starter',
      'add-svg-choice-notes': 'Add starter notes for SVG choices',
    },
    pl: {
      'auto-label-choices': 'Auto-etykietuj odpowiedzi',
      'set-first-choice-correct': 'Użyj pierwszej odpowiedzi jako poprawnej',
      'switch-layout-classic': 'Przełącz na klasyczny układ',
      'add-explanation-starter': 'Dodaj starter wyjaśnienia',
      'add-svg-choice-notes': 'Dodaj starter notatek dla odpowiedzi SVG',
    },
    uk: {
      'auto-label-choices': 'Автоматично позначити варіанти',
      'set-first-choice-correct': 'Використати перший варіант як правильний',
      'switch-layout-classic': 'Перемкнутися на класичний макет',
      'add-explanation-starter': 'Додати старт пояснення',
      'add-svg-choice-notes': 'Додати стартові нотатки для SVG-варіантів',
    },
  } as const;

  return uniqueRepairs(
    issues.flatMap<QuestionAuthoringRepairAction>((issue) => {
      switch (issue.code) {
        case 'missing_choice_label':
        case 'duplicate_choice_labels':
          return [
            {
              id: 'auto-label-choices',
              label: labelsByLocale[resolvedLocale]['auto-label-choices'],
            },
          ];
        case 'missing_correct_choice':
          return [
            {
              id: 'set-first-choice-correct',
              label: labelsByLocale[resolvedLocale]['set-first-choice-correct'],
            },
          ];
        case 'split_layout_without_illustration':
          return [
            {
              id: 'switch-layout-classic',
              label: labelsByLocale[resolvedLocale]['switch-layout-classic'],
            },
          ];
        case 'missing_explanation':
          return [
            {
              id: 'add-explanation-starter',
              label: labelsByLocale[resolvedLocale]['add-explanation-starter'],
            },
          ];
        case 'choice_svg_without_note':
          return [
            {
              id: 'add-svg-choice-notes',
              label: labelsByLocale[resolvedLocale]['add-svg-choice-notes'],
            },
          ];
        default:
          return [];
      }
    })
  );
};

export const applyQuestionAuthoringRepair = (
  formData: QuestionFormData,
  repairId: QuestionAuthoringRepairId,
  locale: string | null | undefined = 'en'
): QuestionFormData => {
  const resolvedLocale = resolveKangurAdminLocale(locale);

  switch (repairId) {
    case 'auto-label-choices': {
      const choices = formData.choices.map((choice, index) => ({
        ...choice,
        label: CHOICE_LABELS[index] ?? String.fromCharCode(65 + index),
      }));
      const oldCorrectIndex = formData.choices.findIndex(
        (choice) => choice.label === formData.correctChoiceLabel
      );
      return {
        ...formData,
        choices,
        correctChoiceLabel:
          oldCorrectIndex >= 0
            ? (choices[oldCorrectIndex]?.label ?? formData.correctChoiceLabel)
            : formData.correctChoiceLabel,
      };
    }
    case 'set-first-choice-correct':
      return {
        ...formData,
        correctChoiceLabel: formData.choices[0]?.label ?? '',
      };
    case 'switch-layout-classic':
      return {
        ...formData,
        presentation: {
          ...formData.presentation,
          layout: 'classic',
        },
      };
    case 'add-explanation-starter': {
      const correctChoice = formData.choices.find(
        (choice) => choice.label === formData.correctChoiceLabel
      );
      const explanation =
        correctChoice?.text.trim()
          ? resolvedLocale === 'uk'
            ? `Правильна відповідь: ${correctChoice.label}: ${correctChoice.text}. Додайте тут покрокове пояснення.`
            : resolvedLocale === 'pl'
              ? `Poprawna odpowiedź to ${correctChoice.label}: ${correctChoice.text}. Dodaj tutaj wypracowane uzasadnienie.`
              : `The correct answer is ${correctChoice.label}: ${correctChoice.text}. Add the worked reasoning here.`
          : resolvedLocale === 'uk'
            ? 'Поясніть, чому правильна відповідь працює і чому інші варіанти не підходять.'
            : resolvedLocale === 'pl'
              ? 'Wyjaśnij, dlaczego poprawna odpowiedź działa i dlaczego pozostałe opcje nie pasują.'
              : 'Explain why the correct answer works and why the other options do not.';
      return {
        ...formData,
        explanation,
      };
    }
    case 'add-svg-choice-notes':
      return {
        ...formData,
        choices: formData.choices.map((choice) =>
          choice.svgContent?.trim().length > 0 && (choice.description?.trim().length ?? 0) === 0
            ? {
              ...choice,
              description: choice.label.trim()
                ? resolvedLocale === 'uk'
                  ? `Опишіть, що показано у варіанті ${choice.label}.`
                  : resolvedLocale === 'pl'
                    ? `Opisz, co pokazano w odpowiedzi ${choice.label}.`
                    : `Describe what is shown in option ${choice.label}.`
                : resolvedLocale === 'uk'
                  ? 'Опишіть, що показано в цьому варіанті.'
                  : resolvedLocale === 'pl'
                    ? 'Opisz, co pokazano w tej odpowiedzi.'
                    : 'Describe what is shown in this option.',
            }
            : choice
        ),
      };
    default:
      return formData;
  }
};
