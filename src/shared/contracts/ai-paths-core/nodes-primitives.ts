import { z } from 'zod';

import { aiPathsValidationRuleSchema } from './base';

export const aiPathsValidationDocsSyncStateSchema = z.object({
  lastSnapshotHash: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  lastSyncStatus: z.enum(['idle', 'success', 'warning', 'error']).optional(),
  lastSyncWarnings: z.array(z.string()).optional(),
  sourceCount: z.number().optional(),
  candidateCount: z.number().optional(),
});
export type AiPathsValidationDocsSyncState = z.infer<typeof aiPathsValidationDocsSyncStateSchema>;

export const aiPathsValidationPolicySchema = z.enum([
  'report_only',
  'warn_below_threshold',
  'block_below_threshold',
]);
export type AiPathsValidationPolicy = z.infer<typeof aiPathsValidationPolicySchema>;

export const aiPathsValidationConfigSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  policy: aiPathsValidationPolicySchema.optional(),
  warnThreshold: z.number().optional(),
  blockThreshold: z.number().optional(),
  baseScore: z.number().optional(),
  lastEvaluatedAt: z.string().nullable().optional(),
  collectionMap: z.record(z.string(), z.string()).optional(),
  docsSources: z.array(z.string()).optional(),
  rules: z.array(aiPathsValidationRuleSchema).optional(),
  inferredCandidates: z.array(aiPathsValidationRuleSchema).optional(),
  docsSyncState: aiPathsValidationDocsSyncStateSchema.optional(),
});
export type AiPathsValidationConfig = z.infer<typeof aiPathsValidationConfigSchema>;

