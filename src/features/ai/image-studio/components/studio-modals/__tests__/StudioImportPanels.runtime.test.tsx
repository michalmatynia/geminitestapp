import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  StudioImportProvider,
  type StudioImportContextValue,
} from '../StudioImportContext';
import { StudioImportPanels } from '../StudioImportPanels';

const mocks = vi.hoisted(() => ({
  handleCreateEmptySlot: vi.fn(),
  handleDriveSelection: vi.fn(),
  handleLocalUpload: vi.fn(),
  setDriveImportMode: vi.fn(),
  setDriveImportOpen: vi.fn(),
  setDriveImportTargetId: vi.fn(),
  setLocalUploadMode: vi.fn(),
  setLocalUploadTargetId: vi.fn(),
  setSlotCreateOpen: vi.fn(),
  triggerLocalUpload: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
  FileUploadTrigger: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <>{children}</>,
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    children,
    footer,
    isOpen,
    onClose,
    title,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title: string;
  }): React.JSX.Element | null =>
    isOpen ? (
      <div data-testid={`modal-${title}`}>
        <div>{title}</div>
        <button type='button' onClick={onClose}>
          Close Modal
        </button>
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock('@/features/files/components/FileManager', async () => {
  const React = await import('react');

  const FileManagerRuntimeContext = React.createContext<{
    onSelectFile: (files: Array<{ id: string; filepath: string; filename: string }>) => void;
      } | null>(null);

  function FileManager(): React.JSX.Element {
    const runtime = React.useContext(FileManagerRuntimeContext);
    if (!runtime) {
      throw new Error('FileManagerRuntimeContext missing in test');
    }
    return (
      <button
        type='button'
        onClick={() => {
          runtime.onSelectFile([
            {
              id: 'file-1',
              filepath: '/tmp/file-1.png',
              filename: 'file-1.png',
            },
          ]);
        }}
      >
        Select Drive File
      </button>
    );
  }

  return {
    __esModule: true,
    default: FileManager,
    FileManagerRuntimeContext,
  };
});

const createContextValue = (
  overrides: Partial<StudioImportContextValue> = {}
): StudioImportContextValue => ({
  driveImportMode: 'create',
  driveImportOpen: false,
  driveImportTargetId: null,
  handleCreateEmptySlot: mocks.handleCreateEmptySlot,
  handleDriveSelection: mocks.handleDriveSelection,
  handleLocalUpload: mocks.handleLocalUpload,
  projectId: 'project-alpha',
  selectedSlot: { id: 'slot-selected' } as any,
  setDriveImportMode: mocks.setDriveImportMode,
  setDriveImportOpen: mocks.setDriveImportOpen,
  setDriveImportTargetId: mocks.setDriveImportTargetId,
  setLocalUploadMode: mocks.setLocalUploadMode,
  setLocalUploadTargetId: mocks.setLocalUploadTargetId,
  setSlotCreateOpen: mocks.setSlotCreateOpen,
  slotCreateOpen: false,
  triggerLocalUpload: mocks.triggerLocalUpload,
  uploadPending: false,
  ...overrides,
});

describe('StudioImportPanels runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives drive-import title and actions from StudioImportContext', () => {
    render(
      <StudioImportProvider
        value={createContextValue({
          driveImportMode: 'replace',
          driveImportOpen: true,
          driveImportTargetId: 'target-slot-1',
        })}
      >
        <StudioImportPanels />
      </StudioImportProvider>
    );

    expect(screen.getByText('Attach Image To Selected Card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select Drive File' }));
    expect(mocks.handleDriveSelection).toHaveBeenCalledWith([
      {
        id: 'file-1',
        filepath: '/tmp/file-1.png',
        filename: 'file-1.png',
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Upload From Computer' }));
    expect(mocks.setLocalUploadMode).toHaveBeenCalledWith('replace');
    expect(mocks.setLocalUploadTargetId).toHaveBeenCalledWith('target-slot-1');

    fireEvent.click(screen.getByRole('button', { name: 'Close Modal' }));
    expect(mocks.setDriveImportOpen).toHaveBeenCalledWith(false);
    expect(mocks.setDriveImportMode).toHaveBeenCalledWith('create');
    expect(mocks.setDriveImportTargetId).toHaveBeenCalledWith(null);
  });

  it('derives slot-create actions from StudioImportContext', () => {
    render(
      <StudioImportProvider
        value={createContextValue({
          slotCreateOpen: true,
        })}
      >
        <StudioImportPanels />
      </StudioImportProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Create Card From Image/i }));
    expect(mocks.setSlotCreateOpen).toHaveBeenCalledWith(false);
    expect(mocks.setDriveImportMode).toHaveBeenCalledWith('create');
    expect(mocks.setDriveImportTargetId).toHaveBeenCalledWith(null);
    expect(mocks.setDriveImportOpen).toHaveBeenCalledWith(true);
  });
});
