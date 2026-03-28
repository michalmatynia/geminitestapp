import { z } from 'zod';

import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from './kangur-lesson-constants';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

// ---------------------------------------------------------------------------
// Lesson template — the catalog definition for a lesson type
// ---------------------------------------------------------------------------

export const kangurLessonTemplateSlideContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240).optional(),
});

export const kangurLessonTemplateSectionContentSchema = z.object({
  id: z.string().trim().min(1).max(64),
  emoji: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  isGame: z.boolean().optional(),
  slides: z.array(kangurLessonTemplateSlideContentSchema).default([]),
  gameTitle: z.string().trim().min(1).max(120).optional(),
  gameDescription: z.string().trim().min(1).max(240).optional(),
  gameStageTitle: z.string().trim().min(1).max(120).optional(),
  gameStageDescription: z.string().trim().min(1).max(240).optional(),
});

export const kangurAlphabetUnifiedLessonTemplateContentSchema = z.object({
  kind: z.literal('alphabet_unified'),
  sections: z.array(kangurLessonTemplateSectionContentSchema).min(1),
});

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
  gameRepeatSection: kangurMusicDiatonicScaleSectionSchema.extend({
    gameTitle: z.string().trim().min(1).max(120).optional(),
    gameDescription: z.string().trim().min(1).max(240).optional(),
    gameStageTitle: z.string().trim().min(1).max(120).optional(),
    gameStageDescription: z.string().trim().min(1).max(240).optional(),
  }),
  gameFreeplaySection: kangurMusicDiatonicScaleSectionSchema.extend({
    gameTitle: z.string().trim().min(1).max(120).optional(),
    gameDescription: z.string().trim().min(1).max(240).optional(),
    gameStageTitle: z.string().trim().min(1).max(120).optional(),
    gameStageDescription: z.string().trim().min(1).max(240).optional(),
  }),
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
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
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
  }),
});

const kangurGeometryBasicsTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryBasicsTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesShapeCardSchema = z.object({
  name: z.string().trim().min(1).max(120),
  details: z.string().trim().min(1).max(240),
});

const kangurGeometryShapeRecognitionTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryShapeRecognitionLabelClueSchema = z.object({
  label: z.string().trim().min(1).max(120),
  clue: z.string().trim().min(1).max(240),
});

const kangurGeometrySymmetryTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometrySymmetryTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurLogicalClassificationTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurLogicalClassificationTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurLogicalAnalogiesTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurLogicalAnalogiesTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurLogicalAnalogiesPairHintAnswerSchema = z.object({
  pair: z.string().trim().min(1).max(160),
  hint: z.string().trim().min(1).max(240).optional(),
  answer: z.string().trim().min(1).max(240),
});

const kangurLogicalThinkingTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurLogicalThinkingIfThenRoundSchema = z.object({
  id: z.string().trim().min(1).max(80),
  fact: z.string().trim().min(1).max(240),
  rule: z.string().trim().min(1).max(240),
  conclusion: z.string().trim().min(1).max(240),
  distractors: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
  explanation: z.string().trim().min(1).max(240),
});

const kangurLogicalThinkingLabOptionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
});

const kangurLogicalThinkingLabAnalogyRoundSchema = z.object({
  id: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(160),
  options: z.array(kangurLogicalThinkingLabOptionSchema).min(2).max(6),
  correctId: z.string().trim().min(1).max(80),
  explanation: z.string().trim().min(1).max(240),
});

const kangurLogicalPatternsTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurLogicalPatternsTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurLogicalPatternsExampleSchema = z.object({
  label: z.string().trim().min(1).max(120),
  seq: z.string().trim().min(1).max(120),
  answer: z.string().trim().min(1).max(240),
});

