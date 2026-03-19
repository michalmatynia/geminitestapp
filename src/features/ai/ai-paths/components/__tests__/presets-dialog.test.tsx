import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  presetsState: null as Record<string, unknown> | null,
  setPresetsModalOpen: vi.fn(),
  setPresetsJson: vi.fn(),
  handleImportPresets: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  usePresetsState: () => mockState.presetsState,
  usePresetsActions: () => ({
    setPresetsModalOpen: mockState.setPresetsModalOpen,
    setPresetsJson: mockState.setPresetsJson,
  }),
}));

vi.mock('../hooks/usePresetsImport', () => ({
  usePresetsImport: () => ({
    handleImportPresets: mockState.handleImportPresets,
    ConfirmationModal: () => <div data-testid='confirmation-modal' />,
  }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.JSX.Element => (
    <textarea {...props} />
  ),
  useToast: () => ({
    toast: mockState.toast,
  }),
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{subtitle}</div>
        <button type='button' onClick={onClose}>
          Close Modal
        </button>
        {children}
      </div>
    ) : null,
}));

import { PresetsDialog } from '../presets-dialog';

const clusterPresets = [
  {
    id: 'preset-1',
    name: 'Preset One',
    description: 'First preset',
    bundlePorts: ['bundle'],
    template: 'Hello',
    createdAt: '2026-03-19T10:00:00.000Z',
    updatedAt: '2026-03-19T10:00:00.000Z',
  },
];

describe('PresetsDialog', () => {
  beforeEach(() => {
    mockState.presetsState = {
      presetsModalOpen: true,
      presetsJson: '{"preset":true}',
      clusterPresets,
    };
    mockState.setPresetsModalOpen.mockReset();
    mockState.setPresetsJson.mockReset();
    mockState.handleImportPresets.mockReset().mockResolvedValue(undefined);
    mockState.toast.mockReset();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it('renders the modal and wires textarea, close, export, and import actions', async () => {
    render(<PresetsDialog />);

    expect(screen.getByText('Export / Import Presets')).toBeInTheDocument();
    expect(screen.getByText('Share Cluster Presets as JSON across projects.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('{"preset":true}')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Presets JSON'), {
      target: { value: '{"next":1}' },
    });
    expect(mockState.setPresetsJson).toHaveBeenCalledWith('{"next":1}');

    fireEvent.click(screen.getByRole('button', { name: 'Load Export' }));
    expect(mockState.setPresetsJson).toHaveBeenLastCalledWith(JSON.stringify(clusterPresets, null, 2));

    fireEvent.click(screen.getByRole('button', { name: 'Import (Merge)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace Existing' }));

    await waitFor(() => {
      expect(mockState.handleImportPresets).toHaveBeenNthCalledWith(1, 'merge');
      expect(mockState.handleImportPresets).toHaveBeenNthCalledWith(2, 'replace');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close Modal' }));
    expect(mockState.setPresetsModalOpen).toHaveBeenCalledWith(false);
  });

  it('copies current presets json and reports clipboard success and failure', async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('nope'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<PresetsDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(1, '{"preset":true}');
      expect(mockState.toast).toHaveBeenNthCalledWith(1, 'Presets JSON copied.', {
        variant: 'success',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(2, '{"preset":true}');
      expect(mockState.toast).toHaveBeenNthCalledWith(2, 'Failed to copy presets JSON.', {
        variant: 'error',
      });
    });
  });

  it('falls back to export json, empty-copy info, and clipboard unavailable warning', () => {
    mockState.presetsState = {
      presetsModalOpen: true,
      presetsJson: '',
      clusterPresets,
    };
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    const { rerender } = render(<PresetsDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(mockState.toast).toHaveBeenCalledWith('Clipboard API unavailable.', {
      variant: 'warning',
    });

    mockState.presetsState = {
      presetsModalOpen: true,
      presetsJson: '   ',
      clusterPresets: [],
    };
    rerender(<PresetsDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(mockState.toast).toHaveBeenCalledWith('Nothing to copy.', {
      variant: 'info',
    });
  });
});
