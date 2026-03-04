import { z } from 'zod';

import { dtoBaseSchema } from '../base';
import {
  type PromptExploderListItem,
  promptExploderListItemSchema,
  promptExploderSegmentTypeSchema,
  type PromptExploderSegmentType,
} from './base';

/**
 * Prompt Exploder Document Structure DTOs
 */

export const promptExploderSubsectionSchema: z.ZodType<PromptExploderSubsection> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    segments: z.array(z.lazy(() => promptExploderSegmentSchema)).optional(),
    code: z.string().nullable().optional(),
    items: z.array(z.lazy(() => promptExploderListItemSchema)).optional(),
    condition: z.string().nullable().optional(),
    guidance: z.string().nullable().optional(),
  })
);

export interface PromptExploderSubsection {
  id: string;
  title: string;
  segments?: PromptExploderSegment[];
  code?: string | null;
  items?: PromptExploderListItem[];
  condition?: string | null;
  guidance?: string | null;
}

export const promptExploderBindingTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'json',
  'list',
  'depends_on',
  'references',
]);
export type PromptExploderBindingType = z.infer<typeof promptExploderBindingTypeSchema>;

export const promptExploderBindingOriginSchema = z.enum([
  'user',
  'system',
  'learned',
  'inferred',
  'manual',
  'auto',
]);
export type PromptExploderBindingOrigin = z.infer<typeof promptExploderBindingOriginSchema>;

export const promptExploderParamUiControlSchema = z.enum([
  'text',
  'textarea',
  'select',
  'slider',
  'switch',
  'auto',
  'checkbox',
  'buttons',
  'number',
  'json',
  'rgb',
  'tuple2',
]);
export type PromptExploderParamUiControl = z.infer<typeof promptExploderParamUiControlSchema>;

export const promptExploderBindingSchema = z.object({
  key: z.string().optional(),
  type: z.union([promptExploderBindingTypeSchema, z.string()]).optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  uiControl: promptExploderParamUiControlSchema.optional(),
  options: z.array(promptExploderListItemSchema).optional(),
  origin: promptExploderBindingOriginSchema.optional(),
  id: z.string().optional(),
  fromSegmentId: z.string().optional(),
  toSegmentId: z.string().optional(),
  fromSubsectionId: z.string().nullable().optional(),
  toSubsectionId: z.string().nullable().optional(),
  sourceLabel: z.string().optional(),
  targetLabel: z.string().optional(),
});

export type PromptExploderBinding = z.infer<typeof promptExploderBindingSchema>;

export const promptExploderSegmentSchema: z.ZodType<PromptExploderSegment> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: promptExploderSegmentTypeSchema,
    title: z.string().nullable().optional(),
    content: z.string().optional(),
    condition: z.string().nullable().optional(),
    items: z.array(promptExploderListItemSchema).default([]),
    listItems: z.array(promptExploderListItemSchema).default([]),
    subsections: z.array(promptExploderSubsectionSchema).default([]),
    bindingKey: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    raw: z.string().nullable().optional(),
    paramsText: z.string().nullable().optional(),
    paramsObject: z.record(z.string(), z.unknown()).nullable().optional(),
    paramUiControls: z.record(z.string(), promptExploderParamUiControlSchema).default({}),
    paramComments: z.record(z.string(), z.string()).default({}),
    paramDescriptions: z.record(z.string(), z.string()).default({}),
    code: z.string().nullable().optional(),
    includeInOutput: z.boolean().default(true),
    confidence: z.number().default(0),
    matchedPatternIds: z.array(z.string()).default([]),
    matchedPatternLabels: z.array(z.string()).default([]),
    matchedSequenceLabels: z.array(z.string()).default([]),
    isHeading: z.boolean().optional(),
    treatAsHeading: z.boolean().optional(),
    suggestedTreatAsHeading: z.boolean().optional(),
    ruleCount: z.number().optional(),
    ruleStack: z.record(z.string(), z.unknown()).optional(),
    validationResults: z.array(z.string()).default([]),
    bindings: z.record(z.string(), z.unknown()).optional(),
    segments: z.array(promptExploderSegmentSchema).default([]),
  })
);

export interface PromptExploderSegment {
  id: string;
  type: PromptExploderSegmentType;
  title?: string | null;
  content?: string;
  condition?: string | null;
  items: PromptExploderListItem[];
  listItems: PromptExploderListItem[];
  subsections: PromptExploderSubsection[];
  bindingKey?: string | null;
  text?: string | null;
  raw?: string | null;
  paramsText?: string | null;
  paramsObject?: Record<string, unknown> | null;
  paramUiControls: Record<string, PromptExploderParamUiControl>;
  paramComments: Record<string, string>;
  paramDescriptions: Record<string, string>;
  code?: string | null;
  includeInOutput: boolean;
  confidence: number;
  matchedPatternIds: string[];
  matchedPatternLabels: string[];
  matchedSequenceLabels: string[];
  isHeading?: boolean;
  treatAsHeading?: boolean;
  suggestedTreatAsHeading?: boolean;
  ruleCount?: number;
  ruleStack?: Record<string, unknown>;
  validationResults: string[];
  bindings?: Record<string, unknown>;
  segments: PromptExploderSegment[];
}

export const promptExploderDocumentSchema = dtoBaseSchema.extend({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  bindings: z.array(promptExploderBindingSchema).default([]),
  sections: z.array(promptExploderSubsectionSchema).default([]),
  isActive: z.boolean().optional(),
  version: z.number().default(1),
  sourcePrompt: z.string().optional(),
  segments: z.array(promptExploderSegmentSchema).default([]),
  subsections: z.array(promptExploderSubsectionSchema).default([]),
  variables: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  diagnostics: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reassembledPrompt: z.string().optional(),
  promptLength: z.number().optional(),
  estimatedTokens: z.number().optional(),
  lastReassembledAt: z.string().optional(),
});

export type PromptExploderDocument = z.infer<typeof promptExploderDocumentSchema>;
