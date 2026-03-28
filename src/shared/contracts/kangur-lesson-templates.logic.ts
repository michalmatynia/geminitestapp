import { z } from 'zod';

import { createLegacyCompatibleLessonShellSchema } from './kangur-lesson-templates.shared';

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

const kangurLogicalTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Logical analogies game title is required.'),
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Logical patterns game title is required.'),
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
