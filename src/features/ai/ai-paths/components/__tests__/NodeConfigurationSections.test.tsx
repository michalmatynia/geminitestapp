import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  renderedSections: [] as string[],
  unsupportedProps: [] as Array<{ selectedNode: unknown }>,
}));

function createSectionComponent(name: string) {
  return () => {
  const React = require('react') as typeof import('react');
  mockState.renderedSections.push(name);
  return React.createElement('div', { 'data-testid': name }, name);
  };
}

vi.mock('../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: mockState.selectedNode,
  }),
}));

vi.mock('../node-config/ContextNodeConfigSection', () => ({
  ContextNodeConfigSection: createSectionComponent('ContextNodeConfigSection'),
}));

vi.mock('../node-config/DatabaseNodeConfigSection', () => ({
  DatabaseNodeConfigSection: createSectionComponent('DatabaseNodeConfigSection'),
}));

vi.mock('../node-config/DbSchemaNodeConfigSection', () => ({
  DbSchemaNodeConfigSection: createSectionComponent('DbSchemaNodeConfigSection'),
}));

vi.mock('../node-config/dialog/AgentNodeConfigSection', () => ({
  AgentNodeConfigSection: createSectionComponent('AgentNodeConfigSection'),
}));

vi.mock('../node-config/dialog/ApiAdvancedNodeConfigSection', () => ({
  ApiAdvancedNodeConfigSection: createSectionComponent('ApiAdvancedNodeConfigSection'),
}));

vi.mock('../node-config/dialog/AudioOscillatorNodeConfigSection', () => ({
  AudioOscillatorNodeConfigSection: createSectionComponent('AudioOscillatorNodeConfigSection'),
}));

vi.mock('../node-config/dialog/AudioSpeakerNodeConfigSection', () => ({
  AudioSpeakerNodeConfigSection: createSectionComponent('AudioSpeakerNodeConfigSection'),
}));

vi.mock('../node-config/dialog/BoundsNormalizerNodeConfigSectionImpl', () => ({
  BoundsNormalizerNodeConfigSection: createSectionComponent('BoundsNormalizerNodeConfigSection'),
}));

vi.mock('../node-config/dialog/BundleNodeConfigSection', () => ({
  BundleNodeConfigSection: createSectionComponent('BundleNodeConfigSection'),
}));

vi.mock('../node-config/dialog/CanvasOutputNodeConfigSectionImpl', () => ({
  CanvasOutputNodeConfigSection: createSectionComponent('CanvasOutputNodeConfigSection'),
}));

vi.mock('../node-config/dialog/CompareNodeConfigSection', () => ({
  CompareNodeConfigSection: createSectionComponent('CompareNodeConfigSection'),
}));

vi.mock('../node-config/dialog/ConstantNodeConfigSection', () => ({
  ConstantNodeConfigSection: createSectionComponent('ConstantNodeConfigSection'),
}));

vi.mock('../node-config/dialog/DelayNodeConfigSection', () => ({
  DelayNodeConfigSection: createSectionComponent('DelayNodeConfigSection'),
}));

vi.mock('../node-config/dialog/FetcherNodeConfigSection', () => ({
  FetcherNodeConfigSection: createSectionComponent('FetcherNodeConfigSection'),
}));

vi.mock('../node-config/dialog/FunctionNodeConfigSection', () => ({
  FunctionNodeConfigSection: createSectionComponent('FunctionNodeConfigSection'),
}));

vi.mock('../node-config/dialog/GateNodeConfigSection', () => ({
  GateNodeConfigSection: createSectionComponent('GateNodeConfigSection'),
}));

vi.mock('../node-config/dialog/HttpNodeConfigSection', () => ({
  HttpNodeConfigSection: createSectionComponent('HttpNodeConfigSection'),
}));

vi.mock('../node-config/dialog/IteratorNodeConfigSection', () => ({
  IteratorNodeConfigSection: createSectionComponent('IteratorNodeConfigSection'),
}));

vi.mock('../node-config/dialog/LearnerAgentNodeConfigSection', () => ({
  LearnerAgentNodeConfigSection: createSectionComponent('LearnerAgentNodeConfigSection'),
}));

vi.mock('../node-config/dialog/LogicalConditionNodeConfigSection', () => ({
  LogicalConditionNodeConfigSection: createSectionComponent('LogicalConditionNodeConfigSection'),
}));

vi.mock('../node-config/dialog/MapperNodeConfigSection', () => ({
  MapperNodeConfigSection: createSectionComponent('MapperNodeConfigSection'),
}));

vi.mock('../node-config/dialog/MathNodeConfigSection', () => ({
  MathNodeConfigSection: createSectionComponent('MathNodeConfigSection'),
}));

vi.mock('../node-config/dialog/ModelNodeConfigSection', () => ({
  ModelNodeConfigSection: createSectionComponent('ModelNodeConfigSection'),
}));

vi.mock('../node-config/dialog/MutatorNodeConfigSection', () => ({
  MutatorNodeConfigSection: createSectionComponent('MutatorNodeConfigSection'),
}));

vi.mock('../node-config/dialog/PlaywrightNodeConfigSection', () => ({
  PlaywrightNodeConfigSection: createSectionComponent('PlaywrightNodeConfigSection'),
}));

vi.mock('../node-config/dialog/PollNodeConfigSection', () => ({
  PollNodeConfigSection: createSectionComponent('PollNodeConfigSection'),
}));

