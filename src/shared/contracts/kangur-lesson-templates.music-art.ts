import { z } from 'zod';

import {
  createLegacyCompatibleLessonShellSchema,
  kangurLegacyCompatibleLessonSectionGameCopyShape,
} from './kangur-lesson-templates.shared';

const kangurMusicDiatonicScaleSectionSchema = z.object({
  emoji: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurMusicDiatonicScaleSlideSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
});

const kangurMusicDiatonicScaleFactSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

export const kangurMusicDiatonicScaleLessonTemplateContentSchema = z.object({
  kind: z.literal('music_diatonic_scale'),
  notesSection: kangurMusicDiatonicScaleSectionSchema.extend({
    introSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      noteCardLabel: z.string().trim().min(1).max(80),
      noteSequence: z.array(z.string().trim().min(1).max(24)).min(1).max(12),
      caption: z.string().trim().min(1).max(240),
    }),
    colorsSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      noteChips: z.array(z.string().trim().min(1).max(24)).min(1).max(12),
      previewTitle: z.string().trim().min(1).max(120),
      previewDescription: z.string().trim().min(1).max(240),
      caption: z.string().trim().min(1).max(240),
    }),
  }),
  melodySection: kangurMusicDiatonicScaleSectionSchema.extend({
    directionSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      ascendingTitle: z.string().trim().min(1).max(80),
      ascendingSequence: z.string().trim().min(1).max(120),
      ascendingCaption: z.string().trim().min(1).max(240),
      descendingTitle: z.string().trim().min(1).max(80),
      descendingSequence: z.string().trim().min(1).max(120),
      descendingCaption: z.string().trim().min(1).max(240),
    }),
    listenSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      planTitle: z.string().trim().min(1).max(80),
      planSteps: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
      caption: z.string().trim().min(1).max(240),
    }),
  }),
  gameRepeatSection: kangurMusicDiatonicScaleSectionSchema.extend(
    kangurLegacyCompatibleLessonSectionGameCopyShape
  ),
  gameFreeplaySection: kangurMusicDiatonicScaleSectionSchema.extend(
    kangurLegacyCompatibleLessonSectionGameCopyShape
  ),
  summarySection: kangurMusicDiatonicScaleSectionSchema.extend({
    summarySlide: kangurMusicDiatonicScaleSlideSchema.extend({
      facts: z.array(kangurMusicDiatonicScaleFactSchema).min(1).max(6),
    }),
  }),
});

const kangurArtShapesBasicTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurArtShapesBasicLabelCaptionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurArtShapesBasicShapeSchema = z.object({
  label: z.string().trim().min(1).max(120),
  clue: z.string().trim().min(1).max(240),
});

export const kangurArtShapesBasicLessonTemplateContentSchema = z.object({
  kind: z.literal('art_shapes_basic'),
  sections: z.object({
    meetShapes: kangurArtShapesBasicTitleDescriptionSchema,
    compareShapes: kangurArtShapesBasicTitleDescriptionSchema,
    findShapes: kangurArtShapesBasicTitleDescriptionSchema,
    rotationPuzzle: kangurArtShapesBasicTitleDescriptionSchema,
    summary: kangurArtShapesBasicTitleDescriptionSchema,
  }),
  slides: z.object({
    meetShapes: z.object({
      title: z.string().trim().min(1).max(120),
      lead: z.string().trim().min(1).max(240),
      shapes: z.object({
        circle: kangurArtShapesBasicShapeSchema,
        square: kangurArtShapesBasicShapeSchema,
        triangle: kangurArtShapesBasicShapeSchema,
        rectangle: kangurArtShapesBasicShapeSchema,
      }),
    }),
    compareShapes: z.object({
      title: z.string().trim().min(1).max(120),
      chips: z.object({
        circle: z.string().trim().min(1).max(120),
        square: z.string().trim().min(1).max(120),
        triangle: z.string().trim().min(1).max(120),
        rectangle: z.string().trim().min(1).max(120),
      }),
      detective: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
    }),
    findShapes: z.object({
      examples: z.object({
        title: z.string().trim().min(1).max(120),
        circle: kangurArtShapesBasicLabelCaptionSchema,
        window: kangurArtShapesBasicLabelCaptionSchema,
        pizza: kangurArtShapesBasicLabelCaptionSchema,
        rectangle: kangurArtShapesBasicLabelCaptionSchema,
      }),
      puzzleClues: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        familyTitle: z.string().trim().min(1).max(120),
        familyCaption: z.string().trim().min(1).max(240),
        speedTitle: z.string().trim().min(1).max(120),
        speedCaption: z.string().trim().min(1).max(240),
      }),
    }),
    summary: z.object({
      title: z.string().trim().min(1).max(120),
      facts: z.object({
        circle: z.string().trim().min(1).max(240),
        square: z.string().trim().min(1).max(240),
        triangle: z.string().trim().min(1).max(240),
        rectangle: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema({
    progress: z.object({
      round: z.string().trim().min(1).max(120),
      score: z.string().trim().min(1).max(120),
    }),
    missingTileLabel: z.string().trim().min(1).max(120),
    tileLabel: z.string().trim().min(1).max(120),
    chooseOption: z.string().trim().min(1).max(120),
    glyphs: z.object({
      circle: z.string().trim().min(1).max(120),
      ball: z.string().trim().min(1).max(120),
      square: z.string().trim().min(1).max(120),
      window: z.string().trim().min(1).max(120),
      triangle: z.string().trim().min(1).max(120),
      pizza: z.string().trim().min(1).max(120),
      rectangle: z.string().trim().min(1).max(120),
      book: z.string().trim().min(1).max(120),
    }),
    tempos: z.object({
      slow: z.string().trim().min(1).max(120),
      medium: z.string().trim().min(1).max(120),
      fast: z.string().trim().min(1).max(120),
    }),
    optionFeedback: z.object({
      correct: z.string().trim().min(1).max(120),
      incorrect: z.string().trim().min(1).max(120),
      answer: z.string().trim().min(1).max(120),
    }),
    finished: z.object({
      status: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(160),
      subtitle: z.string().trim().min(1).max(240),
      backToLesson: z.string().trim().min(1).max(120),
      playAgain: z.string().trim().min(1).max(120),
    }),
  }, 'Art shapes basic game title is required.'),
});
