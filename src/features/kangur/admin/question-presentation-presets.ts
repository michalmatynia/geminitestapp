import {
  createPanelIllustration,
  type QuestionFormData,
} from '../test-questions';

export type QuestionPresentationPresetId =
  | 'classic-list'
  | 'classic-grid'
  | 'split-left-grid'
  | 'split-right-grid';

export type QuestionPresentationPreset = {
  id: QuestionPresentationPresetId;
  label: string;
  description: string;
};

export const QUESTION_PRESENTATION_PRESETS: readonly QuestionPresentationPreset[] = [
  {
    id: 'classic-list',
    label: 'Classic answer list',
    description: 'Prompt first, then a straightforward stacked answer list.',
  },
  {
    id: 'classic-grid',
    label: 'Grid answer cards',
    description: 'Use card-style answers without splitting the prompt and illustration.',
  },
  {
    id: 'split-left-grid',
    label: 'Illustration left',
    description: 'Put the visual beside the prompt and switch answers to a card grid.',
  },
  {
    id: 'split-right-grid',
    label: 'Illustration right',
    description: 'Keep the prompt first and move the visual to the right-hand column.',
  },
] as const;

const ensureSplitIllustration = (formData: QuestionFormData) => {
  if (formData.illustration.type !== 'none') {
    return formData.illustration;
  }

  const panelCount = Math.min(Math.max(formData.choices.length, 1), 8);
  const labels = formData.choices
    .slice(0, panelCount)
    .map((choice, index) => choice.label.trim() || String.fromCharCode(65 + index));

  return createPanelIllustration(panelCount, labels);
};

export const applyQuestionPresentationPreset = (
  formData: QuestionFormData,
  presetId: QuestionPresentationPresetId
): QuestionFormData => {
  switch (presetId) {
    case 'classic-list':
      return {
        ...formData,
        presentation: {
          ...formData.presentation,
          layout: 'classic',
          choiceStyle: 'list',
        },
      };
    case 'classic-grid':
      return {
        ...formData,
        presentation: {
          ...formData.presentation,
          layout: 'classic',
          choiceStyle: 'grid',
        },
      };
    case 'split-left-grid':
      return {
        ...formData,
        illustration: ensureSplitIllustration(formData),
        presentation: {
          ...formData.presentation,
          layout: 'split-illustration-left',
          choiceStyle: 'grid',
        },
      };
    case 'split-right-grid':
      return {
        ...formData,
        illustration: ensureSplitIllustration(formData),
        presentation: {
          ...formData.presentation,
          layout: 'split-illustration-right',
          choiceStyle: 'grid',
        },
      };
    default:
      return formData;
  }
};