const kangurLogicalPatternsHintSequenceAnswerSchema = z.object({
  hint: z.string().trim().min(1).max(160),
  seq: z.string().trim().min(1).max(120),
  answer: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningTitleLeadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningTitleExampleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  example: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningRuleNoteSchema = z.object({
  rule: z.string().trim().min(1).max(240),
  note: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningQuantifierCardSchema = z.object({
  icon: z.string().trim().min(1).max(12),
  label: z.string().trim().min(1).max(120),
  accent: z.enum(['emerald', 'amber', 'rose']),
  text: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningTrueFalseExampleSchema = z.object({
  stmt: z.string().trim().min(1).max(240),
  answer: z.boolean(),
  explain: z.string().trim().min(1).max(240),
});

const kangurLogicalReasoningCaseSchema = z.object({
  id: z.string().trim().min(1).max(80),
  rule: z.string().trim().min(1).max(240),
  fact: z.string().trim().min(1).max(160),
  conclusion: z.string().trim().min(1).max(160),
  valid: z.boolean(),
  explanation: z.string().trim().min(1).max(240),
});

const kangurDivisionTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurDivisionTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurMultiplicationTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurMultiplicationTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

const kangurAddingTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurAddingTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

export const kangurMultiplicationLessonTemplateContentSchema = z.object({
  kind: z.literal('multiplication'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurMultiplicationTitleDescriptionSchema,
    tabela23: kangurMultiplicationTitleDescriptionSchema,
    tabela45: kangurMultiplicationTitleDescriptionSchema,
    triki: kangurMultiplicationTitleDescriptionSchema,
    gameArray: kangurMultiplicationTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      meaning: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        patternChip: z.string().trim().min(1).max(120),
        patternCaption: z.string().trim().min(1).max(240),
        equation: z.string().trim().min(1).max(120),
        equationCaption: z.string().trim().min(1).max(240),
      }),
      groups: kangurMultiplicationTitleLeadCaptionSchema.extend({
        groupsChip: z.string().trim().min(1).max(120),
        equation: z.string().trim().min(1).max(120),
      }),
    }),
    tabela23: z.object({
      basics: kangurMultiplicationTitleLeadCaptionSchema.extend({
        skipCountChip: z.string().trim().min(1).max(120),
      }),
    }),
    tabela45: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        doubleChip: z.string().trim().min(1).max(120),
        doubleCaption: z.string().trim().min(1).max(240),
        rhythmChip: z.string().trim().min(1).max(120),
        rhythmCaption: z.string().trim().min(1).max(240),
      }),
      array: kangurMultiplicationTitleLeadCaptionSchema.extend({
        arrayChip: z.string().trim().min(1).max(120),
        equation: z.string().trim().min(1).max(120),
      }),
    }),
    triki: z.object({
      shortcuts: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        rules: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        tenShiftChip: z.string().trim().min(1).max(120),
        tenShiftCaption: z.string().trim().min(1).max(240),
      }),
      commutative: kangurMultiplicationTitleLeadCaptionSchema.extend({
        swapChip: z.string().trim().min(1).max(120),
      }),
    }),
  }),
  game: z.object({
    preludeChip: z.string().trim().min(1).max(120),
    preludeCaption: z.string().trim().min(1).max(240),
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurAddingLessonTemplateContentSchema = z.object({
  kind: z.literal('adding'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    podstawy: kangurAddingTitleDescriptionSchema,
    przekroczenie: kangurAddingTitleDescriptionSchema,
    dwucyfrowe: kangurAddingTitleDescriptionSchema,
    zapamietaj: kangurAddingTitleDescriptionSchema,
    synthesis: kangurAddingTitleDescriptionSchema,
    game: kangurAddingTitleDescriptionSchema,
  }),
  slides: z.object({
    podstawy: z.object({
      meaning: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        partLabel: z.string().trim().min(1).max(120),
        totalLabel: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
        startLabel: z.string().trim().min(1).max(120),
        combineLabel: z.string().trim().min(1).max(120),
        resultLabel: z.string().trim().min(1).max(120),
      }),
      singleDigit: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        step1: z.string().trim().min(1).max(240),
        step2: z.string().trim().min(1).max(240),
        step3: z.string().trim().min(1).max(240),
        staircaseLabel: z.string().trim().min(1).max(120),
        countUpLabel: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
        startLargeChip: z.string().trim().min(1).max(120),
        countUpChip: z.string().trim().min(1).max(120),
        quickResultChip: z.string().trim().min(1).max(120),
      }),
      motion: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        groupA: z.string().trim().min(1).max(120),
        groupB: z.string().trim().min(1).max(120),
        sum: z.string().trim().min(1).max(120),
      }),
    }),
    przekroczenie: z.object({
      overTen: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        step1Title: z.string().trim().min(1).max(120),
        step1Text: z.string().trim().min(1).max(240),
        step2Title: z.string().trim().min(1).max(120),
        step2Text: z.string().trim().min(1).max(240),
        targetLabel: z.string().trim().min(1).max(120),
        remainingChip: z.string().trim().min(1).max(120),
      }),
      numberLine: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        startChip: z.string().trim().min(1).max(120),
        plusTwoChip: z.string().trim().min(1).max(120),
        tenChip: z.string().trim().min(1).max(120),
        plusThreeChip: z.string().trim().min(1).max(120),
        resultChip: z.string().trim().min(1).max(120),
      }),
      tenFrame: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        miniPlanTitle: z.string().trim().min(1).max(120),
        steps: z.array(z.string().trim().min(1).max(120)).min(1).max(6),
      }),
    }),
    dwucyfrowe: z.object({
      intro: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        tensLabel: z.string().trim().min(1).max(120),
        onesLabel: z.string().trim().min(1).max(120),
        schemeTitle: z.string().trim().min(1).max(120),
        schemeCaption: z.string().trim().min(1).max(240),
      }),
      motion: kangurAddingTitleLeadCaptionSchema,
      blocks: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        tensChip: z.string().trim().min(1).max(120),
        onesChip: z.string().trim().min(1).max(120),
        sumChip: z.string().trim().min(1).max(120),
      }),
      columns: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        tensLabel: z.string().trim().min(1).max(120),
        onesLabel: z.string().trim().min(1).max(120),
      }),
      abacus: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        tensChip: z.string().trim().min(1).max(120),
        onesChip: z.string().trim().min(1).max(120),
        sumChip: z.string().trim().min(1).max(120),
      }),
    }),
    zapamietaj: z.object({
      rules: z.object({
        title: z.string().trim().min(1).max(120),
        orderChip: z.string().trim().min(1).max(120),
        zeroChip: z.string().trim().min(1).max(120),
        startChip: z.string().trim().min(1).max(120),
        groupChip: z.string().trim().min(1).max(120),
        pairsTitle: z.string().trim().min(1).max(120),
        pairsText: z.string().trim().min(1).max(240),
        doublesTitle: z.string().trim().min(1).max(120),
        doublesText: z.string().trim().min(1).max(240),
        groupingTitle: z.string().trim().min(1).max(120),
        groupingText: z.string().trim().min(1).max(240),
        pathTitle: z.string().trim().min(1).max(120),
        pathStep1Title: z.string().trim().min(1).max(120),
        pathStep1Text: z.string().trim().min(1).max(240),
        pathStep2Title: z.string().trim().min(1).max(120),
        pathStep2Text: z.string().trim().min(1).max(240),
        pathStep3Title: z.string().trim().min(1).max(120),
        pathStep3Text: z.string().trim().min(1).max(240),
      }),
      commutative: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      associative: z.object({
        title: z.string().trim().min(1).max(120),
        bracketsLabel: z.string().trim().min(1).max(120),
        groupingLabel: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      zero: z.object({
        title: z.string().trim().min(1).max(120),
        zeroLabel: z.string().trim().min(1).max(120),
        noChangeLabel: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      makeTen: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      doubles: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
  synthesis: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

const kangurSubtractingTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurSubtractingTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

export const kangurSubtractingLessonTemplateContentSchema = z.object({
  kind: z.literal('subtracting'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    podstawy: kangurSubtractingTitleDescriptionSchema,
    przekroczenie: kangurSubtractingTitleDescriptionSchema,
    dwucyfrowe: kangurSubtractingTitleDescriptionSchema,
    zapamietaj: kangurSubtractingTitleDescriptionSchema,
    game: kangurSubtractingTitleDescriptionSchema,
  }),
  animations: z.object({
    subtractingSvg: z.object({
      ariaLabel: z.string().trim().min(1).max(240),
    }),
    numberLine: z.object({
      ariaLabel: z.string().trim().min(1).max(240),
    }),
    tenFrame: z.object({
      ariaLabel: z.string().trim().min(1).max(240),
    }),
    differenceBar: z.object({
      ariaLabel: z.string().trim().min(1).max(240),
      differenceLabel: z.string().trim().min(1).max(120),
    }),
    abacus: z.object({
      ariaLabel: z.string().trim().min(1).max(240),
      tensLabel: z.string().trim().min(1).max(120),
      onesLabel: z.string().trim().min(1).max(120),
      startLabel: z.string().trim().min(1).max(120),
      subtractLabel: z.string().trim().min(1).max(120),
      resultLabel: z.string().trim().min(1).max(120),
    }),
  }),
  slides: z.object({
    basics: z.object({
      meaning: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
      }),
      singleDigit: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        step1: z.string().trim().min(1).max(240),
        step2: z.string().trim().min(1).max(240),
        step3: z.string().trim().min(1).max(240),
      }),
      motion: kangurSubtractingTitleLeadCaptionSchema,
    }),
    crossTen: z.object({
      overTen: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        step1Title: z.string().trim().min(1).max(120),
        step1Text: z.string().trim().min(1).max(240),
        step2Title: z.string().trim().min(1).max(120),
        step2Text: z.string().trim().min(1).max(240),
        step3Title: z.string().trim().min(1).max(120),
        step3Text: z.string().trim().min(1).max(240),
      }),
      numberLine: kangurSubtractingTitleLeadCaptionSchema,
      tenFrame: kangurSubtractingTitleLeadCaptionSchema,
    }),
    doubleDigit: z.object({
      intro: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        tensLabel: z.string().trim().min(1).max(120),
        onesLabel: z.string().trim().min(1).max(120),
      }),
      abacus: kangurSubtractingTitleLeadCaptionSchema,
    }),
    remember: z.object({
      rules: z.object({
        title: z.string().trim().min(1).max(120),
        orderChip: z.string().trim().min(1).max(120),
        zeroChip: z.string().trim().min(1).max(120),
        checkChip: z.string().trim().min(1).max(120),
        breakChip: z.string().trim().min(1).max(120),
        stepBackTitle: z.string().trim().min(1).max(120),
        stepBackLead: z.string().trim().min(1).max(240),
        stepBackPath: z.string().trim().min(1).max(240),
        checkTitle: z.string().trim().min(1).max(120),
        checkLead: z.string().trim().min(1).max(240),
        checkEquation: z.string().trim().min(1).max(120),
        orderTitle: z.string().trim().min(1).max(120),
        orderLead: z.string().trim().min(1).max(240),
        motionTitle: z.string().trim().min(1).max(120),
        motionLead: z.string().trim().min(1).max(240),
        motionCaption: z.string().trim().min(1).max(240),
        pathTitle: z.string().trim().min(1).max(120),
        pathStep1Title: z.string().trim().min(1).max(120),
        pathStep1Text: z.string().trim().min(1).max(240),
        pathStep2Title: z.string().trim().min(1).max(120),
        pathStep2Text: z.string().trim().min(1).max(240),
        pathStep3Title: z.string().trim().min(1).max(120),
        pathStep3Text: z.string().trim().min(1).max(240),
        pathStep4Title: z.string().trim().min(1).max(120),
        pathStep4Text: z.string().trim().min(1).max(240),
      }),
      backJumps: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      tenFrame: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      checkAddition: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
      difference: z.object({
        title: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurDivisionLessonTemplateContentSchema = z.object({
  kind: z.literal('division'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurDivisionTitleDescriptionSchema,
    odwrotnosc: kangurDivisionTitleDescriptionSchema,
    reszta: kangurDivisionTitleDescriptionSchema,
    zapamietaj: kangurDivisionTitleDescriptionSchema,
    game: kangurDivisionTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      meaning: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        exampleCaption: z.string().trim().min(1).max(240),
        equation: z.string().trim().min(1).max(120),
        groupOne: z.string().trim().min(1).max(120),
        groupTwo: z.string().trim().min(1).max(120),
      }),
      equalGroupsAnimation: kangurDivisionTitleLeadCaptionSchema.extend({
        equation: z.string().trim().min(1).max(120),
      }),
    }),
    odwrotnosc: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        multiplicationEquation: z.string().trim().min(1).max(120),
        divisionEquationA: z.string().trim().min(1).max(120),
        divisionEquationB: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
      animation: kangurDivisionTitleLeadCaptionSchema,
    }),
    reszta: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        promptEquation: z.string().trim().min(1).max(120),
        reasoningCaption: z.string().trim().min(1).max(240),
        resultEquation: z.string().trim().min(1).max(120),
        exampleEmojiRow: z.string().trim().min(1).max(120),
        exampleCaption: z.string().trim().min(1).max(240),
      }),
      animation: kangurDivisionTitleLeadCaptionSchema.extend({
        equation: z.string().trim().min(1).max(120),
      }),
    }),
    zapamietaj: z.object({
      rules: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
      }),
      equalGroups: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
      inverse: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
      remainder: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurGeometryBasicsLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_basics'),
  lessonTitle: z.string().trim().min(1).max(120),
  terms: z.object({
    point: z.string().trim().min(1).max(80),
    segment: z.string().trim().min(1).max(80),
  }),
  sections: z.object({
    punkt: kangurGeometryBasicsTitleDescriptionSchema,
    bok: kangurGeometryBasicsTitleDescriptionSchema,
    kat: kangurGeometryBasicsTitleDescriptionSchema,
    podsumowanie: kangurGeometryBasicsTitleDescriptionSchema,
    game: kangurGeometryBasicsTitleDescriptionSchema,
  }),
  slides: z.object({
    punkt: z.object({
      segment: z.object({
        title: z.string().trim().min(1).max(120),
        pointLead: z.string().trim().min(1).max(240),
        segmentLead: z.string().trim().min(1).max(240),
        segmentLabel: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
      pointOnSegment: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    bok: z.object({
      sideAndVertex: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      countSides: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    kat: z.object({
      whatIsAngle: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        rightAngleCaption: z.string().trim().min(1).max(240),
        chips: z.object({
          acute: z.string().trim().min(1).max(120),
          right: z.string().trim().min(1).max(120),
          obtuse: z.string().trim().min(1).max(120),
        }),
      }),
      angleTypes: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          point: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
          segment: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
          sideAndVertex: z.object({
            term: z.string().trim().min(1).max(120),
            definition: z.string().trim().min(1).max(240),
          }),
          angle: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      pointAndSegment: kangurGeometryBasicsTitleCaptionSchema,
      pointOnSegment: kangurGeometryBasicsTitleCaptionSchema,
      sidesAndVertices: kangurGeometryBasicsTitleCaptionSchema,
      countSides: kangurGeometryBasicsTitleCaptionSchema,
      angleTypes: kangurGeometryBasicsTitleCaptionSchema,
      angleKinds: kangurGeometryBasicsTitleCaptionSchema,
    }),
  }),
  game: z
    .object({
      gameTitle: z.string().trim().min(1).max(120).optional(),
      stageTitle: z.string().trim().min(1).max(120).optional(),
    })
    .refine(({ gameTitle, stageTitle }) => Boolean(gameTitle ?? stageTitle), {
      message: 'Geometry basics game title is required.',
    }),
});

export const kangurGeometryShapesLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_shapes'),
  lessonTitle: z.string().trim().min(1).max(120),
  shapeCards: z.object({
    circle: kangurGeometryShapesShapeCardSchema,
    triangle: kangurGeometryShapesShapeCardSchema,
    square: kangurGeometryShapesShapeCardSchema,
    rectangle: kangurGeometryShapesShapeCardSchema,
    pentagon: kangurGeometryShapesShapeCardSchema,
    hexagon: kangurGeometryShapesShapeCardSchema,
  }),
  sections: z.object({
    podstawowe: kangurGeometryShapesTitleDescriptionSchema,
    ileBokow: kangurGeometryShapesTitleDescriptionSchema,
    podsumowanie: kangurGeometryShapesTitleDescriptionSchema,
    game: kangurGeometryShapesTitleDescriptionSchema,
  }),
  slides: z.object({
    podstawowe: z.object({
      intro: z.object({
        title: z.string().trim().min(1).max(120),
        orbitCaption: z.string().trim().min(1).max(240),
      }),
      outline: kangurGeometryShapesTitleCaptionSchema,
      build: kangurGeometryShapesTitleCaptionSchema,
    }),
    ileBokow: z.object({
      count: z.object({
        title: z.string().trim().min(1).max(120),
      }),
      countSides: kangurGeometryShapesTitleCaptionSchema,
      corners: kangurGeometryShapesTitleCaptionSchema,
      segmentSide: kangurGeometryShapesTitleCaptionSchema,
      drawSide: kangurGeometryShapesTitleCaptionSchema,
    }),
    podsumowanie: z.object({
      rotate: kangurGeometryShapesTitleCaptionSchema,
      sides: kangurGeometryShapesTitleCaptionSchema,
      interior: kangurGeometryShapesTitleCaptionSchema,
      build: kangurGeometryShapesTitleCaptionSchema,
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurGeometryShapeRecognitionLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_shape_recognition'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    practice: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    draw: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    summary: kangurGeometryShapeRecognitionTitleDescriptionSchema,
  }),
  shapes: z.object({
    circle: kangurGeometryShapeRecognitionLabelClueSchema,
    square: kangurGeometryShapeRecognitionLabelClueSchema,
    triangle: kangurGeometryShapeRecognitionLabelClueSchema,
    rectangle: kangurGeometryShapeRecognitionLabelClueSchema,
    oval: kangurGeometryShapeRecognitionLabelClueSchema,
    diamond: kangurGeometryShapeRecognitionLabelClueSchema,
  }),
  clues: z.object({
    title: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
    chips: z.object({
      corners: z.string().trim().min(1).max(120),
      sides: z.string().trim().min(1).max(120),
      curves: z.string().trim().min(1).max(120),
      longShortSides: z.string().trim().min(1).max(120),
    }),
    inset: z.string().trim().min(1).max(240),
  }),
  practice: z.object({
    slideTitle: z.string().trim().min(1).max(120),
    emptyRounds: z.string().trim().min(1).max(120),
    finished: z.object({
      status: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(160),
      subtitle: z.string().trim().min(1).max(240),
      restart: z.string().trim().min(1).max(120),
    }),
    progress: z.object({
      round: z.string().trim().min(1).max(120),
      score: z.string().trim().min(1).max(120),
    }),
    question: z.string().trim().min(1).max(120),
    feedback: z.object({
      correct: z.string().trim().min(1).max(120),
      incorrect: z.string().trim().min(1).max(160),
    }),
    actions: z.object({
      next: z.string().trim().min(1).max(120),
      finish: z.string().trim().min(1).max(120),
    }),
  }),
  intro: z.object({
    title: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
  }),
  summary: z.object({
    title: z.string().trim().min(1).max(120),
    status: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
    caption: z.string().trim().min(1).max(240),
  }),
  draw: z.object({
    stageTitle: z.string().trim().min(1).max(120),
    difficultyLabel: z.string().trim().min(1).max(120).optional(),
    finishLabel: z.string().trim().min(1).max(120),
  }),
});

export const kangurGeometrySymmetryLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_symmetry'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurGeometrySymmetryTitleDescriptionSchema,
    os: kangurGeometrySymmetryTitleDescriptionSchema,
    figury: kangurGeometrySymmetryTitleDescriptionSchema,
    podsumowanie: kangurGeometrySymmetryTitleDescriptionSchema,
    game: kangurGeometrySymmetryTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      whatIsSymmetry: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        callout: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      mirrorSymmetry: kangurGeometrySymmetryTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    os: z.object({
      axisOfSymmetry: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      axisInPractice: kangurGeometrySymmetryTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    figury: z.object({
      symmetricShapes: z.object({
        title: z.string().trim().min(1).max(120),
        circleNote: z.string().trim().min(1).max(240),
        cards: z.object({
          square: z.string().trim().min(1).max(160),
          rectangle: z.string().trim().min(1).max(160),
          circle: z.string().trim().min(1).max(160),
          isoscelesTriangle: z.string().trim().min(1).max(160),
          zigzag: z.string().trim().min(1).max(160),
          irregularPolygon: z.string().trim().min(1).max(160),
        }),
      }),
      symmetricOrNot: kangurGeometrySymmetryTitleCaptionSchema,
      rotational: kangurGeometrySymmetryTitleCaptionSchema,
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          item1: z.string().trim().min(1).max(240),
          item2: z.string().trim().min(1).max(240),
          item3: z.string().trim().min(1).max(240),
          item4: z.string().trim().min(1).max(240),
        }),
      }),
      axis: kangurGeometrySymmetryTitleCaptionSchema,
      manyAxes: kangurGeometrySymmetryTitleCaptionSchema,
      mirror: kangurGeometrySymmetryTitleCaptionSchema,
      rotation: kangurGeometrySymmetryTitleCaptionSchema,
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurLogicalClassificationLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_classification'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalClassificationTitleDescriptionSchema,
    diagram: kangurLogicalClassificationTitleDescriptionSchema,
    intruz: kangurLogicalClassificationTitleDescriptionSchema,
    podsumowanie: kangurLogicalClassificationTitleDescriptionSchema,
    game: kangurLogicalClassificationTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        criteriaLabel: z.string().trim().min(1).max(120),
        criteria: z.object({
          color: z.string().trim().min(1).max(160),
          shape: z.string().trim().min(1).max(160),
          size: z.string().trim().min(1).max(160),
          category: z.string().trim().min(1).max(160),
          number: z.string().trim().min(1).max(160),
        }),
      }),
      grouping: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        cards: z.object({
          flyingAnimals: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
          waterAnimals: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
          evenNumbers: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
          oddNumbers: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      shapeSorting: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        cards: z.object({
          circles: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
          squares: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
            note: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      categories: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        examplesLabel: z.string().trim().min(1).max(120),
        examples: z.object({
          fruit: z.string().trim().min(1).max(120),
          vegetables: z.string().trim().min(1).max(120),
          toys: z.string().trim().min(1).max(120),
        }),
      }),
    }),
    diagram: z.object({
      multiCriteria: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        gridCaption: z.string().trim().min(1).max(240),
        axesCaption: z.string().trim().min(1).max(240),
        exampleLabel: z.string().trim().min(1).max(160),
        items: z.object({
          bigRed: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
          bigBlue: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
          smallRed: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
          smallBlue: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
        }),
        summary: z.string().trim().min(1).max(160),
      }),
      venn: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        overlapCaption: z.string().trim().min(1).max(240),
        unionCaption: z.string().trim().min(1).max(240),
        exampleLabel: z.string().trim().min(1).max(160),
        zones: z.object({
          onlySport: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
          both: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
          onlyMusic: z.object({
            label: z.string().trim().min(1).max(120),
            icons: z.string().trim().min(1).max(120),
          }),
        }),
      }),
      switchCriteria: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        pickLabel: z.string().trim().min(1).max(120),
        tips: z.object({
          first: z.string().trim().min(1).max(240),
          second: z.string().trim().min(1).max(240),
        }),
      }),
    }),
    intruz: z.object({
      level1: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        examples: z.object({
          fruits: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
          numbers: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
          animals: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      level2: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        examples: z.object({
          multiples: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
          space: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
          shapes: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      level3: kangurLogicalClassificationTitleLeadCaptionSchema.extend({
        examples: z.object({
          shape: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
          color: z.object({
            items: z.string().trim().min(1).max(120),
            answer: z.string().trim().min(1).max(240),
          }),
        }),
      }),
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
        items: z.object({
          classification: z.string().trim().min(1).max(240),
          manyCriteria: z.string().trim().min(1).max(240),
          venn: z.string().trim().min(1).max(240),
          oddOneOut1: z.string().trim().min(1).max(240),
          oddOneOut2: z.string().trim().min(1).max(240),
          oddOneOut3: z.string().trim().min(1).max(240),
        }),
        closing: z.string().trim().min(1).max(240),
      }),
      color: kangurGeometrySymmetryTitleCaptionSchema,
      shape: kangurGeometrySymmetryTitleCaptionSchema,
      parity: kangurGeometrySymmetryTitleCaptionSchema,
      twoCriteria: kangurGeometrySymmetryTitleCaptionSchema,
      intersection: kangurGeometrySymmetryTitleCaptionSchema,
      oddOneOut: kangurGeometrySymmetryTitleCaptionSchema,
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurLogicalAnalogiesLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_analogies'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalAnalogiesTitleDescriptionSchema,
    liczby_ksztalty: kangurLogicalAnalogiesTitleDescriptionSchema,
    relacje: kangurLogicalAnalogiesTitleDescriptionSchema,
    podsumowanie: kangurLogicalAnalogiesTitleDescriptionSchema,
    game_relacje: kangurLogicalAnalogiesTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      introQuestion: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        notationLabel: z.string().trim().min(1).max(120),
        notationCaption: z.string().trim().min(1).max(240),
        examplePair: z.string().trim().min(1).max(160),
        exampleHint: z.string().trim().min(1).max(240),
        exampleAnswer: z.string().trim().min(1).max(160),
      }),
      relationBridge: kangurLogicalAnalogiesTitleLeadCaptionSchema,
      verbalAnalogies: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.object({
          dogCat: kangurLogicalAnalogiesPairHintAnswerSchema,
          hotCold: kangurLogicalAnalogiesPairHintAnswerSchema,
          fingerHand: kangurLogicalAnalogiesPairHintAnswerSchema,
          scissorsPencil: kangurLogicalAnalogiesPairHintAnswerSchema,
        }),
      }),
    }),
    liczby_ksztalty: z.object({
      numericAnalogies: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.object({
          double: kangurLogicalAnalogiesPairHintAnswerSchema.extend({
            workings: z.string().trim().min(1).max(240),
          }),
          half: kangurLogicalAnalogiesPairHintAnswerSchema.extend({
            workings: z.string().trim().min(1).max(240),
          }),
          square: kangurLogicalAnalogiesPairHintAnswerSchema.extend({
            workings: z.string().trim().min(1).max(240),
          }),
          triple: kangurLogicalAnalogiesPairHintAnswerSchema.extend({
            workings: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      shapeAnalogies: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        rules: z.object({
          rotate: z.object({
            rule: z.string().trim().min(1).max(160),
            sequence: z.string().trim().min(1).max(160),
          }),
          addOne: z.object({
            rule: z.string().trim().min(1).max(160),
            sequence: z.string().trim().min(1).max(160),
          }),
        }),
      }),
      numberMotion: kangurLogicalAnalogiesTitleLeadCaptionSchema,
      shapeTransform: kangurLogicalAnalogiesTitleLeadCaptionSchema,
    }),
    relacje: z.object({
      partWhole: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.object({
          pageBook: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          noteMelody: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          petalFlower: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          dropOcean: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
        }),
      }),
      partWholeAnimation: kangurLogicalAnalogiesTitleLeadCaptionSchema,
      causeEffect: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.object({
          rainSun: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          exerciseReading: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          winterSpring: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
        }),
      }),
      causeEffectAnimation: kangurLogicalAnalogiesTitleLeadCaptionSchema,
    }),
    podsumowanie: z.object({
      recap: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          analogy: z.string().trim().min(1).max(240),
          verbal: z.string().trim().min(1).max(240),
          numeric: z.string().trim().min(1).max(240),
          shapes: z.string().trim().min(1).max(240),
          partWhole: z.string().trim().min(1).max(240),
          causeEffect: z.string().trim().min(1).max(240),
        }),
        closing: z.string().trim().min(1).max(240),
      }),
      map: kangurLogicalAnalogiesTitleLeadCaptionSchema,
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
  animations: z.object({
    analogyBridge: z.string().trim().min(1).max(240),
    numberOperation: z.string().trim().min(1).max(240),
    shapeTransform: z.string().trim().min(1).max(240),
    partWhole: z.string().trim().min(1).max(240),
    causeEffect: z.string().trim().min(1).max(240),
  }),
});

