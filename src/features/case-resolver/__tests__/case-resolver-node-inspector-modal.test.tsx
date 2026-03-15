import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaseResolverNodeInspectorModal } from '@/features/case-resolver/components/CaseResolverNodeInspectorModal';

const manualSaveMock = vi.fn();
let hasPendingSnapshotChanges = false;

vi.mock('@/features/case-resolver/components/NodeFileWorkspaceContext', () => ({
  useNodeFileWorkspaceStateContext: () => ({
    isNodeInspectorOpen: true,
    hasPendingSnapshotChanges,
    selectedNode: null,
    selectedPromptMeta: null,
    selectedPromptSourceFile: null,
    selectedPromptTemplate: '',
    selectedPromptInputText: '',
    selectedPromptOutputPreview: null,
    selectedPromptSecondaryOutputHint: '',
    selectedEdge: null,
    selectedEdgeJoinMode: 'newline',
  }),
  useNodeFileWorkspaceActionsContext: () => ({
    setIsNodeInspectorOpen: vi.fn(),
    handleManualSave: manualSaveMock,
    updateSelectedPromptTemplate: vi.fn(),
    updateSelectedNodeMeta: vi.fn(),
    updateSelectedEdgeMeta: vi.fn(),
  }),
}));

vi.mock('@/features/case-resolver/context/CaseResolverPageContext', () => ({
  useCaseResolverPageState: () => ({
    workspace: { id: 'workspace-1' },
    activeFile: { id: 'file-1' },
  }),
  useCaseResolverPageActions: () => ({
    onEditFile: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: new Map(),
  }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Checkbox: () => <input type='checkbox' readOnly />,
  FormField: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  SelectSimple: () => <div />,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  CompactEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  useToast: () => ({ toast: vi.fn() }),
  ValidatorFormatterToggle: () => <div />,
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

describe('CaseResolverNodeInspectorModal', () => {
  beforeEach(() => {
    manualSaveMock.mockReset();
    hasPendingSnapshotChanges = false;
  });

  it('disables Update button when there are no pending snapshot changes', () => {
    render(<CaseResolverNodeInspectorModal />);
    const updateButton = screen.getByRole('button', { name: 'Update' });
    expect(updateButton).toBeDisabled();
  });

  it('enables Update button and triggers manual save when pending changes exist', () => {
    hasPendingSnapshotChanges = true;
    render(<CaseResolverNodeInspectorModal />);
    const updateButton = screen.getByRole('button', { name: 'Update' });
    expect(updateButton).toBeEnabled();
    fireEvent.click(updateButton);
    expect(manualSaveMock).toHaveBeenCalledTimes(1);
  });
});
