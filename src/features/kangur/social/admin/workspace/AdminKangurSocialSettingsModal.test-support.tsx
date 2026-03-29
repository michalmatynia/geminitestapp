import type React from 'react';
import { vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));
const { usePlaywrightPersonasMock } = vi.hoisted(() => ({
  usePlaywrightPersonasMock: vi.fn(),
}));

export { usePlaywrightPersonasMock, useSocialPostContextMock };

export const hasTextContent =
  (text: string) => (_content: string, node: Element | null) =>
    node?.textContent === text;

const readSocialPostContextMock = (): Record<string, unknown> =>
  useSocialPostContextMock() as Record<string, unknown>;

const readPlaywrightPersonasMock = (...args: unknown[]): Record<string, unknown> =>
  usePlaywrightPersonasMock(...args) as Record<string, unknown>;

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
      onSave?: () => void;
      isSaveDisabled?: boolean;
      saveTitle?: string;
      saveText?: string;
      children: React.ReactNode;
    }) => {
      const { open, title, onSave, isSaveDisabled, saveTitle, saveText = 'Save', children } =
        props;
      return open ? (
        <div role='dialog' aria-label={title}>
          <h2>{title}</h2>
          <button
            type='button'
            disabled={Boolean(isSaveDisabled)}
            title={saveTitle}
            onClick={() => onSave?.()}
          >
            {saveText}
          </button>
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
  useSocialPostContext: readSocialPostContextMock,
}));

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: readPlaywrightPersonasMock,
}));

export function buildActivePost() {
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

export function buildSocialPostContextState(
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
    currentGenerationJob: null,
    currentVisualAnalysisJob: null,
    currentPipelineJob: null,
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
    batchCapturePending: false,
    batchCaptureJob: null,
    batchCaptureMessage: null,
    batchCaptureErrorMessage: null,
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
