import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  presetDraft: {
    name: 'Starter Preset',
    description: 'Starter description',
    bundlePorts: 'bundle\ncontext',
    template: 'Hello {{name}}',
  },
  editingPresetId: null as string | null,
  clusterPresets: [] as Array<Record<string, unknown>>,
  appliedDrafts: [] as Array<Record<string, unknown>>,
  setPresetDraft: vi.fn(),
  resetPresetDraft: vi.fn(),
  loadPresetIntoDraft: vi.fn(),
  handlePresetFromSelection: vi.fn(),
  handleSavePreset: vi.fn(),
  handleApplyPreset: vi.fn(),
  handleDeletePreset: vi.fn(),
  handleExportPresets: vi.fn(),
}));

vi.mock('../../context', () => ({
  usePresetsState: () => ({
    presetDraft: mockState.presetDraft,
    editingPresetId: mockState.editingPresetId,
    clusterPresets: mockState.clusterPresets,
  }),
  usePresetsActions: () => ({
    setPresetDraft: mockState.setPresetDraft,
    resetPresetDraft: mockState.resetPresetDraft,
    loadPresetIntoDraft: mockState.loadPresetIntoDraft,
  }),
}));

vi.mock('../hooks/useClusterPresetsActions', () => ({
  useClusterPresetsActions: () => ({
    handlePresetFromSelection: mockState.handlePresetFromSelection,
    handleSavePreset: mockState.handleSavePreset,
    handleApplyPreset: mockState.handleApplyPreset,
    handleDeletePreset: mockState.handleDeletePreset,
    handleExportPresets: mockState.handleExportPresets,
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element => (
    <input {...props} />
  ),
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element => (
    <label {...props}>{children}</label>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.JSX.Element => (
    <textarea {...props} />
  ),
  Card: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  SimpleSettingsList: ({
    items,
    emptyMessage,
    renderActions,
    onDelete,
  }: {
    items: Array<Record<string, unknown>>;
    emptyMessage: string;
    renderActions: (item: Record<string, unknown>) => React.ReactNode;
    onDelete: (item: Record<string, unknown>) => void;
  }): React.JSX.Element => (
    <div>
      {items.length === 0 ? <div>{emptyMessage}</div> : null}
      {items.map((item) => (
        <div key={String(item.id)}>
          <div>{String(item.title)}</div>
          <div>{String(item.description ?? '')}</div>
          <div>{String(item.subtitle ?? '')}</div>
          <div>{renderActions(item)}</div>
          <button type='button' onClick={() => onDelete(item)}>
            Delete {String(item.title)}
          </button>
        </div>
      ))}
    </div>
  ),
}));

import { ClusterPresetsPanel } from '../cluster-presets-panel';

const buildPreset = (overrides: Record<string, unknown> = {}) => ({
  id: 'preset-1',
  name: 'Reusable Cluster',
  description: 'Reusable description',
  bundlePorts: ['bundle', 'context'],
  template: 'Prompt template',
  createdAt: '2026-03-19T09:00:00.000Z',
  updatedAt: '2026-03-19T09:05:00.000Z',
  ...overrides,
});

describe('ClusterPresetsPanel', () => {
  beforeEach(() => {
    mockState.presetDraft = {
      name: 'Starter Preset',
      description: 'Starter description',
      bundlePorts: 'bundle\ncontext',
      template: 'Hello {{name}}',
    };
    mockState.editingPresetId = null;
    mockState.clusterPresets = [];
    mockState.appliedDrafts = [];

    mockState.setPresetDraft.mockReset().mockImplementation((updater) => {
      const nextDraft =
        typeof updater === 'function' ? updater(mockState.presetDraft) : updater;
      mockState.appliedDrafts.push(nextDraft);
      mockState.presetDraft = nextDraft;
    });
    mockState.resetPresetDraft.mockReset();
    mockState.loadPresetIntoDraft.mockReset();
    mockState.handlePresetFromSelection.mockReset();
    mockState.handleSavePreset.mockReset().mockResolvedValue(undefined);
    mockState.handleApplyPreset.mockReset();
    mockState.handleDeletePreset.mockReset();
    mockState.handleExportPresets.mockReset();
  });

  it('renders new preset mode and forwards field updates and top-level actions', async () => {
    render(<ClusterPresetsPanel />);

    expect(screen.getByText('Cluster Presets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Preset' })).toBeInTheDocument();
    expect(
      screen.getByText('No presets yet. Save a bundle + template pair to reuse across apps.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    const [nameInput, descriptionInput, bundlePortsInput, templateInput] =
      screen.getAllByRole('textbox');

    fireEvent.change(nameInput, {
      target: { value: 'Fresh Preset' },
    });
    fireEvent.change(descriptionInput, {
      target: { value: 'Updated description' },
    });
    fireEvent.change(bundlePortsInput, {
      target: { value: 'bundle\nsummary' },
    });
    fireEvent.change(templateInput, {
      target: { value: 'Prompt: {{value}}' },
    });

    expect(mockState.setPresetDraft).toHaveBeenCalledTimes(4);
    expect(mockState.appliedDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Fresh Preset',
          description: 'Starter description',
        }),
        expect.objectContaining({
          name: 'Fresh Preset',
          description: 'Updated description',
        }),
        expect.objectContaining({
          name: 'Fresh Preset',
          description: 'Updated description',
          bundlePorts: 'bundle\nsummary',
        }),
        expect.objectContaining({
          name: 'Fresh Preset',
          description: 'Updated description',
          bundlePorts: 'bundle\nsummary',
          template: 'Prompt: {{value}}',
        }),
      ])
    );

    fireEvent.click(screen.getByRole('button', { name: 'From Selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export / Import' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Preset' }));

    expect(mockState.handlePresetFromSelection).toHaveBeenCalledTimes(1);
    expect(mockState.handleExportPresets).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockState.handleSavePreset).toHaveBeenCalledTimes(1));
  });

  it('renders edit mode and forwards library actions for existing presets', async () => {
    const preset = buildPreset();
    mockState.editingPresetId = 'preset-1';
    mockState.clusterPresets = [preset];
    mockState.handleSavePreset.mockRejectedValueOnce(new Error('save failed'));

    render(<ClusterPresetsPanel />);

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Preset' })).toBeInTheDocument();
    expect(screen.getByText('Reusable Cluster')).toBeInTheDocument();
    expect(screen.getByText('Reusable description')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Reusable Cluster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Preset' }));

    expect(mockState.resetPresetDraft).toHaveBeenCalledTimes(1);
    expect(mockState.loadPresetIntoDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'preset-1', name: 'Reusable Cluster' })
    );
    expect(mockState.handleApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'preset-1', name: 'Reusable Cluster' })
    );
    expect(mockState.handleDeletePreset).toHaveBeenCalledWith('preset-1');
    await waitFor(() => expect(mockState.handleSavePreset).toHaveBeenCalledTimes(1));
  });
});
