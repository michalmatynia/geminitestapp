'use client';

import React from 'react'; // Import React explicitly if needed for JSX.Element type

import { AiPathConfigProvider, type AiPathConfigData } from './AiPathConfigContext';
import { ContextNodeConfigSection } from './node-config/ContextNodeConfigSection';
import { DatabaseNodeConfigSection } from './node-config/DatabaseNodeConfigSection';
import { DbSchemaNodeConfigSection } from './node-config/DbSchemaNodeConfigSection';
import { AgentNodeConfigSection } from './node-config/dialog/AgentNodeConfigSection';
import { AiDescriptionNodeConfigSection } from './node-config/dialog/AiDescriptionNodeConfigSection';
import { AudioOscillatorNodeConfigSection } from './node-config/dialog/AudioOscillatorNodeConfigSection';
import { AudioSpeakerNodeConfigSection } from './node-config/dialog/AudioSpeakerNodeConfigSection';
import { BundleNodeConfigSection } from './node-config/dialog/BundleNodeConfigSection';
import { CompareNodeConfigSection } from './node-config/dialog/CompareNodeConfigSection';
import { ConstantNodeConfigSection } from './node-config/dialog/ConstantNodeConfigSection';
import { DelayNodeConfigSection } from './node-config/dialog/DelayNodeConfigSection';
import { GateNodeConfigSection } from './node-config/dialog/GateNodeConfigSection';
import { HttpNodeConfigSection } from './node-config/dialog/HttpNodeConfigSection';
import { IteratorNodeConfigSection } from './node-config/dialog/IteratorNodeConfigSection';
import { LearnerAgentNodeConfigSection } from './node-config/dialog/LearnerAgentNodeConfigSection';
import { MapperNodeConfigSection } from './node-config/dialog/MapperNodeConfigSection';
import { MathNodeConfigSection } from './node-config/dialog/MathNodeConfigSection';
import { ModelNodeConfigSection } from './node-config/dialog/ModelNodeConfigSection';
import { MutatorNodeConfigSection } from './node-config/dialog/MutatorNodeConfigSection';
import { PollNodeConfigSection } from './node-config/dialog/PollNodeConfigSection';
import { PromptNodeConfigSection } from './node-config/dialog/PromptNodeConfigSection';
import { RegexNodeConfigSection } from './node-config/dialog/RegexNodeConfigSection';
import { RouterNodeConfigSection } from './node-config/dialog/RouterNodeConfigSection';
import { RuntimeNodeConfigSection } from './node-config/dialog/RuntimeNodeConfigSection';
import { SimulationNodeConfigSection } from './node-config/dialog/SimulationNodeConfigSection';
import { StringMutatorNodeConfigSection } from './node-config/dialog/StringMutatorNodeConfigSection';
import { TemplateNodeConfigSection } from './node-config/dialog/TemplateNodeConfigSection';
import { TriggerNodeConfigSection } from './node-config/dialog/TriggerNodeConfigSection';
import { UnsupportedNodeConfigNotice } from './node-config/dialog/UnsupportedNodeConfigNotice';
import { ValidatorNodeConfigSection } from './node-config/dialog/ValidatorNodeConfigSection';
import { ViewerNodeConfigSection } from './node-config/dialog/ViewerNodeConfigSection';
import { ParserNodeConfigSection } from './node-config/ParserNodeConfigSection';

export function NodeConfigurationSections(props: AiPathConfigData): React.JSX.Element | null {
  const { selectedNode } = props;
  if (!selectedNode) return null;

  return (
    <AiPathConfigProvider {...props}>
      <div className='space-y-6'>
        <TriggerNodeConfigSection />
        <SimulationNodeConfigSection />
        <AudioOscillatorNodeConfigSection />
        <AudioSpeakerNodeConfigSection />
        <ContextNodeConfigSection />
        <ParserNodeConfigSection />
        <RegexNodeConfigSection />
        <IteratorNodeConfigSection />
        <MapperNodeConfigSection />
        <MutatorNodeConfigSection />
        <StringMutatorNodeConfigSection />
        <ValidatorNodeConfigSection />
        <ConstantNodeConfigSection />
        <MathNodeConfigSection />
        <TemplateNodeConfigSection />
        <BundleNodeConfigSection />
        <GateNodeConfigSection />
        <CompareNodeConfigSection />
        <RouterNodeConfigSection />
        <DelayNodeConfigSection />
        <PollNodeConfigSection />
        <HttpNodeConfigSection />
        <PromptNodeConfigSection />
        <ModelNodeConfigSection />
        <AgentNodeConfigSection />
        <LearnerAgentNodeConfigSection />
        <DatabaseNodeConfigSection />
        <DbSchemaNodeConfigSection />
        <ViewerNodeConfigSection />
        <RuntimeNodeConfigSection />
        <AiDescriptionNodeConfigSection />
        <UnsupportedNodeConfigNotice selectedNode={selectedNode} />
      </div>
    </AiPathConfigProvider>
  );
}