export const kangurLogicalThinkingLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_thinking'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    wprowadzenie: kangurLogicalThinkingTitleDescriptionSchema,
    wzorce: kangurLogicalThinkingTitleDescriptionSchema,
    klasyfikacja: kangurLogicalThinkingTitleDescriptionSchema,
    wnioskowanie: kangurLogicalThinkingTitleDescriptionSchema,
    analogie: kangurLogicalThinkingTitleDescriptionSchema,
    zapamietaj: kangurLogicalThinkingTitleDescriptionSchema,
    wnioskowanie_gra: kangurLogicalThinkingTitleDescriptionSchema,
    laboratorium_gra: kangurLogicalThinkingTitleDescriptionSchema,
  }),
  slides: z.object({
    wprowadzenie: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        helpTitle: z.string().trim().min(1).max(120),
        helpItems: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
      }),
      steps: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        exampleLabel: z.string().trim().min(1).max(120),
        exampleSequence: z.string().trim().min(1).max(160),
        exampleAnswer: z.string().trim().min(1).max(240),
      }),
    }),
    wzorce: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        shapePrompt: z.string().trim().min(1).max(120),
        shapeSequence: z.string().trim().min(1).max(160),
        shapeAnswer: z.string().trim().min(1).max(240),
        numberPrompt: z.string().trim().min(1).max(120),
        numberSequence: z.string().trim().min(1).max(160),
        numberAnswer: z.string().trim().min(1).max(240),
      }),
      growth: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        examplePrompt: z.string().trim().min(1).max(120),
        exampleSequence: z.string().trim().min(1).max(160),
        exampleAnswer: z.string().trim().min(1).max(240),
      }),
    }),
    klasyfikacja: z.object({
      grouping: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        cards: z.object({
          fruits: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
          }),
          vegetables: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
          }),
          seaAnimals: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
          }),
          landAnimals: z.object({
            title: z.string().trim().min(1).max(120),
            items: z.string().trim().min(1).max(120),
          }),
        }),
        closing: z.string().trim().min(1).max(240),
      }),
      key: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        exampleLabel: z.string().trim().min(1).max(120),
        exampleItems: z.string().trim().min(1).max(120),
        exampleAnswer: z.string().trim().min(1).max(240),
      }),
      oddOneOut: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        itemsPrompt: z.string().trim().min(1).max(120),
        itemsSequence: z.string().trim().min(1).max(120),
        itemsAnswer: z.string().trim().min(1).max(240),
        numberPrompt: z.string().trim().min(1).max(120),
        numberSequence: z.string().trim().min(1).max(120),
        numberAnswer: z.string().trim().min(1).max(240),
      }),
    }),
    wnioskowanie: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        examples: z.array(z.string().trim().min(1).max(240)).min(1).max(6),
      }),
    }),
    wnioskowanie_gra: z.object({
      interactive: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    analogie: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        examples: z.array(z.string().trim().min(1).max(240)).min(1).max(6),
      }),
      map: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        example: z.string().trim().min(1).max(240),
      }),
    }),
    laboratorium_gra: z.object({
      interactive: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    zapamietaj: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
        items: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        closing: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  games: z.object({
    ifThen: z.object({
      rounds: z.array(kangurLogicalThinkingIfThenRoundSchema).min(1).max(8),
      ui: z.object({
        completion: z.object({
          title: z.string().trim().min(1).max(120),
          description: z.string().trim().min(1).max(240),
          restart: z.string().trim().min(1).max(120),
        }),
        header: z.object({
          stepTemplate: z.string().trim().min(1).max(120),
          instruction: z.string().trim().min(1).max(240),
          touchInstruction: z.string().trim().min(1).max(240),
        }),
        slots: z.object({
          fact: z.object({
            label: z.string().trim().min(1).max(120),
            hint: z.string().trim().min(1).max(240),
          }),
          rule: z.object({
            label: z.string().trim().min(1).max(120),
            hint: z.string().trim().min(1).max(240),
          }),
          conclusion: z.object({
            label: z.string().trim().min(1).max(120),
            hint: z.string().trim().min(1).max(240),
          }),
        }),
        deckTitle: z.string().trim().min(1).max(120),
        cardAriaTemplate: z.string().trim().min(1).max(120),
        feedback: z.object({
          fillAll: z.string().trim().min(1).max(240),
          successTemplate: z.string().trim().min(1).max(240),
          error: z.string().trim().min(1).max(240),
        }),
        actions: z.object({
          check: z.string().trim().min(1).max(120),
          retry: z.string().trim().min(1).max(120),
          next: z.string().trim().min(1).max(120),
        }),
      }),
    }),
    lab: z.object({
      analogyRounds: z.array(kangurLogicalThinkingLabAnalogyRoundSchema).min(1).max(8),
      ui: z.object({
        completion: z.object({
          title: z.string().trim().min(1).max(120),
          description: z.string().trim().min(1).max(240),
          restart: z.string().trim().min(1).max(120),
        }),
        header: z.object({
          stageTemplate: z.string().trim().min(1).max(120),
          instruction: z.string().trim().min(1).max(240),
        }),
        pattern: z.object({
          prompt: z.string().trim().min(1).max(160),
          slotLabels: z.object({
            first: z.string().trim().min(1).max(120),
            second: z.string().trim().min(1).max(120),
          }),
          filledSlotAriaTemplate: z.string().trim().min(1).max(120),
          emptySlotAriaTemplate: z.string().trim().min(1).max(120),
          selectTokenAriaTemplate: z.string().trim().min(1).max(120),
          selectedTemplate: z.string().trim().min(1).max(120),
          idle: z.string().trim().min(1).max(240),
          touchIdle: z.string().trim().min(1).max(240),
          touchSelectedTemplate: z.string().trim().min(1).max(240),
          moveToFirst: z.string().trim().min(1).max(120),
          moveToSecond: z.string().trim().min(1).max(120),
          moveToPool: z.string().trim().min(1).max(120),
        }),
        classify: z.object({
          prompt: z.string().trim().min(1).max(160),
          yesZoneLabel: z.string().trim().min(1).max(120),
          noZoneLabel: z.string().trim().min(1).max(120),
          yesZoneAriaLabel: z.string().trim().min(1).max(160),
          noZoneAriaLabel: z.string().trim().min(1).max(160),
          selectItemAriaTemplate: z.string().trim().min(1).max(120),
          selectedTemplate: z.string().trim().min(1).max(120),
          idle: z.string().trim().min(1).max(240),
          touchIdle: z.string().trim().min(1).max(240),
          touchSelectedTemplate: z.string().trim().min(1).max(240),
          moveToYes: z.string().trim().min(1).max(120),
          moveToNo: z.string().trim().min(1).max(120),
          moveToPool: z.string().trim().min(1).max(120),
        }),
        analogy: z.object({
          prompt: z.string().trim().min(1).max(120),
          optionAriaTemplate: z.string().trim().min(1).max(120),
        }),
        feedback: z.object({
          info: z.string().trim().min(1).max(240),
          success: z.string().trim().min(1).max(120),
          error: z.string().trim().min(1).max(120),
        }),
        actions: z.object({
          check: z.string().trim().min(1).max(120),
          retry: z.string().trim().min(1).max(120),
          next: z.string().trim().min(1).max(120),
          finish: z.string().trim().min(1).max(120),
        }),
      }),
    }),
  }),
  animations: z.object({
    intro: z.string().trim().min(1).max(240),
    steps: z.string().trim().min(1).max(240),
    pattern: z.string().trim().min(1).max(240),
    patternGrowth: z.string().trim().min(1).max(240),
    classification: z.string().trim().min(1).max(240),
    classificationKey: z.string().trim().min(1).max(240),
    reasoning: z.string().trim().min(1).max(240),
    analogies: z.string().trim().min(1).max(240),
    analogyMap: z.string().trim().min(1).max(240),
    summary: z.string().trim().min(1).max(240),
  }),
});

