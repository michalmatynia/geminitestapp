import { z } from 'zod';
import { createLegacyCompatibleLessonShellSchema } from '../kangur-lesson-templates.shared';
import {
  kangurLogicalTitleDescriptionSchema,
  kangurLogicalTitleLeadCaptionSchema,
} from './logical-shared';

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

export const kangurLogicalPatternsLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_patterns'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalTitleDescriptionSchema,
    ciagi_arytm: kangurLogicalTitleDescriptionSchema,
    ciagi_geom: kangurLogicalTitleDescriptionSchema,
    strategie: kangurLogicalTitleDescriptionSchema,
    game_warsztat: kangurLogicalTitleDescriptionSchema,
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
      patternUnit: kangurLogicalTitleLeadCaptionSchema,
      missingElement: kangurLogicalTitleLeadCaptionSchema,
      threeElementPattern: kangurLogicalTitleLeadCaptionSchema,
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
      constantStep: kangurLogicalTitleLeadCaptionSchema,
      decreasing: kangurLogicalTitleLeadCaptionSchema,
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
      geometricGrowth: kangurLogicalTitleLeadCaptionSchema,
      fibonacciMotion: kangurLogicalTitleLeadCaptionSchema,
      doublingDots: kangurLogicalTitleLeadCaptionSchema,
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
      checkDifferenceAndRatio: kangurLogicalTitleLeadCaptionSchema,
      checklist: kangurLogicalTitleLeadCaptionSchema,
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Logical patterns game title is required.'),
});
