import { z } from 'zod';

import { aiNodeTypeSchema } from './base';
import {
  audioOscillatorConfigSchema,
  audioSpeakerConfigSchema,
  boundsNormalizerConfigSchema,
  canvasOutputConfigSchema,
  contextConfigSchema,
  fetcherConfigSchema,
  mapperConfigSchema,
  mutatorConfigSchema,
  simulationConfigSchema,
  stringMutatorConfigSchema,
  triggerConfigSchema,
  validatorConfigSchema,
  viewerConfigSchema,
} from './nodes-primitives';

export * from './nodes-primitives';
export * from './nodes/logic-nodes';
export * from './nodes/transformation-nodes';
export * from './nodes/utility-nodes';
export * from './nodes/brain-nodes';
export * from './nodes/external-nodes';
export * from './nodes/database-nodes';
export * from './nodes/node-runtime';

export const parserSampleStateSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  simulationId: z.string().optional(),
  json: z.string(),
  mappingMode: z.enum(['top', 'flatten']),
  depth: z.number().int().positive(),
  keyStyle: z.enum(['path', 'leaf']),
  includeContainers: z.boolean(),
});
export type ParserSampleState = z.infer<typeof parserSampleStateSchema>;

export const updaterSampleStateSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  json: z.string().optional(),
  mappingMode: z.enum(['top', 'flatten']).optional(),
  depth: z.number().int().positive().optional(),
  keyStyle: z.enum(['path', 'leaf']).optional(),
  includeContainers: z.boolean().optional(),
});
export type UpdaterSampleState = z.infer<typeof updaterSampleStateSchema>;

import {
  switchConfigSchema,
  gateConfigSchema,
  compareConfigSchema,
  logicalConditionConfigSchema,
  routerConfigSchema,
} from './nodes/logic-nodes';
import {
  mathConfigSchema,
  templateConfigSchema,
  functionConfigSchema,
  bundleConfigSchema,
  regexConfigSchema,
  iteratorConfigSchema,
  parserConfigSchema,
} from './nodes/transformation-nodes';
import {
  constantConfigSchema,
  delayConfigSchema,
  stateConfigSchema,
  subgraphConfigSchema,
  validationPatternConfigSchema,
  pollConfigSchema,
} from './nodes/utility-nodes';
import {
  promptConfigSchema,
  modelConfigSchema,
  agentConfigSchema,
  learnerAgentConfigSchema,
} from './nodes/brain-nodes';
import {
  httpConfigSchema,
  advancedApiConfigSchema,
  playwrightConfigSchema,
} from './nodes/external-nodes';
import {
  dbSchemaConfigSchema,
  databaseConfigSchema,
} from './nodes/database-nodes';
import {
  nodeRuntimeConfigSchema,
  nodePortContractSchema,
} from './nodes/node-runtime';

export const nodeConfigSchema = z.object({
  trigger: triggerConfigSchema.optional(),
  fetcher: fetcherConfigSchema.optional(),
  simulation: simulationConfigSchema.optional(),
  audioOscillator: audioOscillatorConfigSchema.optional(),
  audioSpeaker: audioSpeakerConfigSchema.optional(),
  viewer: viewerConfigSchema.optional(),
  context: contextConfigSchema.optional(),
  regex: regexConfigSchema.optional(),
  iterator: iteratorConfigSchema.optional(),
  mapper: mapperConfigSchema.optional(),
  boundsNormalizer: boundsNormalizerConfigSchema.optional(),
  canvasOutput: canvasOutputConfigSchema.optional(),
  mutator: mutatorConfigSchema.optional(),
  stringMutator: stringMutatorConfigSchema.optional(),
  validator: validatorConfigSchema.optional(),
  validationPattern: validationPatternConfigSchema.optional(),
  constant: constantConfigSchema.optional(),
  math: mathConfigSchema.optional(),
  template: templateConfigSchema.optional(),
  function: functionConfigSchema.optional(),
  state: stateConfigSchema.optional(),
  switch: switchConfigSchema.optional(),
  subgraph: subgraphConfigSchema.optional(),
  bundle: bundleConfigSchema.optional(),
  gate: gateConfigSchema.optional(),
  compare: compareConfigSchema.optional(),
  logicalCondition: logicalConditionConfigSchema.optional(),
  router: routerConfigSchema.optional(),
  delay: delayConfigSchema.optional(),
  poll: pollConfigSchema.optional(),
  http: httpConfigSchema.optional(),
  apiAdvanced: advancedApiConfigSchema.optional(),
  playwright: playwrightConfigSchema.optional(),
  db_schema: dbSchemaConfigSchema.optional(),
  parser: parserConfigSchema.optional(),
  prompt: promptConfigSchema.optional(),
  model: modelConfigSchema.optional(),
  agent: agentConfigSchema.optional(),
  learnerAgent: learnerAgentConfigSchema.optional(),
  database: databaseConfigSchema.optional(),
  runtime: nodeRuntimeConfigSchema.optional(),
  notes: z
    .object({
      text: z.string().optional(),
      color: z.string().optional(),
      showOnCanvas: z.boolean().optional(),
    })
    .optional(),
});

export type NodeConfig = z.infer<typeof nodeConfigSchema>;

export const nodeDefinitionSchema = z.object({
  type: aiNodeTypeSchema,
  nodeTypeId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  config: nodeConfigSchema.optional(),
});

export type NodeDefinition = z.infer<typeof nodeDefinitionSchema>;

export const aiNodeSchema = z.object({
  id: z.string(),
  type: aiNodeTypeSchema,
  nodeTypeId: z.string().optional(),
  instanceId: z.string().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  config: nodeConfigSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type AiNode = z.infer<typeof aiNodeSchema>;