export const kangurLogicalPatternsLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_patterns'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalPatternsTitleDescriptionSchema,
    ciagi_arytm: kangurLogicalPatternsTitleDescriptionSchema,
    ciagi_geom: kangurLogicalPatternsTitleDescriptionSchema,
    strategie: kangurLogicalPatternsTitleDescriptionSchema,
    game_warsztat: kangurLogicalPatternsTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      whatIsPattern: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        everywhereLabel: z.string().trim().min(1).max(120),
        examples: z.object({
          alternatingColors: z.string().trim().min(1).max(120),
          increasingNumbers: z.string().trim().min(1).max(120),
          repeatingShape: z.string().trim().min(1).max(120),
          weekdays: z.string().trim().min(1).max(120),
        }),
      }),
      colorsAndShapes: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        answerLabel: z.string().trim().min(1).max(120),
        examples: z.object({
          ab: kangurLogicalPatternsExampleSchema,
          aab: kangurLogicalPatternsExampleSchema,
          abbc: kangurLogicalPatternsExampleSchema,
        }),
      }),
      patternUnit: kangurLogicalPatternsTitleLeadCaptionSchema,
      missingElement: kangurLogicalPatternsTitleLeadCaptionSchema,
      threeElementPattern: kangurLogicalPatternsTitleLeadCaptionSchema,
    }),
    ciagi_arytm: z.object({
      addition: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        answerLabel: z.string().trim().min(1).max(120),
        examples: z.object({
          plusTwo: kangurLogicalPatternsHintSequenceAnswerSchema,
          plusFive: kangurLogicalPatternsHintSequenceAnswerSchema,
          decreasingStep: kangurLogicalPatternsHintSequenceAnswerSchema,
        }),
      }),
      constantStep: kangurLogicalPatternsTitleLeadCaptionSchema,
      decreasing: kangurLogicalPatternsTitleLeadCaptionSchema,
    }),
    ciagi_geom: z.object({
      multiplicationFibonacci: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        answerLabel: z.string().trim().min(1).max(120),
        examples: z.object({
          timesTwo: kangurLogicalPatternsHintSequenceAnswerSchema,
          timesThree: kangurLogicalPatternsHintSequenceAnswerSchema,
          fibonacci: kangurLogicalPatternsHintSequenceAnswerSchema,
        }),
      }),
      geometricGrowth: kangurLogicalPatternsTitleLeadCaptionSchema,
      fibonacciMotion: kangurLogicalPatternsTitleLeadCaptionSchema,
      doublingDots: kangurLogicalPatternsTitleLeadCaptionSchema,
    }),
    strategie: z.object({
      howToLookForRule: z.object({
        title: z.string().trim().min(1).max(120),
        steps: z.object({
          countUnit: z.string().trim().min(1).max(240),
          checkDifference: z.string().trim().min(1).max(240),
          checkRatio: z.string().trim().min(1).max(240),
          previousRelation: z.string().trim().min(1).max(240),
          verifyRule: z.string().trim().min(1).max(240),
        }),
        exerciseLabel: z.string().trim().min(1).max(120),
        exerciseSequence: z.string().trim().min(1).max(120),
        exerciseAnswer: z.string().trim().min(1).max(240),
      }),
      checkDifferenceAndRatio: kangurLogicalPatternsTitleLeadCaptionSchema,
      checklist: kangurLogicalPatternsTitleLeadCaptionSchema,
      summary: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          repeatingUnit: z.string().trim().min(1).max(240),
          arithmetic: z.string().trim().min(1).max(240),
          geometric: z.string().trim().min(1).max(240),
          fibonacci: z.string().trim().min(1).max(240),
          strategy: z.string().trim().min(1).max(240),
        }),
        closing: z.string().trim().min(1).max(240),
      }),
    }),
  }),
  game: z.object({
    stageTitle: z.string().trim().min(1).max(120),
  }),
});

