import React from 'react';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { useAiPathSelection } from './AiPathConfigContext';
import { ContextNodeConfigSection } from './node-config/ContextNodeConfigSection';
import { DatabaseNodeConfigSection } from './node-config/DatabaseNodeConfigSection';
import { DbSchemaNodeConfigSection } from './node-config/DbSchemaNodeConfigSection';
import { AgentNodeConfigSection } from './node-config/dialog/AgentNodeConfigSection';
import { ApiAdvancedNodeConfigSection } from './node-config/dialog/ApiAdvancedNodeConfigSection';
import { AudioOscillatorNodeConfigSection } from './node-config/dialog/AudioOscillatorNodeConfigSection';
import { AudioSpeakerNodeConfigSection } from './node-config/dialog/AudioSpeakerNodeConfigSection';
import { BoundsNormalizerNodeConfigSection } from './node-config/dialog/BoundsNormalizerNodeConfigSectionImpl';
import { BundleNodeConfigSection } from './node-config/dialog/BundleNodeConfigSection';
import { CanvasOutputNodeConfigSection } from './node-config/dialog/CanvasOutputNodeConfigSectionImpl';
import { CompareNodeConfigSection } from './node-config/dialog/CompareNodeConfigSection';
import { ConstantNodeConfigSection } from './node-config/dialog/ConstantNodeConfigSection';
import { DelayNodeConfigSection } from './node-config/dialog/DelayNodeConfigSection';
import { FetcherNodeConfigSection } from './node-config/dialog/FetcherNodeConfigSection';
import { FunctionNodeConfigSection } from './node-config/dialog/FunctionNodeConfigSection';
import { GateNodeConfigSection } from './node-config/dialog/GateNodeConfigSection';
import { HttpNodeConfigSection } from './node-config/dialog/HttpNodeConfigSection';
import { IteratorNodeConfigSection } from './node-config/dialog/IteratorNodeConfigSection';
import { LearnerAgentNodeConfigSection } from './node-config/dialog/LearnerAgentNodeConfigSection';
import { LogicalConditionNodeConfigSection } from './node-config/dialog/LogicalConditionNodeConfigSection';
import { MapperNodeConfigSection } from './node-config/dialog/MapperNodeConfigSection';
import { MathNodeConfigSection } from './node-config/dialog/MathNodeConfigSection';
import { ModelNodeConfigSection } from './node-config/dialog/ModelNodeConfigSection';
import { MutatorNodeConfigSection } from './node-config/dialog/MutatorNodeConfigSection';
import { PlaywrightNodeConfigSection } from './node-config/dialog/PlaywrightNodeConfigSection';
import { PollNodeConfigSection } from './node-config/dialog/PollNodeConfigSection';
import { PromptNodeConfigSection } from './node-config/dialog/PromptNodeConfigSection';
import { RegexNodeConfigSection } from './node-config/dialog/RegexNodeConfigSection';
import { RouterNodeConfigSection } from './node-config/dialog/RouterNodeConfigSection';
import { RuntimeNodeConfigSection } from './node-config/dialog/RuntimeNodeConfigSection';
import { SimulationNodeConfigSection } from './node-config/dialog/SimulationNodeConfigSection';
import { StateNodeConfigSection } from './node-config/dialog/StateNodeConfigSection';
import { StringMutatorNodeConfigSection } from './node-config/dialog/StringMutatorNodeConfigSection';
import { SubgraphNodeConfigSection } from './node-config/dialog/SubgraphNodeConfigSection';
import { SwitchNodeConfigSection } from './node-config/dialog/SwitchNodeConfigSection';
import { TemplateNodeConfigSection } from './node-config/dialog/TemplateNodeConfigSection';
import { TriggerNodeConfigSection } from './node-config/dialog/TriggerNodeConfigSection';
import { UnsupportedNodeConfigNotice } from './node-config/dialog/UnsupportedNodeConfigNotice';
import { ValidationPatternNodeConfigSection } from './node-config/dialog/ValidationPatternNodeConfigSection';
import { ValidatorNodeConfigSection } from './node-config/dialog/ValidatorNodeConfigSection';
import { ViewerNodeConfigSection } from './node-config/dialog/ViewerNodeConfigSection';
import { ParserNodeConfigSection } from './node-config/ParserNodeConfigSection';

const NODE_CONFIG_SECTION_BY_TYPE: Partial<
  Record<AiNode['type'], () => React.JSX.Element | null>
> = {
  agent: AgentNodeConfigSection,
  api_advanced: ApiAdvancedNodeConfigSection,
  audio_oscillator: AudioOscillatorNodeConfigSection,
  audio_speaker: AudioSpeakerNodeConfigSection,
  bounds_normalizer: BoundsNormalizerNodeConfigSection,
  bundle: BundleNodeConfigSection,
  canvas_output: CanvasOutputNodeConfigSection,
  compare: CompareNodeConfigSection,
  constant: ConstantNodeConfigSection,
  context: ContextNodeConfigSection,
  database: DatabaseNodeConfigSection,
  db_schema: DbSchemaNodeConfigSection,
  delay: DelayNodeConfigSection,
  fetcher: FetcherNodeConfigSection,
  function: FunctionNodeConfigSection,
  gate: GateNodeConfigSection,
  http: HttpNodeConfigSection,
  iterator: IteratorNodeConfigSection,
  learner_agent: LearnerAgentNodeConfigSection,
  logical_condition: LogicalConditionNodeConfigSection,
  mapper: MapperNodeConfigSection,
  math: MathNodeConfigSection,
  model: ModelNodeConfigSection,
  mutator: MutatorNodeConfigSection,
  parser: ParserNodeConfigSection,
  playwright: PlaywrightNodeConfigSection,
  poll: PollNodeConfigSection,
  prompt: PromptNodeConfigSection,
  regex: RegexNodeConfigSection,
  router: RouterNodeConfigSection,
  simulation: SimulationNodeConfigSection,
  state: StateNodeConfigSection,
  string_mutator: StringMutatorNodeConfigSection,
  subgraph: SubgraphNodeConfigSection,
  switch: SwitchNodeConfigSection,
  template: TemplateNodeConfigSection,
  trigger: TriggerNodeConfigSection,
  validation_pattern: ValidationPatternNodeConfigSection,
  validator: ValidatorNodeConfigSection,
  viewer: ViewerNodeConfigSection,
};

export function NodeConfigurationSections(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  if (!selectedNode) return null;
  const ActiveNodeConfigSection = NODE_CONFIG_SECTION_BY_TYPE[selectedNode.type];

  return (
    <div className='space-y-6'>
      {ActiveNodeConfigSection ? <ActiveNodeConfigSection /> : null}
      <RuntimeNodeConfigSection />
      <UnsupportedNodeConfigNotice selectedNode={selectedNode} />
    </div>
  );
}
