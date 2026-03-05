import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

import type { AiNode } from '@/shared/contracts/ai-paths';

const mockState = vi.hoisted(() => ({
  selectedNode: {
    id: 'node-1',
    instanceId: 'node-1',
    nodeTypeId: 'nt-7f3e2a1b4c5d6e7f8a9b0c1d',
    type: 'model',
    title: 'Model',
    description: '',
    inputs: ['prompt'],
    outputs: ['result'],
    position: { x: 0, y: 0 },
    data: {},
    config: {},
    createdAt: '2026-02-23T00:00:00.000Z',
    updatedAt: null,
  } as AiNode,
  setConfigOpen: vi.fn(),
  updateSelectedNode: vi.fn(),
  toast: vi.fn(),
  savePathConfig: vi.fn(async () => true),
  setNodeConfigDraft: vi.fn(),
  setNodeConfigDirty: vi.fn(),
}));

vi.mock('../AiPathConfigContext', () => ({
  AiPathConfigProviderWithContext: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <>{children}</>,
  useAiPathSelection: () => ({
    configOpen: true,
    setConfigOpen: mockState.setConfigOpen,
    selectedNode: mockState.selectedNode,
    onDirtyChange: vi.fn(),
  }),
  useAiPathGraph: () => ({
    nodes: [mockState.selectedNode],
    edges: [],
    activePathId: null,
    isPathLocked: false,
  }),
  useAiPathOrchestrator: () => ({
    updateSelectedNode: mockState.updateSelectedNode,
    updateSelectedNodeConfig: vi.fn(),
    clearNodeHistory: vi.fn(),
    toast: mockState.toast,
    savePathConfig: mockState.savePathConfig,
  }),
}));

vi.mock('../NodeConfigurationSections', () => ({
  NodeConfigurationSections: (): React.JSX.Element => <div>Config Sections</div>,
}));

vi.mock('../node-config/dialog/NodeHistoryTab', () => ({
  NodeHistoryTab: (): React.JSX.Element => <div>History</div>,
}));

vi.mock('../node-config/dialog/NodeNotesTab', () => ({
  NodeNotesTab: (): React.JSX.Element => <div>Notes</div>,
}));

vi.mock('../../context', () => ({
  useSelectionActions: () => ({
    setNodeConfigDraft: mockState.setNodeConfigDraft,
    setNodeConfigDirty: mockState.setNodeConfigDirty,
  }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
  Tabs: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div>{children}</div>
  ),
  TabsTrigger: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <button type='button'>{children}</button>
  ),
  ConfirmModal: (): null => null,
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }): React.JSX.Element => (
    <div>
      {headerActions}
      {children}
    </div>
  ),
}));

import { NodeConfigDialog } from '../node-config-dialog';

describe('NodeConfigDialog identity fields', () => {
  beforeEach(() => {
    mockState.setConfigOpen.mockReset();
    mockState.updateSelectedNode.mockReset();
    mockState.toast.mockReset();
    mockState.savePathConfig.mockReset();
    mockState.savePathConfig.mockResolvedValue(true);
    mockState.setNodeConfigDraft.mockReset();
    mockState.setNodeConfigDirty.mockReset();
    mockState.selectedNode = {
      id: 'node-1',
      instanceId: 'node-instance-1',
      nodeTypeId: 'nt-7f3e2a1b4c5d6e7f8a9b0c1d',
      type: 'model',
      title: 'Model',
      description: '',
      inputs: ['prompt'],
      outputs: ['result'],
      position: { x: 0, y: 0 },
      data: {},
      config: {},
      createdAt: '2026-02-23T00:00:00.000Z',
      updatedAt: null,
    } as AiNode;
  });

  it('shows explicit type and instance identifiers', () => {
    render(<NodeConfigDialog />);

    expect(screen.getByText('Type ID')).toBeTruthy();
    expect(screen.getByText('Instance ID')).toBeTruthy();
    expect(screen.getByText('nt-7f3e2a1b4c5d6e7f8a9b0c1d')).toBeTruthy();
    expect(screen.getByText('node-instance-1')).toBeTruthy();
  });

  it('falls back to node.type and node.id when optional identity fields are missing', () => {
    mockState.selectedNode = {
      ...mockState.selectedNode,
      nodeTypeId: undefined,
      instanceId: undefined,
      type: 'prompt',
      id: 'node-prompt-1',
    } as AiNode;

    render(<NodeConfigDialog />);

    expect(screen.getByText('prompt')).toBeTruthy();
    expect(screen.getByText('node-prompt-1')).toBeTruthy();
  });

  it('renders the dialog when config is open and the selected node is present', () => {
    render(<NodeConfigDialog />);

    expect(screen.getByText('Config Sections')).toBeTruthy();
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
  });
});