export const kangurLogicalReasoningLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_reasoning'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    wnioskowanie: kangurLogicalReasoningTitleDescriptionSchema,
    kwantyfikatory: kangurLogicalReasoningTitleDescriptionSchema,
    zagadki: kangurLogicalReasoningTitleDescriptionSchema,
    podsumowanie: kangurLogicalReasoningTitleDescriptionSchema,
    gra: kangurLogicalReasoningTitleDescriptionSchema,
  }),
  slides: z.object({
    wnioskowanie: z.object({
      basics: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        typesLabel: z.string().trim().min(1).max(120),
        types: z.object({
          deduction: kangurLogicalReasoningTitleExampleSchema,
          induction: kangurLogicalReasoningTitleExampleSchema,
        }),
      }),
      ifThen: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.array(kangurLogicalReasoningRuleNoteSchema).min(1).max(6),
        warning: z.object({
          title: z.string().trim().min(1).max(120),
          note: z.string().trim().min(1).max(240),
        }),
      }),
      deductionPractice: kangurLogicalReasoningTitleLeadCaptionSchema,
      induction: kangurLogicalReasoningTitleLeadCaptionSchema,
      condition: kangurLogicalReasoningTitleLeadCaptionSchema,
    }),
    kwantyfikatory: z.object({
      quantifiers: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        cards: z.array(kangurLogicalReasoningQuantifierCardSchema).min(1).max(6),
      }),
      trueFalse: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.array(kangurLogicalReasoningTrueFalseExampleSchema).min(1).max(8),
      }),
      scope: kangurLogicalReasoningTitleLeadCaptionSchema,
    }),
    zagadki: z.object({
      puzzle: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        titleLabel: z.string().trim().min(1).max(160),
        clues: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        solutionLabel: z.string().trim().min(1).max(120),
        solution: z.string().trim().min(1).max(480),
      }),
      steps: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        closing: z.string().trim().min(1).max(240),
      }),
      eliminate: kangurLogicalReasoningTitleLeadCaptionSchema,
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        closing: z.string().trim().min(1).max(240),
      }),
    }),
    gra: z.object({
      interactive: kangurLogicalReasoningTitleLeadSchema,
    }),
  }),
  game: z.object({
    cases: z.array(kangurLogicalReasoningCaseSchema).min(1).max(12),
    ui: z.object({
      header: z.object({
        eyebrow: z.string().trim().min(1).max(120),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().min(1).max(240),
        placedTemplate: z.string().trim().min(1).max(120),
      }),
      zones: z.object({
        pool: z.object({
          title: z.string().trim().min(1).max(120),
          hint: z.string().trim().min(1).max(240),
          ariaLabel: z.string().trim().min(1).max(160),
        }),
        valid: z.object({
          title: z.string().trim().min(1).max(120),
          hint: z.string().trim().min(1).max(240),
          ariaLabel: z.string().trim().min(1).max(160),
        }),
        invalid: z.object({
          title: z.string().trim().min(1).max(120),
          hint: z.string().trim().min(1).max(240),
          ariaLabel: z.string().trim().min(1).max(160),
        }),
      }),
      card: z.object({
        ifLabel: z.string().trim().min(1).max(120),
        factLabel: z.string().trim().min(1).max(120),
        conclusionLabel: z.string().trim().min(1).max(120),
        selectAriaTemplate: z.string().trim().min(1).max(160),
      }),
      status: z.object({
        correct: z.string().trim().min(1).max(120),
        wrong: z.string().trim().min(1).max(120),
      }),
      selection: z.object({
        selectedTemplate: z.string().trim().min(1).max(160),
        idle: z.string().trim().min(1).max(240),
        touchIdle: z.string().trim().min(1).max(240),
        touchSelectedTemplate: z.string().trim().min(1).max(240),
      }),
      moveButtons: z.object({
        toValid: z.string().trim().min(1).max(120),
        toInvalid: z.string().trim().min(1).max(120),
        toPool: z.string().trim().min(1).max(120),
      }),
      actions: z.object({
        check: z.string().trim().min(1).max(120),
        reset: z.string().trim().min(1).max(120),
      }),
      summary: z.object({
        perfect: z.string().trim().min(1).max(160),
        good: z.string().trim().min(1).max(160),
        retry: z.string().trim().min(1).max(160),
        resultTemplate: z.string().trim().min(1).max(120),
      }),
    }),
  }),
});

