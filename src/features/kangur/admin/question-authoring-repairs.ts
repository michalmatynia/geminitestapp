import type { QuestionFormData } from '../test-questions';
import type { QuestionAuthoringIssue } from './question-authoring-insights';

export type QuestionAuthoringRepairId =
  | 'auto-label-choices'
  | 'set-first-choice-correct'
  | 'switch-layout-classic'
  | 'add-explanation-starter'
  | 'add-svg-choice-notes';

export type QuestionAuthoringRepairAction = {
  id: QuestionAuthoringRepairId;
  label: string;
};

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
  issues: readonly QuestionAuthoringIssue[]
): QuestionAuthoringRepairAction[] =>
  uniqueRepairs(
    issues.flatMap<QuestionAuthoringRepairAction>((issue) => {
      switch (issue.code) {
        case 'missing_choice_label':
        case 'duplicate_choice_labels':
          return [{ id: 'auto-label-choices', label: 'Auto-label choices' }];
        case 'missing_correct_choice':
          return [{ id: 'set-first-choice-correct', label: 'Use first choice as correct' }];
        case 'split_layout_without_illustration':
          return [{ id: 'switch-layout-classic', label: 'Switch to classic layout' }];
        case 'missing_explanation':
          return [{ id: 'add-explanation-starter', label: 'Add explanation starter' }];
        case 'choice_svg_without_note':
          return [{ id: 'add-svg-choice-notes', label: 'Add starter notes for SVG choices' }];
        default:
          return [];
      }
    })
  );

export const applyQuestionAuthoringRepair = (
  formData: QuestionFormData,
  repairId: QuestionAuthoringRepairId
): QuestionFormData => {
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
          ? `The correct answer is ${correctChoice.label}: ${correctChoice.text}. Add the worked reasoning here.`
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
                ? `Describe what is shown in option ${choice.label}.`
                : 'Describe what is shown in this option.',
            }
            : choice
        ),
      };
    default:
      return formData;
  }
};
