import type { NodeType } from '@/shared/contracts/ai-paths';


import { audioOscillatorDocs, audioSpeakerDocs } from './node-docs/audio';
import {
  databaseDocs,
  dbSchemaDocs,
  viewerDocs,
  notificationDocs,
} from './node-docs/data';
import {
  httpDocs,
  apiAdvancedDocs,
  playwrightDocs,
  promptDocs,
  modelDocs,
  agentDocs,
  learnerAgentDocs,
} from './node-docs/integration';
import {
  boundsNormalizerDocs,
  canvasOutputDocs,
  contextDocs,
  parserDocs,
  regexDocs,
  iteratorDocs,
  mapperDocs,
  mutatorDocs,
  stringMutatorDocs,
  validatorDocs,
  validationPatternDocs,
} from './node-docs/transform';
import { triggerDocs, fetcherDocs, simulationDocs } from './node-docs/trigger';
import {
  constantDocs,
  mathDocs,
  templateDocs,
  bundleDocs,
  gateDocs,
  compareDocs,
  routerDocs,
  delayDocs,
  pollDocs,
} from './node-docs/utils';

import type { NodeConfigDocField } from './node-docs.types';

export const CONFIG_DOCS_BY_TYPE: Partial<Record<NodeType, NodeConfigDocField[]>> = {
  trigger: triggerDocs,
  fetcher: fetcherDocs,
  simulation: simulationDocs,
  audio_oscillator: audioOscillatorDocs,
  audio_speaker: audioSpeakerDocs,
  context: contextDocs,
  parser: parserDocs,
  regex: regexDocs,
  iterator: iteratorDocs,
  mapper: mapperDocs,
  bounds_normalizer: boundsNormalizerDocs,
  canvas_output: canvasOutputDocs,
  mutator: mutatorDocs,
  string_mutator: stringMutatorDocs,
  validator: validatorDocs,
  validation_pattern: validationPatternDocs,
  constant: constantDocs,
  math: mathDocs,
  template: templateDocs,
  bundle: bundleDocs,
  gate: gateDocs,
  compare: compareDocs,
  router: routerDocs,
  delay: delayDocs,
  poll: pollDocs,
  http: httpDocs,
  api_advanced: apiAdvancedDocs,
  playwright: playwrightDocs,
  prompt: promptDocs,
  model: modelDocs,
  agent: agentDocs,
  learner_agent: learnerAgentDocs,
  database: databaseDocs,
  db_schema: dbSchemaDocs,
  viewer: viewerDocs,
  notification: notificationDocs,
};
