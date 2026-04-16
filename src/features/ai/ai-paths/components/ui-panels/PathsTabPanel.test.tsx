import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  handleCreatePath: vi.fn(),
  handleCreateFromTemplate: vi.fn(),
  handleSwitchPath: vi.fn(),
  handleDeletePath: vi.fn(async () => undefined),
  handleDuplicatePath: vi.fn(),
  handleMoveFolder: vi.fn(async () => undefined),
  handleMovePathToFolder: vi.fn(async () => undefined),
  handleRenameFolder: vi.fn(async () => undefined),
  savePathIndex: vi.fn(async () => undefined),
  persistPathSettings: vi.fn(async () => undefined),
  toast: vi.fn(),
  reportAiPathsError: vi.fn(),
  ConfirmationModal: vi.fn(() => null),
  setPaths: vi.fn(),
  setPathConfigs: vi.fn(),
  graphState: {
    activePathId: 'path-main',
    paths: [
      {
        id: 'path-main',
        name: 'Path Main',
        createdAt: '2026-03-05',
        updatedAt: '2026-03-05',
        folderPath: 'drafts/seo',
      },
    ],
    pathConfigs: {
      'path-main': {
        id: 'path-main',
        name: 'Path Main',
      },
    },
  },
}));

vi.mock('../hooks/usePathsTabPanelActions', () => ({
  usePathsTabPanelActions: () => ({
    handleCreatePath: mockState.handleCreatePath,
    handleCreateFromTemplate: mockState.handleCreateFromTemplate,
    handleSwitchPath: mockState.handleSwitchPath,
    handleDeletePath: mockState.handleDeletePath,
    handleDuplicatePath: mockState.handleDuplicatePath,
    handleMoveFolder: mockState.handleMoveFolder,
    handleMovePathToFolder: mockState.handleMovePathToFolder,
    handleRenameFolder: mockState.handleRenameFolder,
    savePathIndex: mockState.savePathIndex,
    persistPathSettings: mockState.persistPathSettings,
    toast: mockState.toast,
    reportAiPathsError: mockState.reportAiPathsError,
    ConfirmationModal: mockState.ConfirmationModal,
  }),
}));

vi.mock('../../context', () => ({
  usePathMetadataState: () => mockState.graphState,
  useGraphActions: () => ({
    setPaths: mockState.setPaths,
    setPathConfigs: mockState.setPathConfigs,
  }),
}));

vi.mock('../ai-paths-settings/AiPathsMasterTreePanel', () => ({
  AiPathsMasterTreePanel: ({
    adapter,
    onPathOpen,
    pathClickBehavior,
    renderHeaderActions,
    showPathHoverActions,
  }: {
    adapter: { handleSwitchPath: (pathId: string) => void };
    onPathOpen?: (pathId: string) => void;
    pathClickBehavior?: 'open' | 'select';
    renderHeaderActions?: (input: { selectedFolderPath: string }) => React.ReactNode;
    showPathHoverActions?: boolean;
  }) => (
    <div
      data-testid='ai-paths-master-tree-panel'
      data-path-click-behavior={pathClickBehavior}
      data-show-hover-actions={showPathHoverActions ? 'true' : 'false'}
    >
      <button
        type='button'
        onClick={() => {
          if (pathClickBehavior === 'open') {
            adapter.handleSwitchPath('path-main');
          }
        }}
      >
        select row
      </button>
      <button
        type='button'
        onClick={() => {
          adapter.handleSwitchPath('path-main');
          onPathOpen?.('path-main');
        }}
      >
        preview from tree
      </button>
      <div>{renderHeaderActions?.({ selectedFolderPath: 'drafts/seo' })}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  ActionMenu: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{trigger}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button role='menuitem' type='button' onClick={onClick}>
      {children}
    </button>
  ),
  Textarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid='app-modal'>{children}</div> : null),
}));

import { PathsTabPanel } from './PathsTabPanel';
import { PATH_TEMPLATES } from '@/shared/lib/ai-paths/core/utils/path-templates';

describe('PathsTabPanel', () => {
  beforeEach(() => {
    mockState.handleCreatePath.mockReset();
    mockState.handleCreateFromTemplate.mockReset();
    mockState.handleSwitchPath.mockReset();
    mockState.handleDeletePath.mockReset();
    mockState.handleDuplicatePath.mockReset();
    mockState.handleMoveFolder.mockReset();
    mockState.handleMovePathToFolder.mockReset();
    mockState.handleRenameFolder.mockReset();
    mockState.savePathIndex.mockReset();
    mockState.persistPathSettings.mockReset();
    mockState.toast.mockReset();
    mockState.reportAiPathsError.mockReset();
    mockState.setPaths.mockReset();
    mockState.setPathConfigs.mockReset();
  });

  it('renders the shared master tree and routes tree opens back to the caller', () => {
    const onPathOpen = vi.fn();

    render(<PathsTabPanel onPathOpen={onPathOpen} />);

    expect(screen.getByTestId('ai-paths-master-tree-panel')).toBeInTheDocument();
    expect(screen.getByTestId('ai-paths-master-tree-panel')).toHaveAttribute(
      'data-path-click-behavior',
      'select',
    );
    expect(screen.getByTestId('ai-paths-master-tree-panel')).toHaveAttribute(
      'data-show-hover-actions',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'select row' }));

    expect(mockState.handleSwitchPath).not.toHaveBeenCalled();
    expect(onPathOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'preview from tree' }));

    expect(mockState.handleSwitchPath).toHaveBeenCalledWith('path-main');
    expect(onPathOpen).toHaveBeenCalledWith('path-main');
  });

  it('creates template paths inside the currently selected tree folder', () => {
    render(<PathsTabPanel />);

    fireEvent.click(screen.getByRole('menuitem', { name: PATH_TEMPLATES[0]?.name ?? '' }));

    expect(mockState.handleCreateFromTemplate).toHaveBeenCalledWith(
      PATH_TEMPLATES[0]?.templateId,
      { folderPath: 'drafts/seo' }
    );
  });

  it('surfaces the marketplace copy debrand starter in the template menu', () => {
    render(<PathsTabPanel />);

    const debrandTemplate = PATH_TEMPLATES.find(
      (template) => template.templateId === 'starter_marketplace_copy_debrand'
    );

    expect(debrandTemplate).toBeTruthy();
    expect(
      screen.getByRole('menuitem', { name: debrandTemplate?.name ?? 'Debrand Marketplace Copy' })
    ).toBeInTheDocument();
  });
});
