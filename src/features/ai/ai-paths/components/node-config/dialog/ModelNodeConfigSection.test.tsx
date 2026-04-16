import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

const mockState = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  nodes: [] as Array<Record<string, unknown>>,
  edges: [] as Array<Record<string, unknown>>,
  updateSelectedNodeConfig: vi.fn(),
  brainModelOptions: {
    models: ['text-model'],
    descriptors: {
      'text-model': {
        id: 'text-model',
        family: 'chat',
        modality: 'text',
        vendor: 'openai',
        supportsStreaming: true,
        supportsJsonMode: true,
      },
    },
    isLoading: false,
    assignment: {
      enabled: true,
      provider: 'model',
      modelId: '',
      agentId: '',
      notes: null,
    },
    effectiveModelId: 'brain-default',
    sourceWarnings: [] as string[],
    refresh: vi.fn(),
  },
}));

vi.mock('../../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: mockState.selectedNode,
  }),
  useAiPathGraph: () => ({
    nodes: mockState.nodes,
    edges: mockState.edges,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNodeConfig: mockState.updateSelectedNodeConfig,
  }),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => mockState.brainModelOptions,
}));

vi.mock('@/shared/ui/primitives.public', () => {
  const React = require('react') as typeof import('react');
  return {
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
      <button {...props}>{children}</button>
    ),
    Card: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }): React.JSX.Element => <div className={className}>{children}</div>,
    Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
      function MockInput(props, ref): React.JSX.Element {
        return <input ref={ref} {...props} />;
      }
    ),
    Textarea: React.forwardRef<
      HTMLTextAreaElement,
      React.TextareaHTMLAttributes<HTMLTextAreaElement>
    >(function MockTextarea(props, ref): React.JSX.Element {
      return <textarea ref={ref} {...props} />;
    }),
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', () => {
  const React = require('react') as typeof import('react');
  return {
    FormField: ({
      label,
      description,
      actions,
      children,
    }: {
      label: React.ReactNode;
      description?: React.ReactNode;
      actions?: React.ReactNode;
      children: React.ReactNode;
    }): React.JSX.Element => (
      <label>
        <span>{label}</span>
        {description ? <span>{description}</span> : null}
        {actions}
        {children}
      </label>
    ),
    SelectSimple: ({
      value,
      onValueChange,
      options,
      ariaLabel,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      ariaLabel?: string;
    }): React.JSX.Element => (
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event): void => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
  };
});

import { ModelNodeConfigSection } from './ModelNodeConfigSection';

const buildSelectedNode = (model: Record<string, unknown>): Record<string, unknown> => ({
  id: 'model-node-1',
  type: 'model',
  title: 'Model',
  inputs: ['input', 'images'],
  outputs: ['result'],
  config: { model },
});

describe('ModelNodeConfigSection', () => {
  beforeEach(() => {
    mockState.updateSelectedNodeConfig.mockReset();
    mockState.brainModelOptions.refresh.mockReset();
    mockState.nodes = [];
    mockState.edges = [];
    mockState.selectedNode = buildSelectedNode({
      modelId: 'text-model',
      temperature: 0.7,
      maxTokens: 800,
      vision: true,
      waitForResult: true,
    });
    mockState.nodes = [mockState.selectedNode];
    mockState.brainModelOptions = {
      ...mockState.brainModelOptions,
      models: ['text-model'],
      descriptors: {
        'text-model': {
          id: 'text-model',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
      effectiveModelId: 'brain-default',
      sourceWarnings: [],
    };
  });

  it('warns when image input is enabled against a text-only Brain model', () => {
    render(<ModelNodeConfigSection />);

    expect(mockState.brainModelOptions.refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Accepts Images is enabled, but/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Choose a multimodal model or disable image input for this node/i)
    ).toBeTruthy();
    expect(screen.getByText(/is classified as/i)).toBeTruthy();
  });

  it('warns when AI Brain cannot verify image support for the effective model', () => {
    mockState.selectedNode = buildSelectedNode({
      modelId: '',
      temperature: 0.7,
      maxTokens: 800,
      vision: true,
      waitForResult: true,
    });
    mockState.nodes = [mockState.selectedNode];
    mockState.brainModelOptions = {
      ...mockState.brainModelOptions,
      models: ['brain-default'],
      descriptors: {},
      effectiveModelId: 'brain-default',
    };

    render(<ModelNodeConfigSection />);

    expect(
      screen.getByText(/AI Brain cannot verify image support for/i)
    ).toBeTruthy();
    expect(screen.queryByText(/is classified as/i)).toBeNull();
  });
});