export const kangurLessonTemplateComponentContentSchema = z.discriminatedUnion('kind', [
  kangurAlphabetUnifiedLessonTemplateContentSchema,
  kangurMusicDiatonicScaleLessonTemplateContentSchema,
  kangurArtShapesBasicLessonTemplateContentSchema,
  kangurAddingLessonTemplateContentSchema,
  kangurSubtractingLessonTemplateContentSchema,
  kangurMultiplicationLessonTemplateContentSchema,
  kangurDivisionLessonTemplateContentSchema,
  kangurGeometryBasicsLessonTemplateContentSchema,
  kangurGeometryShapesLessonTemplateContentSchema,
  kangurGeometryShapeRecognitionLessonTemplateContentSchema,
  kangurGeometrySymmetryLessonTemplateContentSchema,
  kangurLogicalAnalogiesLessonTemplateContentSchema,
  kangurLogicalClassificationLessonTemplateContentSchema,
  kangurLogicalThinkingLessonTemplateContentSchema,
  kangurLogicalPatternsLessonTemplateContentSchema,
  kangurLogicalReasoningLessonTemplateContentSchema,
]);

export const kangurLessonTemplateSchema = z.object({
  componentId: kangurLessonComponentIdSchema,
  subject: kangurLessonSubjectSchema,
  ageGroup: kangurLessonAgeGroupSchema.optional(),
  label: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  emoji: z.string().trim().max(12),
  color: z.string().trim().max(60),
  activeBg: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  componentContent: kangurLessonTemplateComponentContentSchema.optional(),
});
export type KangurLessonTemplate = z.infer<typeof kangurLessonTemplateSchema>;
export type KangurLessonTemplateComponentContent = NonNullable<
  KangurLessonTemplate['componentContent']