export const aiEdgeSchema = z.object({
  id: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  fromPort: z.string().nullable().optional(),
  toPort: z.string().nullable().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const edgeSchema = aiEdgeSchema;

export type Edge = z.infer<typeof aiEdgeSchema>;

export const triggerConfigSchema = z.object({
  event: z.string(),
  contextMode: z.enum(['simulation_required', 'simulation_preferred', 'trigger_only']).optional(),
});

export type TriggerConfigDto = z.infer<typeof triggerConfigSchema>;
export type TriggerConfig = TriggerConfigDto;
export type TriggerContextMode = NonNullable<TriggerConfig['contextMode']>;

export const simulationConfigSchema = z.object({
  productId: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  runBehavior: z.enum(['before_connected_trigger', 'manual_only']).optional(),
});

export type SimulationConfigDto = z.infer<typeof simulationConfigSchema>;
export type SimulationConfig = SimulationConfigDto;
export type SimulationRunBehavior = NonNullable<SimulationConfig['runBehavior']>;

export const fetcherConfigSchema = z.object({
  sourceMode: z.enum(['live_context', 'simulation_id', 'live_then_simulation']).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  productId: z.string().optional(),
});

export type FetcherConfigDto = z.infer<typeof fetcherConfigSchema>;
export type FetcherConfig = FetcherConfigDto;
export type FetcherSourceMode = NonNullable<FetcherConfig['sourceMode']>;

export const viewerConfigSchema = z.object({
  outputs: z.record(z.string(), z.string()),
  showImagesAsJson: z.boolean().optional(),
});

export type ViewerConfigDto = z.infer<typeof viewerConfigSchema>;
export type ViewerConfig = ViewerConfigDto;

export const contextConfigSchema = z.object({
  role: z.string(),
  entityType: z.string().optional(),
  entityIdSource: z.string().optional(),
  entityId: z.string().optional(),
  scopeMode: z.string().optional(),
  scopeTarget: z.string().optional(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
});

export type ContextConfigDto = z.infer<typeof contextConfigSchema>;
export type ContextConfig = ContextConfigDto;

export const audioOscillatorConfigSchema = z.object({
  waveform: z.enum(['sine', 'square', 'triangle', 'sawtooth']).optional(),
  frequencyHz: z.number().optional(),
  gain: z.number().optional(),
  durationMs: z.number().optional(),
  frequency: z.number().optional(),
  type: z.enum(['sine', 'square', 'sawtooth', 'triangle']).optional(),
});

export type AudioOscillatorConfigDto = z.infer<typeof audioOscillatorConfigSchema>;
export type AudioOscillatorConfig = AudioOscillatorConfigDto;

export const audioSpeakerConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoPlay: z.boolean().optional(),
  gain: z.number().optional(),
  stopPrevious: z.boolean().optional(),
  volume: z.number().optional(),
});

export type AudioSpeakerConfigDto = z.infer<typeof audioSpeakerConfigSchema>;
export type AudioSpeakerConfig = AudioSpeakerConfigDto;

export const mapperConfigSchema = z.object({
  mappings: z.record(z.string(), z.string()),
  outputs: z.array(z.string()).optional(),
  jsonIntegrityPolicy: z.string().optional(),
});

export type MapperConfigDto = z.infer<typeof mapperConfigSchema>;
export type MapperConfig = MapperConfigDto;

export const boundsNormalizerFormatSchema = z.enum([
  'pixels',
  'gemini_millirelative',
  'yolo_relative',
  'percentage',
]);

export type BoundsNormalizerFormat = z.infer<typeof boundsNormalizerFormatSchema>;

export const boundsNormalizerInputFormatSchema = z.enum([
  'pixels_tlwh',
  'pixels_tlbr',
  'gemini_millirelative',
  'relative_xywh',
  'percentage_tlwh',
  'auto',
]);

export type BoundsNormalizerInputFormat = z.infer<typeof boundsNormalizerInputFormatSchema>;

export const boundsNormalizerConfigSchema = z.object({
  format: boundsNormalizerFormatSchema.optional(),
  inputFormat: boundsNormalizerInputFormatSchema.optional(),
  boundsPath: z.string().optional(),
  imageWidthPath: z.string().optional(),
  imageHeightPath: z.string().optional(),
  leftField: z.string().optional(),
  topField: z.string().optional(),
  widthField: z.string().optional(),
  heightField: z.string().optional(),
  rootPath: z.string().optional(),
  fieldOverrides: z
    .object({
      left: z.string().optional(),
      top: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
    })
    .optional(),
  confidencePath: z.string().optional(),
  labelPath: z.string().optional(),
});

export type BoundsNormalizerConfigDto = z.infer<typeof boundsNormalizerConfigSchema>;
export type BoundsNormalizerConfig = BoundsNormalizerConfigDto;

export const canvasOutputConfigSchema = z.object({
  outputKey: z.string().optional(),
  boundsPath: z.string().optional(),
  rootPath: z.string().optional(),
  leftField: z.string().optional(),
  topField: z.string().optional(),
  widthField: z.string().optional(),
  heightField: z.string().optional(),
  confidencePath: z.string().optional(),
  labelPath: z.string().optional(),
});

export type CanvasOutputConfigDto = z.infer<typeof canvasOutputConfigSchema>;
export type CanvasOutputConfig = CanvasOutputConfigDto;

export const mutatorConfigSchema = z.object({
  path: z.string(),
  value: z.string().optional(),
  valueTemplate: z.string().optional(),
});

export type MutatorConfigDto = z.infer<typeof mutatorConfigSchema>;
export type MutatorConfig = MutatorConfigDto;

export const stringMutatorOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('trim'), mode: z.enum(['both', 'left', 'right']).optional() }),
  z.object({
    type: z.literal('replace'),
    search: z.string(),
    replace: z.string(),
    matchMode: z.enum(['first', 'all']).optional(),
    useRegex: z.boolean().optional(),
    flags: z.string().optional(),
  }),
  z.object({
    type: z.literal('remove'),
    search: z.string(),
    matchMode: z.enum(['first', 'all']).optional(),
    useRegex: z.boolean().optional(),
    flags: z.string().optional(),
  }),
  z.object({ type: z.literal('case'), mode: z.enum(['lower', 'upper']).optional() }),
  z.object({
    type: z.literal('append'),
    value: z.string().optional(),
    position: z.enum(['prefix', 'suffix']).optional(),
  }),
  z.object({ type: z.literal('slice'), start: z.number().optional(), end: z.number().optional() }),
]);

export type StringMutatorOperation = z.infer<typeof stringMutatorOperationSchema>;

export const stringMutatorConfigSchema = z.object({
  operations: z.array(stringMutatorOperationSchema).optional(),
  operation: z.string().optional(),
  value: z.string().optional(),
});

export type StringMutatorConfigDto = z.infer<typeof stringMutatorConfigSchema>;
export type StringMutatorConfig = StringMutatorConfigDto;

export const validatorConfigSchema = z.object({
  rule: z.string().optional(),
  requiredPaths: z.array(z.string()).optional(),
  mode: z.enum(['all', 'any']).optional(),
});

export type ValidatorConfigDto = z.infer<typeof validatorConfigSchema>;
export type ValidatorConfig = ValidatorConfigDto;
