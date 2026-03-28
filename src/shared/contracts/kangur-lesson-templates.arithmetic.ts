import { z } from 'zod';

import { createLegacyCompatibleLessonShellSchema } from './kangur-lesson-templates.shared';

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
  game: createLegacyCompatibleLessonShellSchema(
    {
      preludeChip: z.string().trim().min(1).max(120),
      preludeCaption: z.string().trim().min(1).max(240),
    },
    'Multiplication game title is required.',
  ),
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Adding game title is required.'),
  synthesis: createLegacyCompatibleLessonShellSchema({}, 'Adding synthesis title is required.'),
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Subtracting game title is required.'),
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
  game: createLegacyCompatibleLessonShellSchema({}, 'Division game title is required.'),
});
