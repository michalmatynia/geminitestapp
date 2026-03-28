import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type { ArtShapesBasicLessonTranslate } from '@/features/kangur/ui/components/ArtShapesBasicLesson.data';
import type {
  KangurArtShapesBasicLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

type TranslationValues = Record<string, string | number> | undefined;

const interpolateTemplate = (template: string, values?: TranslationValues): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => String(values?.[key] ?? `{${key}}`));

const resolveTranslationValue = (
  content: KangurArtShapesBasicLessonTemplateContent,
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

export const createArtShapesBasicLessonTranslate = (
  content: KangurArtShapesBasicLessonTemplateContent,
): ArtShapesBasicLessonTranslate => (key, values) => {
  const template =
    resolveTranslationValue(content, key) ??
    (key === 'game.gameTitle' ? resolveTranslationValue(content, 'game.stageTitle') : null) ??
    (key === 'game.stageTitle' ? resolveTranslationValue(content, 'game.gameTitle') : null);
  if (!template) {
    return key;
  }

  return interpolateTemplate(template, values);
};

export const createArtShapesBasicLessonContentFromTranslate = (
  translate: ArtShapesBasicLessonTranslate,
): KangurArtShapesBasicLessonTemplateContent => ({
  kind: 'art_shapes_basic',
  sections: {
    meetShapes: {
      title: translate('sections.meetShapes.title'),
      description: translate('sections.meetShapes.description'),
    },
    compareShapes: {
      title: translate('sections.compareShapes.title'),
      description: translate('sections.compareShapes.description'),
    },
    findShapes: {
      title: translate('sections.findShapes.title'),
      description: translate('sections.findShapes.description'),
    },
    rotationPuzzle: {
      title: translate('sections.rotationPuzzle.title'),
      description: translate('sections.rotationPuzzle.description'),
    },
    summary: {
      title: translate('sections.summary.title'),
      description: translate('sections.summary.description'),
    },
  },
  slides: {
    meetShapes: {
      title: translate('slides.meetShapes.title'),
      lead: translate('slides.meetShapes.lead'),
      shapes: {
        circle: {
          label: translate('slides.meetShapes.shapes.circle.label'),
          clue: translate('slides.meetShapes.shapes.circle.clue'),
        },
        square: {
          label: translate('slides.meetShapes.shapes.square.label'),
          clue: translate('slides.meetShapes.shapes.square.clue'),
        },
        triangle: {
          label: translate('slides.meetShapes.shapes.triangle.label'),
          clue: translate('slides.meetShapes.shapes.triangle.clue'),
        },
        rectangle: {
          label: translate('slides.meetShapes.shapes.rectangle.label'),
          clue: translate('slides.meetShapes.shapes.rectangle.clue'),
        },
      },
    },
    compareShapes: {
      title: translate('slides.compareShapes.title'),
      chips: {
        circle: translate('slides.compareShapes.chips.circle'),
        square: translate('slides.compareShapes.chips.square'),
        triangle: translate('slides.compareShapes.chips.triangle'),
        rectangle: translate('slides.compareShapes.chips.rectangle'),
      },
      detective: {
        title: translate('slides.compareShapes.detective.title'),
        caption: translate('slides.compareShapes.detective.caption'),
      },
    },
    findShapes: {
      examples: {
        title: translate('slides.findShapes.examples.title'),
        circle: {
          label: translate('slides.findShapes.examples.circle.label'),
          caption: translate('slides.findShapes.examples.circle.caption'),
        },
        window: {
          label: translate('slides.findShapes.examples.window.label'),
          caption: translate('slides.findShapes.examples.window.caption'),
        },
        pizza: {
          label: translate('slides.findShapes.examples.pizza.label'),
          caption: translate('slides.findShapes.examples.pizza.caption'),
        },
        rectangle: {
          label: translate('slides.findShapes.examples.rectangle.label'),
          caption: translate('slides.findShapes.examples.rectangle.caption'),
        },
      },
      puzzleClues: {
        title: translate('slides.findShapes.puzzleClues.title'),
        lead: translate('slides.findShapes.puzzleClues.lead'),
        familyTitle: translate('slides.findShapes.puzzleClues.familyTitle'),
        familyCaption: translate('slides.findShapes.puzzleClues.familyCaption'),
        speedTitle: translate('slides.findShapes.puzzleClues.speedTitle'),
        speedCaption: translate('slides.findShapes.puzzleClues.speedCaption'),
      },
    },
    summary: {
      title: translate('slides.summary.title'),
      facts: {
        circle: translate('slides.summary.facts.circle'),
        square: translate('slides.summary.facts.square'),
        triangle: translate('slides.summary.facts.triangle'),
        rectangle: translate('slides.summary.facts.rectangle'),
      },
    },
  },
  game: {
    gameTitle: translate('game.stageTitle'),
    progress: {
      round: translate('game.progress.round'),
      score: translate('game.progress.score'),
    },
    missingTileLabel: translate('game.missingTileLabel'),
    tileLabel: translate('game.tileLabel'),
    chooseOption: translate('game.chooseOption'),
    glyphs: {
      circle: translate('game.glyphs.circle'),
      ball: translate('game.glyphs.ball'),
      square: translate('game.glyphs.square'),
      window: translate('game.glyphs.window'),
      triangle: translate('game.glyphs.triangle'),
      pizza: translate('game.glyphs.pizza'),
      rectangle: translate('game.glyphs.rectangle'),
      book: translate('game.glyphs.book'),
    },
    tempos: {
      slow: translate('game.tempos.slow'),
      medium: translate('game.tempos.medium'),
      fast: translate('game.tempos.fast'),
    },
    optionFeedback: {
      correct: translate('game.optionFeedback.correct'),
      incorrect: translate('game.optionFeedback.incorrect'),
      answer: translate('game.optionFeedback.answer'),
    },
    finished: {
      status: translate('game.finished.status'),
      title: translate('game.finished.title'),
      subtitle: translate('game.finished.subtitle'),
      backToLesson: translate('game.finished.backToLesson'),
      playAgain: translate('game.finished.playAgain'),
    },
  },
});

export const resolveArtShapesBasicLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: ArtShapesBasicLessonTranslate,
): KangurArtShapesBasicLessonTemplateContent => {
  if (!template?.componentContent) {
    return createArtShapesBasicLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved =
    resolveKangurLessonTemplateComponentContent('art_shapes_basic', template.componentContent);
  if (resolved?.kind === 'art_shapes_basic') {
    return resolved;
  }

  return createArtShapesBasicLessonContentFromTranslate(fallbackTranslate);
};
