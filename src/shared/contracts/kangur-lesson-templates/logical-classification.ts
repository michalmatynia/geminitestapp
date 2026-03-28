import { z } from 'zod';
import { createLegacyCompatibleLessonShellSchema } from '../kangur-lesson-templates.shared';
import {
  kangurLogicalTitleDescriptionSchema,
  kangurLogicalTitleLeadCaptionSchema,
  kangurLogicalTitleCaptionSchema,
} from './logical-shared';

export const kangurLogicalClassificationLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_classification'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurLogicalTitleDescriptionSchema,
    diagram: kangurLogicalTitleDescriptionSchema,
    intruz: kangurLogicalTitleDescriptionSchema,
    podsumowanie: kangurLogicalTitleDescriptionSchema,
    game: kangurLogicalTitleDescriptionSchema,
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
      grouping: kangurLogicalTitleLeadCaptionSchema.extend({
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
      shapeSorting: kangurLogicalTitleLeadCaptionSchema.extend({
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
      categories: kangurLogicalTitleLeadCaptionSchema.extend({
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
      switchCriteria: kangurLogicalTitleLeadCaptionSchema.extend({
        pickLabel: z.string().trim().min(1).max(120),
        tips: z.object({
          first: z.string().trim().min(1).max(240),
          second: z.string().trim().min(1).max(240),
        }),
      }),
    }),
    intruz: z.object({
      level1: kangurLogicalTitleLeadCaptionSchema.extend({
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
      level2: kangurLogicalTitleLeadCaptionSchema.extend({
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
      level3: kangurLogicalTitleLeadCaptionSchema.extend({
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
      color: kangurLogicalTitleCaptionSchema,
      shape: kangurLogicalTitleCaptionSchema,
      parity: kangurLogicalTitleCaptionSchema,
      twoCriteria: kangurLogicalTitleCaptionSchema,
      intersection: kangurLogicalTitleCaptionSchema,
      oddOneOut: kangurLogicalTitleCaptionSchema,
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema(
    {},
    'Logical classification game title is required.',
  ),
});