>;
export type KangurAlphabetUnifiedLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'alphabet_unified' }
>;
export type KangurMusicDiatonicScaleLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'music_diatonic_scale' }
>;
export type KangurArtShapesBasicLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'art_shapes_basic' }
>;
export type KangurAddingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'adding' }
>;
export type KangurSubtractingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'subtracting' }
>;
export type KangurMultiplicationLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'multiplication' }
>;
export type KangurDivisionLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'division' }
>;
export type KangurGeometryBasicsLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_basics' }
>;
export type KangurGeometryShapesLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_shapes' }
>;
export type KangurGeometryShapeRecognitionLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_shape_recognition' }
>;
export type KangurGeometrySymmetryLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_symmetry' }
>;
export type KangurLogicalAnalogiesLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_analogies' }
>;
export type KangurLogicalClassificationLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_classification' }
>;
export type KangurLogicalThinkingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_thinking' }
>;
export type KangurLogicalPatternsLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_patterns' }
>;
export type KangurLogicalReasoningLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_reasoning' }
>;

export const kangurLessonTemplatesSchema = z.array(kangurLessonTemplateSchema);
export type KangurLessonTemplates = z.infer<typeof kangurLessonTemplatesSchema>;

export const kangurLessonTemplatesQuerySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  locale: optionalTrimmedQueryString(z.string().trim().min(2).max(16)),
});
export type KangurLessonTemplatesQuery = z.infer<typeof kangurLessonTemplatesQuerySchema>;

export const kangurLessonTemplatesReplacePayloadSchema = z.object({
  locale: z.string().trim().min(2).max(16).optional(),
  templates: kangurLessonTemplatesSchema,
});
export type KangurLessonTemplatesReplacePayload = z.infer<
  typeof kangurLessonTemplatesReplacePayloadSchema
>;
