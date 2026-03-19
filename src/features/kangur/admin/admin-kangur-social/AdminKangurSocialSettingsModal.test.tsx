/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BRAIN_MODEL_DEFAULT_VALUE } from './AdminKangurSocialPage.Constants';

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

import { AdminKangurSocialSettingsModal } from './AdminKangurSocialSettingsModal';

describe('AdminKangurSocialSettingsModal', () => {
  it('owns the documentation, publishing, and capture controls that were removed from the post modal', () => {
    const onBrainModelChange = vi.fn();
    const onVisionModelChange = vi.fn();

    render(
      <AdminKangurSocialSettingsModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        hasUnsavedChanges={false}
        brainModelId='gpt-4.1-mini'
        visionModelId='gpt-4.1'
        projectUrl='https://studiq.example.com/project'
        brainModelBadgeLabel='gpt-4.1-mini'
        visionModelBadgeLabel='gpt-4.1'
        brainModelSelectOptions={[
          { value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' },
          { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
          { value: 'gpt-4.1', label: 'gpt-4.1' },
        ]}
        visionModelSelectOptions={[
          { value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' },
          { value: 'gpt-4.1', label: 'gpt-4.1' },
          { value: 'gpt-4o', label: 'gpt-4o' },
        ]}
        brainModelLoading={false}
        visionModelLoading={false}
        linkedinConnectionId='linkedin-1'
        linkedInOptions={[{ value: 'linkedin-1', label: 'Primary LinkedIn' }]}
        linkedinIntegration={{ id: 'integration-1' }}
        selectedLinkedInConnection={{ id: 'linkedin-1', hasLinkedInAccessToken: true }}
        linkedInExpiryStatus='ok'
        linkedInExpiryLabel={null}
        linkedInDaysRemaining={null}
        addonForm={{
          title: '',
          sourceUrl: '',
          selector: '',
          description: '',
          waitForMs: '',
        }}
        setAddonForm={vi.fn()}
        createAddonPending={false}
        batchCaptureBaseUrl='https://studiq.example.com'
        batchCapturePresetIds={['home']}
        batchCapturePresetLimit={2}
        effectiveBatchCapturePresetCount={1}
        batchCapturePending={false}
        batchCaptureResult={null}
        activePost={{
          id: 'post-1',
          titlePl: 'StudiQ Weekly Update',
          titleEn: 'StudiQ Weekly Update',
          bodyPl: '',
          bodyEn: '',
          combinedBody: '',
          status: 'draft',
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
        }}
        contextSummary={null}
        contextLoading={false}
        docReferenceInput='overview, lessons-and-activities'
        generationNotes='Focus on current product changes.'
        docsUsed={['overview', 'lessons-and-activities']}
        hasVisualDocUpdates={false}
        previewDocUpdatesPending={false}
        applyDocUpdatesPending={false}
        docUpdatesResult={null}
        docUpdatesAppliedAt={null}
        docUpdatesAppliedBy={null}
        docUpdatesAppliedCount={0}
        docUpdatesSkippedCount={0}
        docUpdatesPlan={null}
        canGenerateDraft={true}
        generateDraftBlockedReason={null}
        socialVisionWarning={null}
        onBrainModelChange={onBrainModelChange}
        onVisionModelChange={onVisionModelChange}
        onLinkedInConnectionChange={vi.fn()}
        onProjectUrlChange={vi.fn()}
        onDocReferenceInputChange={vi.fn()}
        onGenerationNotesChange={vi.fn()}
        onLoadContext={vi.fn()}
        onGenerate={vi.fn()}
        onPreviewDocUpdates={vi.fn()}
        onApplyDocUpdates={vi.fn()}
        onHandleCreateAddon={vi.fn()}
        onBatchCaptureBaseUrlChange={vi.fn()}
        onBatchCapturePresetLimitChange={vi.fn()}
        onToggleCapturePreset={vi.fn()}
        onSelectAllCapturePresets={vi.fn()}
        onClearCapturePresets={vi.fn()}
        onHandleBatchCapture={vi.fn()}
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
    const props = {
      open: true,
      onClose: vi.fn(),
      onSave: vi.fn(),
      isSaving: false,
      hasUnsavedChanges: false,
      brainModelId: null,
      visionModelId: null,
      projectUrl: '',
      brainModelBadgeLabel: 'Not configured',
      visionModelBadgeLabel: 'gemma3:12b',
      brainModelSelectOptions: [{ value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' }],
      visionModelSelectOptions: [{ value: BRAIN_MODEL_DEFAULT_VALUE, label: 'Use Brain routing' }],
      brainModelLoading: false,
      visionModelLoading: false,
      linkedinConnectionId: null,
      linkedInOptions: [],
      linkedinIntegration: null,
      selectedLinkedInConnection: null,
      linkedInExpiryStatus: null,
      linkedInExpiryLabel: null,
      linkedInDaysRemaining: null,
      addonForm: {
        title: '',
        sourceUrl: '',
        selector: '',
        description: '',
        waitForMs: '',
      },
      setAddonForm: vi.fn(),
      createAddonPending: false,
      batchCaptureBaseUrl: '',
      batchCapturePresetIds: [],
      batchCapturePresetLimit: null,
      effectiveBatchCapturePresetCount: 0,
      batchCapturePending: false,
      batchCaptureResult: null,
      activePost: buildActivePost(),
      contextSummary: null,
      contextLoading: false,
      docReferenceInput: '',
      generationNotes: '',
      docsUsed: [],
      hasVisualDocUpdates: false,
      previewDocUpdatesPending: false,
      applyDocUpdatesPending: false,
      docUpdatesResult: null,
      docUpdatesAppliedAt: null,
      docUpdatesAppliedBy: null,
      docUpdatesAppliedCount: 0,
      docUpdatesSkippedCount: 0,
      docUpdatesPlan: null,
      canGenerateDraft: false,
      generateDraftBlockedReason:
        'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
      socialVisionWarning:
        'Visual analysis is not configured. Choose a StudiQ Social vision model in Settings or assign AI Brain routing to enable screenshot analysis.',
      onBrainModelChange: vi.fn(),
      onVisionModelChange: vi.fn(),
      onLinkedInConnectionChange: vi.fn(),
      onProjectUrlChange: vi.fn(),
      onDocReferenceInputChange: vi.fn(),
      onGenerationNotesChange: vi.fn(),
      onLoadContext: vi.fn(),
      onGenerate: vi.fn(),
      onPreviewDocUpdates: vi.fn(),
      onApplyDocUpdates: vi.fn(),
      onHandleCreateAddon: vi.fn(),
      onBatchCaptureBaseUrlChange: vi.fn(),
      onBatchCapturePresetLimitChange: vi.fn(),
      onToggleCapturePreset: vi.fn(),
      onSelectAllCapturePresets: vi.fn(),
      onClearCapturePresets: vi.fn(),
      onHandleBatchCapture: vi.fn(),
    } as const;

    render(
      <AdminKangurSocialSettingsModal {...props} />
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
