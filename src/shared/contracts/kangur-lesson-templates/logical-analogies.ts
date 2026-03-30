import { z } from 'zod';
import { createLegacyCompatibleLessonShellSchema } from '../kangur-lesson-templates.shared';
import {
  kangurLogicalTitleDescriptionSchema,
  kangurLogicalTitleLeadCaptionSchema,
} from './logical-shared';

const kangurLogicalAnalogiesPairHintAnswerSchema = z.object({
  pair: z.string().trim().min(1).max(160),
  hint: z.string().trim().min(1).max(240).optional(),
  answer: z.string().trim().min(1).max(240),
});

export const kangurLogicalAnalogiesLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_analogies'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalTitleDescriptionSchema,
    liczby_ksztalty: kangurLogicalTitleDescriptionSchema,
    relacje: kangurLogicalTitleDescriptionSchema,
    podsumowanie: kangurLogicalTitleDescriptionSchema,
    game_relacje: kangurLogicalTitleDescriptionSchema,
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
      relationBridge: kangurLogicalTitleLeadCaptionSchema,
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
      numberMotion: kangurLogicalTitleLeadCaptionSchema,
      shapeTransform: kangurLogicalTitleLeadCaptionSchema,
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
      partWholeAnimation: kangurLogicalTitleLeadCaptionSchema,
      causeEffect: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        examples: z.object({
          rainSun: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          exerciseReading: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
          winterSpring: kangurLogicalAnalogiesPairHintAnswerSchema.omit({ hint: true }),
        }),
      }),
      causeEffectAnimation: kangurLogicalTitleLeadCaptionSchema,
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
      map: kangurLogicalTitleLeadCaptionSchema,
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema({}, 'Logical analogies game title is required.'),
  animations: z.object({
    analogyBridge: z.string().trim().min(1).max(240),
    numberOperation: z.string().trim().min(1).max(240),
    shapeTransform: z.string().trim().min(1).max(240),
    partWhole: z.string().trim().min(1).max(240),
    causeEffect: z.string().trim().min(1).max(240),
  }),
});
