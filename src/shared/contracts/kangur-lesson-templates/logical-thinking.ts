import { z } from 'zod';
import {
  kangurLogicalTitleDescriptionSchema,
} from './logical-shared';

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

export const kangurLogicalThinkingLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_thinking'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    wprowadzenie: kangurLogicalTitleDescriptionSchema,
    wzorce: kangurLogicalTitleDescriptionSchema,
    klasyfikacja: kangurLogicalTitleDescriptionSchema,
    wnioskowanie: kangurLogicalTitleDescriptionSchema,
    analogie: kangurLogicalTitleDescriptionSchema,
    zapamietaj: kangurLogicalTitleDescriptionSchema,
    wnioskowanie_gra: kangurLogicalTitleDescriptionSchema,
    laboratorium_gra: kangurLogicalTitleDescriptionSchema,
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
