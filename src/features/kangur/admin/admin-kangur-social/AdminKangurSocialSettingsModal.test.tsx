/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  const TabsContext = ReactModule.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: 'models' });

  return {
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Button: ({
      children,
      ...rest
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button {...rest}>{children}</button>
    ),
    Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    FormField: ({
      label,
      description,
      children,
    }: {
      label: string;
      description?: string;
      children: React.ReactNode;
    }) => (
      <label>
        <span>{label}</span>
        {description ? <span>{description}</span> : null}
        {children}
      </label>
    ),
    FormModal: ({
      open,
      title,
      children,
    }: {
      open?: boolean;
      title: string;
      children: React.ReactNode;
    }) =>
      open ? (
        <div role='dialog' aria-label={title}>
          <h2>{title}</h2>
          {children}
        </div>
      ) : null,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    SelectSimple: ({
      value,
      onValueChange,
      options,
      ariaLabel,
      title,
      disabled,
    }: {
      value?: string;
      onValueChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      ariaLabel?: string;
      title?: string;
      disabled?: boolean;
    }) => (
      <select
        aria-label={ariaLabel}
        title={title}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({
      children,
      'aria-label': ariaLabel,
    }: {
      children: React.ReactNode;
      'aria-label'?: string;
    }) => <div role='tablist' aria-label={ariaLabel}>{children}</div>,
    TabsTrigger: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const ctx = ReactModule.useContext(TabsContext);
      return (
        <button
          type='button'
          role='tab'
          aria-selected={ctx.value === value}
          onClick={() => ctx.onValueChange?.(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const ctx = ReactModule.useContext(TabsContext);
      return ctx.value === value ? <div>{children}</div> : null;
    },
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea {...props} />
    ),
  };
});

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

import { AdminKangurSocialSettingsModal } from './AdminKangurSocialSettingsModal';

describe('AdminKangurSocialSettingsModal', () => {
  it('owns the documentation, publishing, and capture controls that were removed from the post modal', () => {
    const onBrainModelChange = vi.fn();
    const onVisionModelChange = vi.fn();
    const onLinkedInConnectionChange = vi.fn();
    const onProjectUrlChange = vi.fn();
    const onDocReferenceInputChange = vi.fn();
    const onGenerationNotesChange = vi.fn();
    const onLoadContext = vi.fn();
    const onGenerate = vi.fn();
    const onPreviewDocUpdates = vi.fn();
    const onApplyDocUpdates = vi.fn();
    const onHandleCreateAddon = vi.fn();
    const onBatchCaptureBaseUrlChange = vi.fn();
    const onBatchCapturePresetLimitChange = vi.fn();
    const onToggleCapturePreset = vi.fn();
    const onSelectAllCapturePresets = vi.fn();
    const onClearCapturePresets = vi.fn();
    const onHandleBatchCapture = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        brainModelId: 'gpt-4.1-mini',
        visionModelId: 'gpt-4.1',
        projectUrl: 'https://studiq.example.com/project',
        handleBrainModelChange: onBrainModelChange,
        handleVisionModelChange: onVisionModelChange,
        handleLinkedInConnectionChange: onLinkedInConnectionChange,
        setProjectUrl: onProjectUrlChange,
        setDocReferenceInput: onDocReferenceInputChange,
        setGenerationNotes: onGenerationNotesChange,
        handleLoadContext: onLoadContext,
        handleGenerate: onGenerate,
        handlePreviewDocUpdates: onPreviewDocUpdates,
        handleApplyDocUpdates: onApplyDocUpdates,
        handleCreateAddon: onHandleCreateAddon,
        setBatchCaptureBaseUrl: onBatchCaptureBaseUrlChange,
        setBatchCapturePresetLimit: onBatchCapturePresetLimitChange,
        handleToggleCapturePreset: onToggleCapturePreset,
        selectAllCapturePresets: onSelectAllCapturePresets,
        clearCapturePresets: onClearCapturePresets,
        handleBatchCapture: onHandleBatchCapture,
        docReferenceInput: 'overview, lessons-and-activities',
        generationNotes: 'Focus on current product changes.',
        resolveDocReferences: () => ['overview', 'lessons-and-activities'],
      })
    );

    render(
      <AdminKangurSocialSettingsModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        hasUnsavedChanges={false}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Social Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Publishing' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Capture' })).toBeInTheDocument();
    expect(screen.getAllByText('Open AI Brain routing')).toHaveLength(2);
    expect(
      screen.getByText(
        'Available models are provided by AI Brain. Choose a specific model or keep the routing default.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Selected brain model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('Selected vision model')).toHaveValue('gpt-4.1');

    fireEvent.change(screen.getByLabelText('Selected brain model'), {
      target: { value: 'gpt-4.1' },
    });
    fireEvent.change(screen.getByLabelText('Selected vision model'), {
      target: { value: 'gpt-4o' },
    });

    expect(onBrainModelChange).toHaveBeenCalledWith('gpt-4.1');
    expect(onVisionModelChange).toHaveBeenCalledWith('gpt-4o');

    fireEvent.click(screen.getByRole('tab', { name: 'Documentation' }));
    expect(screen.getByLabelText('Documentation references')).toHaveValue(
      'overview, lessons-and-activities'
    );
    expect(screen.getByLabelText('Notes for the Brain generator')).toHaveValue(
      'Focus on current product changes.'
    );
    expect(screen.getByRole('button', { name: 'Load context' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate PL/EN draft' })).toBeInTheDocument();
    expect(screen.getByText('Documentation updates')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Publishing' }));
    expect(screen.getByLabelText('Default LinkedIn connection')).toBeInTheDocument();
    expect(
      screen.getByText('Per-post editors now use the default publishing connection from this settings modal.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));
    expect(screen.getByText('Capture single add-on')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture with Playwright' })).toBeInTheDocument();
    expect(screen.getByText('Batch capture presets')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All selected presets')).toHaveValue(2);
    expect(
      screen.getByText('Playwright will capture up to 1 of 1 selected presets in each run.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture presets' })).toBeInTheDocument();
  });

  it('blocks draft generation when no social or AI Brain post model is configured', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        brainModelId: null,
        visionModelId: null,
        projectUrl: '',
        brainModelOptions: {
          effectiveModelId: null,
          models: [],
          isLoading: false,
        },
        visionModelOptions: {
          effectiveModelId: 'gemma3:12b',
          models: [],
          isLoading: false,
        },
        linkedinConnectionId: null,
        linkedinConnections: [],
        linkedinIntegration: null,
        batchCaptureBaseUrl: '',
        batchCapturePresetIds: [],
        batchCapturePresetLimit: null,
        effectiveBatchCapturePresetCount: 0,
        canGenerateSocialDraft: false,
        socialDraftBlockedReason:
          'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
        socialVisionWarning:
          'Visual analysis is not configured. Choose a StudiQ Social vision model in Settings or assign AI Brain routing to enable screenshot analysis.',
        resolveDocReferences: () => [],
      })
    );

    render(
      <AdminKangurSocialSettingsModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Documentation' }));

    expect(screen.getByRole('button', { name: 'Generate PL/EN draft' })).toBeDisabled();
    expect(
      screen.getByText(
        'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.'
      )
    ).toBeInTheDocument();
  });
});

function buildActivePost() {
  return {
    id: 'post-1',
    titlePl: 'StudiQ Weekly Update',
    titleEn: 'StudiQ Weekly Update',
    bodyPl: '',
    bodyEn: '',
    combinedBody: '',
    status: 'draft' as const,
    scheduledAt: null,
    publishedAt: null,
    linkedinPostId: null,
    linkedinUrl: null,
    linkedinConnectionId: null,
    brainModelId: null,
    visionModelId: null,
    publishError: null,
    imageAssets: [],
    imageAddonIds: [],
    docReferences: [],
    contextSummary: null,
    generatedSummary: null,
    visualSummary: null,
    visualHighlights: [],
    visualDocUpdates: [],
    docUpdatesAppliedAt: null,
    docUpdatesAppliedBy: null,
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-03-19T10:00:00.000Z',
    updatedAt: '2026-03-19T10:00:00.000Z',
  };
}

function buildSocialPostContextState(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    activePost: buildActivePost(),
    brainModelId: 'gpt-4.1-mini',
    visionModelId: 'gpt-4.1',
    projectUrl: 'https://studiq.example.com/project',
    setProjectUrl: vi.fn(),
    handleBrainModelChange: vi.fn(),
    handleVisionModelChange: vi.fn(),
    brainModelOptions: {
      effectiveModelId: 'gpt-4.1-mini',
      models: ['gpt-4.1-mini', 'gpt-4.1'],
      isLoading: false,
    },
    visionModelOptions: {
      effectiveModelId: 'gpt-4.1',
      models: ['gpt-4.1', 'gpt-4o'],
      isLoading: false,
    },
    linkedinConnectionId: 'linkedin-1',
    handleLinkedInConnectionChange: vi.fn(),
    linkedinConnections: [
      {
        id: 'linkedin-1',
        name: 'Primary LinkedIn',
        username: 'primary-linkedin',
        hasLinkedInAccessToken: true,
        linkedinExpiresAt: null,
      },
    ],
    linkedinIntegration: { id: 'integration-1' },
    docReferenceInput: 'overview, lessons-and-activities',
    setDocReferenceInput: vi.fn(),
    generationNotes: 'Focus on current product changes.',
    setGenerationNotes: vi.fn(),
    contextLoading: false,
    handleLoadContext: vi.fn(),
    handleGenerate: vi.fn(),
    canGenerateSocialDraft: true,
    socialDraftBlockedReason: null,
    socialVisionWarning: null,
    resolveDocReferences: () => ['overview', 'lessons-and-activities'],
    previewDocUpdatesMutation: { isPending: false },
    applyDocUpdatesMutation: { isPending: false },
    handlePreviewDocUpdates: vi.fn(),
    handleApplyDocUpdates: vi.fn(),
    docUpdatesResult: null,
    addonForm: {
      title: '',
      sourceUrl: '',
      selector: '',
      description: '',
      waitForMs: '',
    },
    setAddonForm: vi.fn(),
    createAddonMutation: { isPending: false },
    handleCreateAddon: vi.fn(),
    batchCaptureBaseUrl: 'https://studiq.example.com',
    setBatchCaptureBaseUrl: vi.fn(),
    batchCapturePresetIds: ['home'],
    batchCapturePresetLimit: 2,
    setBatchCapturePresetLimit: vi.fn(),
    handleToggleCapturePreset: vi.fn(),
    selectAllCapturePresets: vi.fn(),
    clearCapturePresets: vi.fn(),
    handleBatchCapture: vi.fn(),
    batchCaptureMutation: { isPending: false },
    batchCaptureResult: null,
    effectiveBatchCapturePresetCount: 1,
    ...overrides,
  };
}
