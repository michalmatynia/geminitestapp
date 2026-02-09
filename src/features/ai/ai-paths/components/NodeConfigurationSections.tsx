'use client';

import React from 'react'; // Import React explicitly if needed for JSX.Element type

import type {
  AiNode,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathDebugSnapshot,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';

import { AiPathConfigProvider } from './AiPathConfigContext';
import { ContextNodeConfigSection } from './node-config/ContextNodeConfigSection';
import { DatabaseNodeConfigSection } from './node-config/DatabaseNodeConfigSection';
import { DbSchemaNodeConfigSection } from './node-config/DbSchemaNodeConfigSection';
import { AgentNodeConfigSection } from './node-config/dialog/AgentNodeConfigSection';
import { AiDescriptionNodeConfigSection } from './node-config/dialog/AiDescriptionNodeConfigSection';
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

type NodeConfigurationSectionsProps = {
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  runtimeState: RuntimeState;
  pathDebugSnapshot?: PathDebugSnapshot | null | undefined;
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void | Promise<void>;
  clearRuntimeForNode?: ((nodeId: string) => void) | undefined;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  sendingToAi?: boolean | undefined;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
  ) => void;
};

export function NodeConfigurationSections(props: NodeConfigurationSectionsProps): React.JSX.Element | null {
  const { selectedNode } = props;
  if (!selectedNode) return null;

  return (
    <AiPathConfigProvider {...props}>
      <div className='space-y-6'>
        <TriggerNodeConfigSection />
        <SimulationNodeConfigSection />
        <ContextNodeConfigSection />
        <ParserNodeConfigSection />
        <RegexNodeConfigSection />
        <IteratorNodeConfigSection />
        <MapperNodeConfigSection />
        <MutatorNodeConfigSection />
        <StringMutatorNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <ValidatorNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <ConstantNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <MathNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <TemplateNodeConfigSection />
        <BundleNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <GateNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <CompareNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <RouterNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <DelayNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <PollNodeConfigSection
          selectedNode={selectedNode}
          edges={props.edges}
          runtimeState={props.runtimeState}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <HttpNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <PromptNodeConfigSection />
        <ModelNodeConfigSection />
        <AgentNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <LearnerAgentNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <DatabaseNodeConfigSection />
        <DbSchemaNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <ViewerNodeConfigSection />
        <RuntimeNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <AiDescriptionNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={props.updateSelectedNodeConfig}
        />
        <UnsupportedNodeConfigNotice selectedNode={selectedNode} />
      </div>
    </AiPathConfigProvider>
  );
}
