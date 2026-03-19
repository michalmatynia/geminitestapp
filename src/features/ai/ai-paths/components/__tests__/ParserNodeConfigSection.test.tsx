import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

const mockState = vi.hoisted(() => ({
  selectedNode: null as Record<string, unknown> | null,
  nodes: [] as Array<Record<string, unknown>>,
  runtimeState: {} as Record<string, unknown>,
  parserSamples: {} as Record<string, Record<string, unknown>>,
  parserSampleLoading: false,
  updateSelectedNode: vi.fn(),
  toast: vi.fn(),
  setParserSamples: vi.fn(),
  handleFetchParserSample: vi.fn(),
  buildTopLevelMappingsMock: vi.fn(),
  buildFlattenedMappingsMock: vi.fn(),
  extractJsonPathEntriesMock: vi.fn(),
  inferImageMappingPathMock: vi.fn(),
}));

const parserNodeId = 'parser-node-1';

const buildSelectedNode = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: parserNodeId,
  type: 'parser',
  title: 'Parser Node',
  outputs: ['title', 'images'],
  config: {
    parser: {
      mappings: {
        title: '$.title',
        images: '$.images',
      },
      outputMode: 'individual',
      presetId: 'custom',
    },
  },
  ...overrides,
});

const resetParserState = (): void => {
  mockState.selectedNode = buildSelectedNode();
  mockState.nodes = [
    mockState.selectedNode,
    {
      id: 'simulation-node-1',
      type: 'simulation',
      title: 'Simulation 1',
      config: {
        simulation: {
          entityType: 'product',
          entityId: 'product-42',
        },
      },
    },
  ];
  mockState.runtimeState = {
    inputs: {
      [parserNodeId]: {
        entityJson: {
          id: 'product-42',
        },
      },
    },
  };
  mockState.parserSamples = {
    [parserNodeId]: {
      entityType: 'product',
      entityId: 'product-42',
      simulationId: '',
      json: '{"title":"Lamp","images":["/lamp.png"]}',
      mappingMode: 'top',
      depth: 2,
      keyStyle: 'path',
      includeContainers: false,
    },
  };
  mockState.buildTopLevelMappingsMock.mockReturnValue({
    title: '$.title',
    images: '$.images',
  });
  mockState.buildFlattenedMappingsMock.mockReturnValue({
    title: '$.nested.title',
    images: '$.gallery',
  });
  mockState.extractJsonPathEntriesMock.mockReturnValue([
    { type: 'value', path: 'title' },
    { type: 'array', path: 'images' },
  ]);
  mockState.inferImageMappingPathMock.mockReturnValue('$.gallery');
};

