import { z } from 'zod';
import {
  kangurLogicalTitleDescriptionSchema,
  kangurLogicalTitleLeadCaptionSchema,
  kangurLogicalTitleLeadSchema,
} from './logical-shared';

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

export const kangurLogicalReasoningLessonTemplateContentSchema = z.object({
  kind: z.literal('logical_reasoning'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    wnioskowanie: kangurLogicalTitleDescriptionSchema,
    kwantyfikatory: kangurLogicalTitleDescriptionSchema,
    zagadki: kangurLogicalTitleDescriptionSchema,
    podsumowanie: kangurLogicalTitleDescriptionSchema,
    gra: kangurLogicalTitleDescriptionSchema,
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
      deductionPractice: kangurLogicalTitleLeadCaptionSchema,
      induction: kangurLogicalTitleLeadCaptionSchema,
      condition: kangurLogicalTitleLeadCaptionSchema,
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
      scope: kangurLogicalTitleLeadCaptionSchema,
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
      eliminate: kangurLogicalTitleLeadCaptionSchema,
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
        closing: z.string().trim().min(1).max(240),
      }),
    }),
    gra: z.object({
      interactive: kangurLogicalTitleLeadSchema,
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