vi.mock('../node-config/dialog/PromptNodeConfigSection', () => ({
  PromptNodeConfigSection: createSectionComponent('PromptNodeConfigSection'),
}));

vi.mock('../node-config/dialog/RegexNodeConfigSection', () => ({
  RegexNodeConfigSection: createSectionComponent('RegexNodeConfigSection'),
}));

vi.mock('../node-config/dialog/RouterNodeConfigSection', () => ({
  RouterNodeConfigSection: createSectionComponent('RouterNodeConfigSection'),
}));

vi.mock('../node-config/dialog/RuntimeNodeConfigSection', () => ({
  RuntimeNodeConfigSection: createSectionComponent('RuntimeNodeConfigSection'),
}));

vi.mock('../node-config/dialog/SimulationNodeConfigSection', () => ({
  SimulationNodeConfigSection: createSectionComponent('SimulationNodeConfigSection'),
}));

vi.mock('../node-config/dialog/StateNodeConfigSection', () => ({
  StateNodeConfigSection: createSectionComponent('StateNodeConfigSection'),
}));

vi.mock('../node-config/dialog/StringMutatorNodeConfigSection', () => ({
  StringMutatorNodeConfigSection: createSectionComponent('StringMutatorNodeConfigSection'),
}));

vi.mock('../node-config/dialog/SubgraphNodeConfigSection', () => ({
  SubgraphNodeConfigSection: createSectionComponent('SubgraphNodeConfigSection'),
}));

vi.mock('../node-config/dialog/SwitchNodeConfigSection', () => ({
  SwitchNodeConfigSection: createSectionComponent('SwitchNodeConfigSection'),
}));

vi.mock('../node-config/dialog/TemplateNodeConfigSection', () => ({
  TemplateNodeConfigSection: createSectionComponent('TemplateNodeConfigSection'),
}));

vi.mock('../node-config/dialog/TriggerNodeConfigSection', () => ({
  TriggerNodeConfigSection: createSectionComponent('TriggerNodeConfigSection'),
}));

vi.mock('../node-config/dialog/UnsupportedNodeConfigNotice', () => ({
  UnsupportedNodeConfigNotice: (props: { selectedNode: unknown }) => {
    const React = require('react') as typeof import('react');
    mockState.renderedSections.push('UnsupportedNodeConfigNotice');
    mockState.unsupportedProps.push(props);
    return React.createElement(
      'div',
      { 'data-testid': 'UnsupportedNodeConfigNotice' },
      'UnsupportedNodeConfigNotice'
    );
  },
}));

vi.mock('../node-config/dialog/ValidationPatternNodeConfigSection', () => ({
  ValidationPatternNodeConfigSection: createSectionComponent('ValidationPatternNodeConfigSection'),
}));

vi.mock('../node-config/dialog/ValidatorNodeConfigSection', () => ({
  ValidatorNodeConfigSection: createSectionComponent('ValidatorNodeConfigSection'),
}));

vi.mock('../node-config/dialog/ViewerNodeConfigSection', () => ({
  ViewerNodeConfigSection: createSectionComponent('ViewerNodeConfigSection'),
}));

vi.mock('../node-config/ParserNodeConfigSection', () => ({
  ParserNodeConfigSection: createSectionComponent('ParserNodeConfigSection'),
}));

import { NodeConfigurationSections } from '../NodeConfigurationSections';

describe('NodeConfigurationSections', () => {
  beforeEach(() => {
    mockState.selectedNode = null;
    mockState.renderedSections = [];
    mockState.unsupportedProps = [];
  });

  it('returns null when no node is selected', () => {
    const { container } = render(<NodeConfigurationSections />);

    expect(container).toBeEmptyDOMElement();
    expect(mockState.renderedSections).toEqual([]);
    expect(mockState.unsupportedProps).toEqual([]);
  });

  it('renders only the active node section plus shared runtime/unsupported sections', () => {
    mockState.selectedNode = {
      id: 'node-1',
      type: 'template',
      title: 'Selected node',
    };

    render(<NodeConfigurationSections />);

    expect(mockState.renderedSections).toEqual([
      'TemplateNodeConfigSection',
      'RuntimeNodeConfigSection',
      'UnsupportedNodeConfigNotice',
    ]);
    expect(mockState.unsupportedProps).toEqual([
      {
        selectedNode: mockState.selectedNode,
      },
    ]);

    expect(screen.getByTestId('TemplateNodeConfigSection')).toBeInTheDocument();
    expect(screen.getByTestId('RuntimeNodeConfigSection')).toBeInTheDocument();
    expect(screen.getByTestId('UnsupportedNodeConfigNotice')).toBeInTheDocument();
    expect(screen.queryByTestId('ParserNodeConfigSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('DatabaseNodeConfigSection')).not.toBeInTheDocument();
  });

  it('renders shared sections even when the node type has no dedicated config section', () => {
    mockState.selectedNode = {
      id: 'node-2',
      type: 'notification',
      title: 'Notification node',
    };

    render(<NodeConfigurationSections />);

    expect(mockState.renderedSections).toEqual([
      'RuntimeNodeConfigSection',
      'UnsupportedNodeConfigNotice',
    ]);
    expect(screen.queryByTestId('TemplateNodeConfigSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('RuntimeNodeConfigSection')).toBeInTheDocument();
    expect(screen.getByTestId('UnsupportedNodeConfigNotice')).toBeInTheDocument();
  });
});
