/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));
const { usePlaywrightPersonasMock } = vi.hoisted(() => ({
  usePlaywrightPersonasMock: vi.fn(),
}));

const hasTextContent = (text: string) => (_content: string, node: Element | null) =>
  node?.textContent === text;

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
    FormModal: (props: {
      open?: boolean;
      title: string;
      children: React.ReactNode;
    }) => {
      const { open, title, children } = props;
      return open ? (
        <div role='dialog' aria-label={title}>
          <h2>{title}</h2>
          {children}
        </div>
      ) : null;
    },
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

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
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
    const onHandleCreateAddon = vi.fn();
    const onBatchCaptureBaseUrlChange = vi.fn();
    const onBatchCapturePresetLimitChange = vi.fn();
    const onToggleCapturePreset = vi.fn();
    const onSelectAllCapturePresets = vi.fn();
    const onClearCapturePresets = vi.fn();
    const onHandleBatchCapture = vi.fn();
    const onHandleOpenProgrammablePlaywrightModal = vi.fn();
    const onHandleOpenProgrammablePlaywrightModalFromDefaults = vi.fn();
    const onHandleResetProgrammableCaptureDefaults = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'persona-fast', name: 'Fast reviewer' }],
      isLoading: false,
      error: null,
    });
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
        handleCreateAddon: onHandleCreateAddon,
        setBatchCaptureBaseUrl: onBatchCaptureBaseUrlChange,
        setBatchCapturePresetLimit: onBatchCapturePresetLimitChange,
        handleToggleCapturePreset: onToggleCapturePreset,
        selectAllCapturePresets: onSelectAllCapturePresets,
        clearCapturePresets: onClearCapturePresets,
        handleBatchCapture: onHandleBatchCapture,
        handleOpenProgrammablePlaywrightModal: onHandleOpenProgrammablePlaywrightModal,
        handleOpenProgrammablePlaywrightModalFromDefaults:
          onHandleOpenProgrammablePlaywrightModalFromDefaults,
        handleResetProgrammableCaptureDefaults: onHandleResetProgrammableCaptureDefaults,
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
    expect(screen.getByText('Loaded context')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Publishing' }));
    expect(screen.getByLabelText('Default LinkedIn connection')).toBeInTheDocument();
    expect(
      screen.getByText('Per-post editors now use the default publishing connection from this settings modal.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));
    expect(screen.getByText('Capture single add-on')).toBeInTheDocument();
    expect(screen.getByLabelText('Source URL')).toBeInTheDocument();
    expect(screen.getByText('Batch capture preview')).toBeInTheDocument();
    expect(screen.getByText('Programmable Playwright defaults')).toBeInTheDocument();
    expect(screen.getByText('Base URL:')).toBeInTheDocument();
    expect(screen.getByText('https://studiq.example.com/program')).toBeInTheDocument();
    expect(screen.getByText('Persona:')).toBeInTheDocument();
    expect(screen.getByText('Fast reviewer (persona-fast)')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === 'Routes: 2')
    ).toBeInTheDocument();
    expect(screen.getByText('Custom script saved')).toBeInTheDocument();
    expect(screen.getByText('Pricing page')).toBeInTheDocument();
    expect(screen.getByText('Dashboard hero')).toBeInTheDocument();
    expect(
      screen.getByText(
        hasTextContent(
          'Target: https://studiq.example.com/program/pricing?kangurCapture=social-batch'
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        hasTextContent(
          'Target: https://studiq.example.com/program/dashboard?kangurCapture=social-batch'
        )
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Runtime request preview')).toBeInTheDocument();
    expect(screen.getByText(/"browserEngine": "chromium"/)).toBeInTheDocument();
    expect(screen.getByText(/"timeoutMs": 180000/)).toBeInTheDocument();
    expect(screen.getByText(/"appearanceMode": "default"/)).toBeInTheDocument();
    expect(screen.getByText(/"personaId": "persona-fast"/)).toBeInTheDocument();
    expect(screen.getByText('Presets selected: 1 (Limit: 2)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Launch batch capture' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open programmable editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved defaults' }));

    expect(onHandleOpenProgrammablePlaywrightModal).not.toHaveBeenCalled();
    expect(onHandleOpenProgrammablePlaywrightModalFromDefaults).toHaveBeenCalledTimes(1);
    expect(onHandleResetProgrammableCaptureDefaults).toHaveBeenCalledTimes(1);
  });

  it('blocks draft generation when no social or AI Brain post model is configured', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
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

  it('renders publishing settings when no LinkedIn integration exists', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        linkedinConnectionId: null,
        linkedinConnections: [],
        linkedinIntegration: null,
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

    fireEvent.click(screen.getByRole('tab', { name: 'Publishing' }));

    expect(
      screen.getByText(
        'Create the LinkedIn integration in Admin > Integrations to enable publishing.'
      )
    ).toBeInTheDocument();
  });

  it('renders the loaded documentation context in the settings modal', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        contextSummary: 'Loaded context from overview and lessons-and-activities.',
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

    expect(
      screen.getByText('Loaded context from overview and lessons-and-activities.')
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
      sourceWarnings: [],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gpt-4.1-mini',
      },
      refresh: vi.fn(),
    },
    visionModelOptions: {
      effectiveModelId: 'gpt-4.1',
      models: ['gpt-4.1', 'gpt-4o'],
      isLoading: false,
      sourceWarnings: [],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gpt-4.1',
      },
      refresh: vi.fn(),
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
    linkedinIntegration: { id: 'integration-1', name: 'LinkedIn', slug: 'linkedin' },
    docReferenceInput: 'overview, lessons-and-activities',
    setDocReferenceInput: vi.fn(),
    generationNotes: 'Focus on current product changes.',
    setGenerationNotes: vi.fn(),
    contextSummary: null,
    contextLoading: false,
    handleLoadContext: vi.fn(),
    handleGenerate: vi.fn(),
    canGenerateSocialDraft: true,
    socialDraftBlockedReason: null,
    socialVisionWarning: null,
    resolveDocReferences: () => ['overview', 'lessons-and-activities'],
    addonForm: {
      title: '',
      sourceUrl: 'https://studiq.example.com',
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
    handleOpenProgrammablePlaywrightModal: vi.fn(),
    handleOpenProgrammablePlaywrightModalFromDefaults: vi.fn(),
    handleResetProgrammableCaptureDefaults: vi.fn(),
    captureAppearanceMode: 'default',
    batchCaptureMutation: { isPending: false },
    batchCaptureResult: null,
    effectiveBatchCapturePresetCount: 1,
    hasSavedProgrammableCaptureDefaults: true,
    persistedProgrammableCaptureBaseUrl: 'https://studiq.example.com/program',
    persistedProgrammableCapturePersonaId: 'persona-fast',
    persistedProgrammableCaptureScript: 'return input.captures.filter(Boolean);',
    persistedProgrammableCaptureRoutes: [
      {
        id: 'route-1',
        title: 'Pricing page',
        path: '/pricing',
        description: 'Capture pricing hero',
        selector: '[data-pricing]',
        waitForMs: 200,
        waitForSelectorMs: 3000,
      },
      {
        id: 'route-2',
        title: 'Dashboard hero',
        path: '/dashboard',
        description: 'Capture dashboard entry',
        selector: '[data-dashboard]',
        waitForMs: 0,
        waitForSelectorMs: 4000,
      },
    ],
    ...overrides,
  };
}