vi.mock('../AiPathConfigContext', () => ({
  useAiPathSelection: () => ({
    selectedNode: mockState.selectedNode,
  }),
  useAiPathGraph: () => ({
    nodes: mockState.nodes,
  }),
  useAiPathRuntime: () => ({
    runtimeState: mockState.runtimeState,
    parserSamples: mockState.parserSamples,
    setParserSamples: mockState.setParserSamples,
    parserSampleLoading: mockState.parserSampleLoading,
    handleFetchParserSample: mockState.handleFetchParserSample,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNode: mockState.updateSelectedNode,
    toast: mockState.toast,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  PARSER_PATH_OPTIONS: [{ label: 'Common: title', value: '$.title' }],
  PARSER_PRESETS: [
    {
      id: 'product_core',
      label: 'Product Core',
      description: 'Core product mappings',
      mappings: {
        title: '$.title',
        images: '$.images',
        sku: '$.sku',
      },
    },
  ],
  buildFlattenedMappings: (...args: unknown[]) => mockState.buildFlattenedMappingsMock(...args),
  buildTopLevelMappings: (...args: unknown[]) => mockState.buildTopLevelMappingsMock(...args),
  createParserMappings: (outputs: string[]) =>
    Object.fromEntries(outputs.map((output) => [output, `$.${output}`])),
  extractJsonPathEntries: (...args: unknown[]) => mockState.extractJsonPathEntriesMock(...args),
  inferImageMappingPath: (...args: unknown[]) => mockState.inferImageMappingPathMock(...args),
  normalizePortName: (value: string) => value.replace(/\s+/g, '_'),
  safeParseJson: (value: string) =>
    value.trim()
      ? {
          value: { parsed: true },
          error: null,
        }
      : {
          value: null,
          error: null,
        },
}));

vi.mock('@/shared/ui', () => ({
  ...(() => {
    const React = require('react') as typeof import('react');
    return {
      Button: ({
        children,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
        <button {...props}>{children}</button>
      ),
      FormField: ({
        label,
        children,
      }: {
        label: React.ReactNode;
        children: React.ReactNode;
      }): React.JSX.Element => (
        <label>
          <span>{label}</span>
          {children}
        </label>
      ),
      Input: ({
        ...props
      }: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element => <input {...props} />,
      SelectSimple: ({
        ariaLabel,
        onValueChange,
        options,
        value,
      }: {
        ariaLabel?: string;
        onValueChange?: (value: string) => void;
        options: Array<{ value: string; label: string }>;
        value?: string;
      }): React.JSX.Element => (
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
        >
          <option value=''>Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ),
      Textarea: React.forwardRef<
        HTMLTextAreaElement,
        React.TextareaHTMLAttributes<HTMLTextAreaElement>
      >(function MockTextarea(props, ref): React.JSX.Element {
        return <textarea ref={ref} {...props} />;
      }),
    };
  })(),
}));

import { ParserNodeConfigSection } from '../node-config/ParserNodeConfigSection';

const latestUpdate = (): Record<string, unknown> =>
  (mockState.updateSelectedNode.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>;

beforeEach(() => {
  resetParserState();
  mockState.updateSelectedNode.mockReset();
  mockState.updateSelectedNode.mockImplementation((patch: Record<string, unknown>) => {
    mockState.selectedNode = {
      ...mockState.selectedNode,
      ...patch,
      outputs: patch.outputs ?? mockState.selectedNode?.outputs,
      config: {
        ...((mockState.selectedNode?.config as Record<string, unknown>) ?? {}),
        ...((patch.config as Record<string, unknown>) ?? {}),
      },
    };
  });
  mockState.toast.mockReset();
  mockState.setParserSamples.mockReset();
  mockState.setParserSamples.mockImplementation(
    (
      updater:
        | Record<string, Record<string, unknown>>
        | ((prev: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>)
    ) => {
      mockState.parserSamples =
        typeof updater === 'function' ? updater(mockState.parserSamples) : updater;
    }
  );
  mockState.handleFetchParserSample.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ParserNodeConfigSection', () => {
  it('renders parser runtime context and applies sample mappings', () => {
    render(<ParserNodeConfigSection />);

    expect(screen.getByText('entityJson input')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fetch sample' }));
    expect(mockState.handleFetchParserSample).toHaveBeenCalledWith(
      parserNodeId,
      'product',
      'product-42'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Auto-map from sample' }));

    expect(latestUpdate()).toMatchObject({
      outputs: ['title', 'images'],
      config: {
        parser: {
          mappings: {
            title: '$.title',
            images: '$.images',
          },
          outputMode: 'individual',
          presetId: 'custom',
        },
      },
    });
  });

  it('shows an error when image detection runs without sample JSON', () => {
    mockState.parserSamples[parserNodeId] = {
      ...mockState.parserSamples[parserNodeId],
      json: '',
    };

    render(<ParserNodeConfigSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Detect images' }));

    expect(mockState.toast).toHaveBeenCalledWith(
      'Provide sample JSON to detect image fields.',
      { variant: 'error' }
    );
  });

  it('detects images and updates the existing image mapping', () => {
    render(<ParserNodeConfigSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Detect images' }));

    expect(latestUpdate()).toMatchObject({
      config: {
        parser: {
          mappings: {
            title: '$.title',
            images: '$.gallery',
          },
        },
      },
    });
    expect(mockState.toast).toHaveBeenCalledWith('Image field detected: $.gallery', {
      variant: 'success',
    });
  });

  it('replaces preset mappings and switches to bundle outputs', () => {
    mockState.selectedNode = buildSelectedNode({
      config: {
        parser: {
          mappings: {
            legacy: '$.legacy',
          },
          outputMode: 'individual',
          presetId: 'product_core',
        },
      },
      outputs: ['legacy'],
    });

    render(<ParserNodeConfigSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Replace mappings' }));

    expect(latestUpdate()).toMatchObject({
      outputs: ['title', 'images', 'sku'],
      config: {
        parser: {
          mappings: {
            title: '$.title',
            images: '$.images',
            sku: '$.sku',
          },
          presetId: 'product_core',
        },
      },
    });

    fireEvent.change(screen.getByLabelText('Output mode'), {
      target: { value: 'bundle' },
    });

    expect(latestUpdate()).toMatchObject({
      outputs: ['bundle', 'images'],
      config: {
        parser: {
          outputMode: 'bundle',
        },
      },
    });
  });

  it('adds duplicate mappings, commits debounced path edits, and clears mappings', () => {
    vi.useFakeTimers();
    render(<ParserNodeConfigSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Add sku' }));

    expect(latestUpdate()).toMatchObject({
      config: {
        parser: {
          mappings: expect.objectContaining({
            sku: '$.sku',
          }),
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add sku' }));

    expect(latestUpdate()).toMatchObject({
      config: {
        parser: {
          mappings: expect.objectContaining({
            sku: '$.sku',
            sku_2: '$.sku',
          }),
        },
      },
    });

    const pathInputs = screen.getAllByLabelText('Output path');
    fireEvent.change(pathInputs[0] as HTMLElement, {
      target: { value: '$.headline' },
    });

    vi.advanceTimersByTime(500);

    expect(latestUpdate()).toMatchObject({
      config: {
        parser: {
          mappings: expect.objectContaining({
            title: '$.headline',
          }),
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear mappings' }));

    expect(latestUpdate()).toMatchObject({
      outputs: ['title', 'images', 'sku', 'sku_2'],
      config: {
        parser: {
          mappings: {},
          presetId: 'custom',
        },
      },
    });
  });
});
