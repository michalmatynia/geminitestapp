import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  graphState: {
    nodes: [] as Array<Record<string, unknown>>,
    isPathLocked: false,
  },
  selectionState: {
    simulationOpenNodeId: null as string | null,
  },
  runSimulation: vi.fn(),
  setSimulationOpenNodeId: vi.fn(),
  setNodes: vi.fn(),
}));
const graphActionsMock = {
  setNodes: mockState.setNodes,
};

vi.mock('@/features/ai/ai-paths/context', () => ({
  useSelectionState: () => mockState.selectionState,
  useSelectionActions: () => ({
    setSimulationOpenNodeId: mockState.setSimulationOpenNodeId,
  }),
  useRuntimeActions: () => ({
    runSimulation: mockState.runSimulation,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphState: () => mockState.graphState,
  useGraphActions: () => graphActionsMock,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element => (
    <input {...props} />
  ),
  Alert: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }): React.JSX.Element => <div data-variant={variant}>{children}</div>,
  FormField: ({
    children,
    label,
    id,
  }: {
    children: React.ReactNode;
    label: React.ReactNode;
    id?: string;
  }): React.JSX.Element => (
    <label htmlFor={id}>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({
    isOpen,
    onClose,
    title,
    subtitle,
    footer,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }): React.JSX.Element | null =>
    isOpen ? (
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <button type='button' onClick={onClose}>
          Close dialog
        </button>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

import { SimulationDialog } from '../simulation-dialog';

const buildNode = (overrides: Record<string, unknown> = {}) => ({
  id: 'node-1',
  type: 'trigger',
  data: {},
  position: { x: 0, y: 0 },
  ...overrides,
});

describe('SimulationDialog', () => {
  beforeEach(() => {
    mockState.graphState = {
      nodes: [],
      isPathLocked: false,
    };
    mockState.selectionState = {
      simulationOpenNodeId: null,
    };
    mockState.runSimulation.mockReset().mockResolvedValue(undefined);
    mockState.setSimulationOpenNodeId.mockReset();
    mockState.setNodes.mockReset();
  });

  it('returns null when the selected simulation node is missing', () => {
    mockState.graphState = {
      nodes: [buildNode()],
      isPathLocked: false,
    };
    mockState.selectionState = {
      simulationOpenNodeId: 'missing-node',
    };

    const { container } = render(<SimulationDialog />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Simulation')).not.toBeInTheDocument();
  });

  it('renders locked state and falls back to productId when entityId is blank', () => {
    mockState.graphState = {
      nodes: [
        buildNode({
          config: {
            simulation: {
              entityId: '   ',
              productId: 'prod-123',
              entityType: 'catalogItem',
            },
          },
        }),
      ],
      isPathLocked: true,
    };
    mockState.selectionState = {
      simulationOpenNodeId: 'node-1',
    };

    render(<SimulationDialog />);

    expect(screen.getByText('Simulation')).toBeInTheDocument();
    expect(
      screen.getByText('Set an Entity ID and simulate the connected trigger action.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Entity ID')).toHaveValue('prod-123');
    expect(screen.getByLabelText('Entity ID')).toBeDisabled();
    expect(
      screen.getByText('This path is locked. Unlock it to change simulation inputs.')
    ).toBeInTheDocument();
    expect(screen.getByText('Current entity type: catalogItem')).toBeInTheDocument();
  });

  it('persists the draft entity id into node simulation config and closes the dialog', () => {
    mockState.graphState = {
      nodes: [
        buildNode({
          config: {
            simulation: {
              entityId: 'seed-1',
            },
          },
        }),
        buildNode({ id: 'node-2' }),
      ],
      isPathLocked: false,
    };
    mockState.selectionState = {
      simulationOpenNodeId: 'node-1',
    };

    render(<SimulationDialog />);

    expect(screen.getByLabelText('Entity ID')).toHaveValue('seed-1');
    expect(screen.getByText('Current entity type: product')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Entity ID'), {
      target: { value: 'entity-55' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(mockState.setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = mockState.setNodes.mock.calls[0]?.[0] as (
      nodes: Array<Record<string, unknown>>
    ) => Array<Record<string, unknown>>;
    const nextNodes = updateNodes(mockState.graphState.nodes);
    expect(nextNodes).toEqual([
      buildNode({
        config: {
          simulation: {
            entityId: 'entity-55',
            productId: 'entity-55',
          },
        },
      }),
      buildNode({ id: 'node-2' }),
    ]);
    expect(mockState.setSimulationOpenNodeId).toHaveBeenCalledWith(null);
  });

  it('simulates the selected node with the updated entity id', async () => {
    mockState.graphState = {
      nodes: [
        buildNode({
          config: {
            simulation: {
              productId: 'prod-1',
            },
          },
        }),
      ],
      isPathLocked: false,
    };
    mockState.selectionState = {
      simulationOpenNodeId: 'node-1',
    };

    render(<SimulationDialog />);

    fireEvent.change(screen.getByLabelText('Entity ID'), {
      target: { value: 'entity-99' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Trigger' }));

    await waitFor(() => {
      expect(mockState.runSimulation).toHaveBeenCalledTimes(1);
    });

    expect(mockState.setNodes).toHaveBeenCalledTimes(1);
    expect(mockState.runSimulation).toHaveBeenCalledWith(
      buildNode({
        config: {
          simulation: {
            entityId: 'entity-99',
            productId: 'entity-99',
          },
        },
      })
    );
    expect(mockState.setSimulationOpenNodeId).not.toHaveBeenCalled();
  });
});
