import { z } from 'zod';

export const mathConfigSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'round', 'ceil', 'floor']).optional(),
  value: z.number().optional(),
  operand: z.number().optional(),
});

export type MathConfigDto = z.infer<typeof mathConfigSchema>;
export type MathConfig = MathConfigDto;

export const templateConfigSchema = z.object({
  template: z.string(),
});

export type TemplateConfigDto = z.infer<typeof templateConfigSchema>;
export type TemplateConfig = TemplateConfigDto;

export const functionConfigSchema = z.object({
  script: z.string(),
  contextJson: z.string().optional(),
  maxExecutionMs: z.number().int().min(1).max(10_000).optional(),
  maxOutputBytes: z.number().int().min(1024).max(512_000).optional(),
  safeMode: z.boolean().optional(),
  expectedType: z.enum(['string', 'number', 'boolean', 'object', 'array']).optional(),
});

export type FunctionConfigDto = z.infer<typeof functionConfigSchema>;
export type FunctionConfig = FunctionConfigDto;

export const bundleConfigSchema = z.object({
  keys: z.array(z.string()).optional(),
  includePorts: z.array(z.string()).optional(),
});

export type BundleConfigDto = z.infer<typeof bundleConfigSchema>;
export type BundleConfig = BundleConfigDto;

export const regexModeSchema = z.enum(['group', 'extract', 'extract_json']);
export const regexMatchModeSchema = z.enum(['first', 'first_overall', 'all']);
export const regexGroupOutputModeSchema = z.enum(['object', 'array']);

export const regexTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(),
  flags: z.string().optional(),
  mode: regexModeSchema.optional(),
  matchMode: regexMatchModeSchema.optional(),
  groupBy: z.string().optional(),
  outputMode: regexGroupOutputModeSchema.optional(),
  includeUnmatched: z.boolean().optional(),
  unmatchedKey: z.string().optional(),
  splitLines: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RegexTemplateDto = z.infer<typeof regexTemplateSchema>;
export type RegexTemplate = RegexTemplateDto;

export const regexConfigSchema = z.object({
  pattern: z.string(),
  flags: z.string().optional(),
  mode: regexModeSchema.optional(),
  matchMode: regexMatchModeSchema.optional(),
  groupBy: z.string().optional(),
  outputMode: regexGroupOutputModeSchema.optional(),
  includeUnmatched: z.boolean().optional(),
  unmatchedKey: z.string().optional(),
  splitLines: z.boolean().optional(),
  sampleText: z.string().optional(),
  aiPrompt: z.string().optional(),
  aiAutoRun: z.boolean().optional(),
  activeVariant: z.enum(['manual', 'ai']).optional(),
  manual: z
    .object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() })
    .optional(),
  aiProposal: z
    .object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() })
    .optional(),
  aiProposals: z
    .array(
      z.object({
        pattern: z.string(),
        flags: z.string().optional(),
        groupBy: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional(),
  templates: z.array(regexTemplateSchema).optional(),
  jsonIntegrityPolicy: z.enum(['strict', 'repair']).optional(),
});

export type RegexConfigDto = z.infer<typeof regexConfigSchema>;
export type RegexConfig = RegexConfigDto;

export const iteratorConfigSchema = z.object({
  autoContinue: z.boolean().optional(),
  maxSteps: z.number().optional(),
});

export type IteratorConfigDto = z.infer<typeof iteratorConfigSchema>;
export type IteratorConfig = IteratorConfigDto;

export const parserConfigSchema = z.object({
  mappings: z.record(z.string(), z.string()),
  outputMode: z.enum(['individual', 'bundle']).optional(),
  presetId: z.string().optional(),
});

export type ParserConfigDto = z.infer<typeof parserConfigSchema>;
export type ParserConfig = ParserConfigDto;
