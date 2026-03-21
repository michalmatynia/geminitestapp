import {
  createPanelIllustration,
  type QuestionFormData,
} from '../test-questions';
import { resolveKangurAdminLocale } from './kangur-admin-locale';

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

const QUESTION_PRESENTATION_PRESET_COPY = {
  en: {
    'classic-list': {
      label: 'Classic answer list',
      description: 'Prompt first, then a straightforward stacked answer list.',
    },
    'classic-grid': {
      label: 'Grid answer cards',
      description: 'Use card-style answers without splitting the prompt and illustration.',
    },
    'split-left-grid': {
      label: 'Illustration left',
      description: 'Put the visual beside the prompt and switch answers to a card grid.',
    },
    'split-right-grid': {
      label: 'Illustration right',
      description: 'Keep the prompt first and move the visual to the right-hand column.',
    },
  },
  pl: {
    'classic-list': {
      label: 'Klasyczna lista odpowiedzi',
      description: 'Najpierw prompt, potem prosty pionowy stos odpowiedzi.',
    },
    'classic-grid': {
      label: 'Siatka kart odpowiedzi',
      description: 'Użyj odpowiedzi w stylu kart bez rozdzielania promptu i ilustracji.',
    },
    'split-left-grid': {
      label: 'Ilustracja po lewej',
      description: 'Umieść wizual obok promptu i przełącz odpowiedzi na siatkę kart.',
    },
    'split-right-grid': {
      label: 'Ilustracja po prawej',
      description: 'Zachowaj prompt na początku i przenieś wizual do prawej kolumny.',
    },
  },
  uk: {
    'classic-list': {
      label: 'Класичний список відповідей',
      description: 'Спочатку prompt, потім простий вертикальний список відповідей.',
    },
    'classic-grid': {
      label: 'Сітка карток відповідей',
      description: 'Використовуйте відповіді у вигляді карток без поділу prompt і ілюстрації.',
    },
    'split-left-grid': {
      label: 'Ілюстрація ліворуч',
      description: 'Поставте візуал поруч із prompt і переключіть відповіді на сітку карток.',
    },
    'split-right-grid': {
      label: 'Ілюстрація праворуч',
      description: 'Залиште prompt першим і перенесіть візуал у праву колонку.',
    },
  },
} as const;

export const getQuestionPresentationPresets = (
  locale: string | null | undefined = 'en'
): readonly QuestionPresentationPreset[] => {
  const resolvedLocale = resolveKangurAdminLocale(locale);
  const localizedCopy = QUESTION_PRESENTATION_PRESET_COPY[resolvedLocale];

  return [
    {
      id: 'classic-list',
      ...localizedCopy['classic-list'],
    },
    {
      id: 'classic-grid',
      ...localizedCopy['classic-grid'],
    },
    {
      id: 'split-left-grid',
      ...localizedCopy['split-left-grid'],
    },
    {
      id: 'split-right-grid',
      ...localizedCopy['split-right-grid'],
    },
  ] as const;
};

export const QUESTION_PRESENTATION_PRESETS: readonly QuestionPresentationPreset[] =
  getQuestionPresentationPresets('en');

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
