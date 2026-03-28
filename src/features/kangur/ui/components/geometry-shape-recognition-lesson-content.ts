import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import {
  type LessonTranslate,
  translateLessonValueWithLegacyKey,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurGeometryShapeRecognitionLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

type TemplateValues = Record<string, unknown>;

const interpolateTemplate = (template: string, values?: TemplateValues): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => String(values?.[key] ?? `{${key}}`));

const resolveTranslationValue = (
  content: KangurGeometryShapeRecognitionLessonTemplateContent | Record<string, unknown>,
  key: string,
): string | null => {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null;
    }
    return (current as Record<string, unknown>)[part] ?? null;
  }, content as unknown);

  return typeof value === 'string' ? value : null;
};

export const createGeometryShapeRecognitionMessageTranslate = (
  messages: Record<string, unknown>,
): LessonTranslate => {
  const translate = ((key: string) => resolveTranslationValue(messages, key) ?? key) as
    LessonTranslate & { has?: (messageKey: string) => boolean };
  translate.has = (messageKey: string): boolean =>
    resolveTranslationValue(messages, messageKey) !== null;
  return translate;
};

export const createGeometryShapeRecognitionLessonTranslate = (
  content: KangurGeometryShapeRecognitionLessonTemplateContent,
): LessonTranslate => (key, values) => {
  const template = resolveTranslationValue(content, key);
  if (!template) {
    return key;
  }

  return interpolateTemplate(template, values);
};

export const createGeometryShapeRecognitionLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurGeometryShapeRecognitionLessonTemplateContent => ({
  kind: 'geometry_shape_recognition',
  lessonTitle: translate('lessonTitle'),
  sections: {
    intro: {
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    practice: {
      title: translate('sections.practice.title'),
      description: translate('sections.practice.description'),
    },
    draw: {
      title: translate('sections.draw.title'),
      description: translate('sections.draw.description'),
    },
    summary: {
      title: translate('sections.summary.title'),
      description: translate('sections.summary.description'),
    },
  },
  shapes: {
    circle: {
      label: translate('shapes.circle.label'),
      clue: translate('shapes.circle.clue'),
    },
    square: {
      label: translate('shapes.square.label'),
      clue: translate('shapes.square.clue'),
    },
    triangle: {
      label: translate('shapes.triangle.label'),
      clue: translate('shapes.triangle.clue'),
    },
    rectangle: {
      label: translate('shapes.rectangle.label'),
      clue: translate('shapes.rectangle.clue'),
    },
    oval: {
      label: translate('shapes.oval.label'),
      clue: translate('shapes.oval.clue'),
    },
    diamond: {
      label: translate('shapes.diamond.label'),
      clue: translate('shapes.diamond.clue'),
    },
  },
  clues: {
    title: translate('clues.title'),
    lead: translate('clues.lead'),
    chips: {
      corners: translate('clues.chips.corners'),
      sides: translate('clues.chips.sides'),
      curves: translate('clues.chips.curves'),
      longShortSides: translate('clues.chips.longShortSides'),
    },
    inset: translate('clues.inset'),
  },
  practice: {
    slideTitle: translate('practiceSlide.title'),
    emptyRounds: translate('practice.emptyRounds'),
    finished: {
      status: translate('practice.finished.status'),
      title: translate('practice.finished.title'),
      subtitle: translate('practice.finished.subtitle'),
      restart: translate('practice.finished.restart'),
    },
    progress: {
      round: translate('practice.progress.round'),
      score: translate('practice.progress.score'),
    },
    question: translate('practice.question'),
    feedback: {
      correct: translate('practice.feedback.correct'),
      incorrect: translate('practice.feedback.incorrect'),
    },
    actions: {
      next: translate('practice.actions.next'),
      finish: translate('practice.actions.finish'),
    },
  },
  intro: {
    title: translate('intro.title'),
    lead: translate('intro.lead'),
  },
  summary: {
    title: translate('summary.title'),
    status: translate('summary.status'),
    lead: translate('summary.lead'),
    caption: translate('summary.caption'),
  },
  draw: {
    gameTitle: translateLessonValueWithLegacyKey(
      translate,
      'draw.gameTitle',
      'draw.stageTitle',
      '',
    ),
    difficultyLabel: translate('draw.difficultyLabel'),
    finishLabel: translate('draw.finishLabel'),
  },
});

export const resolveGeometryShapeRecognitionLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurGeometryShapeRecognitionLessonTemplateContent => {
  if (!template?.componentContent) {
    return createGeometryShapeRecognitionLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'geometry_shape_recognition',
    template.componentContent,
  );

  if (resolved?.kind === 'geometry_shape_recognition') {
    return resolved;
  }

  return createGeometryShapeRecognitionLessonContentFromTranslate(fallbackTranslate);
};
