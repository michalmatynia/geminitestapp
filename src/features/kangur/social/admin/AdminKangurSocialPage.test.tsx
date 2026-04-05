/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useAdminKangurSocialPageMock } = vi.hoisted(() => ({
  useAdminKangurSocialPageMock: vi.fn(),
}));

const { usePlaywrightPersonasMock } = vi.hoisted(() => ({
  usePlaywrightPersonasMock: vi.fn(),
}));

const { useKangurSocialImageAddonsBatchJobsMock } = vi.hoisted(() => ({
  useKangurSocialImageAddonsBatchJobsMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/admin/components/KangurAdminContentShell', () => ({
  KangurAdminContentShell: ({
    title,
    description,
    headerActions,
    children,
  }: {
    title: string;
    description: React.ReactNode;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{description}</div>
      <div data-testid='kangur-social-header-actions'>{headerActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <span>{children}</span>,
  Breadcrumbs: ({
    items,
  }: {
    items: Array<{ label: string }>;
  }) => <nav aria-label='breadcrumb'>{items.map((item) => item.label).join('/')}</nav>,
  Button: ({
    children,
    asChild,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (asChild) {
      return <span>{children}</span>;
    }
    return <button {...rest}>{children}</button>;
  },
  Card: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <section>{children}</section>,
  LoadingState: ({
    message,
  }: {
    message?: string;
  }) => <div role='status'>{message ?? 'Loading...'}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
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
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
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
  }) => <button type='button' role='tab' aria-label={typeof children === 'string' ? children : value}>{children}</button>,
  TabsContent: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/shared/ui/templates/modals', () => ({
  ConfirmModal: ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    onConfirm,
    confirmDisabled,
  }: {
    isOpen?: boolean;
    title: string;
    message?: React.ReactNode;
    confirmText?: string;
    onConfirm?: () => void;
    confirmDisabled?: boolean;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={title}>
        <div>{message}</div>
        <button type='button' disabled={Boolean(confirmDisabled)} onClick={() => onConfirm?.()}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/admin-favorite-breadcrumb-row', () => ({
  AdminFavoriteBreadcrumbRow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./workspace/AdminKangurSocialPage.hooks', () => ({
  useAdminKangurSocialPage: () => useAdminKangurSocialPageMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialImageAddons', () => ({
  useKangurSocialImageAddonsBatchJobs: (...args: unknown[]) =>
    useKangurSocialImageAddonsBatchJobsMock(...args),
}));

vi.mock('./workspace/SocialPost.List', async () => {
  const actual = await vi.importActual<typeof import('./workspace/SocialPostContext')>(
    './workspace/SocialPostContext'
  );

  return {
    SocialPostList: () => {
      const {
        activePost,
        handleOpenPostEditor,
        handleRefreshMissingImageAddons,
        handleRemoveMissingAddons,
        missingImageAddonActionPending,
        missingImageAddonActionErrorMessage,
        setPostToDelete,
        setPostToUnpublish,
      } = actual.useSocialPostContext();

      return (
        <div data-testid='social-post-list'>
          <button type='button' onClick={() => handleOpenPostEditor('post-1')}>
            Open post row
          </button>
          <button type='button' onClick={() => handleOpenPostEditor('post-2')}>
            Open other post row
          </button>
          <button type='button' onClick={() => setPostToDelete(activePost)}>
            Delete active post
          </button>
          <button type='button' onClick={() => setPostToUnpublish(activePost)}>
            Unpublish active post
          </button>
          <button type='button' onClick={() => void handleRefreshMissingImageAddons()}>
            Refresh missing add-ons
          </button>
          <button type='button' onClick={() => void handleRemoveMissingAddons()}>
            Remove missing add-ons
          </button>
          <div data-testid='social-post-missing-addon-action-pending'>
            {missingImageAddonActionPending ?? 'idle'}
          </div>
          <div data-testid='social-post-missing-addon-action-error'>
            {missingImageAddonActionErrorMessage ?? ''}
          </div>
        </div>
      );
    },
  };
});

vi.mock('./workspace/SocialPost.Pipeline', () => ({
  SocialPostPipeline: () => <div data-testid='social-post-pipeline'>social-post-pipeline</div>,
}));

vi.mock('./workspace/SocialPost.EditorModal', async () => {
  const actual = await vi.importActual<typeof import('./workspace/SocialPostContext')>(
    './workspace/SocialPostContext'
  );

  return {
    SocialPostEditorModal: ({
      isOpen,
    }: {
      isOpen: boolean;
    }) => {
      const { activePost } = actual.useSocialPostContext();

      return (
        <div
          data-testid='social-post-editor-modal'
          data-open={String(isOpen)}
          data-title={activePost?.titlePl ?? ''}
        />
      );
    },
  };
});

vi.mock('./workspace/SocialPost.VisualAnalysisModal', () => ({
  SocialPostVisualAnalysisModal: () => (
    <div data-testid='social-post-visual-analysis-modal'>social-post-visual-analysis-modal</div>
  ),
}));

vi.mock('./workspace/SocialPost.PlaywrightCaptureModal', () => ({
  SocialPostPlaywrightCaptureModal: () => (
    <div data-testid='social-post-playwright-capture-modal'>
      social-post-playwright-capture-modal
    </div>
  ),
}));

vi.mock('./workspace/KangurSocialPipelineQueuePanel', () => ({
  KangurSocialPipelineQueuePanel: () => (
    <div data-testid='kangur-social-pipeline-queue'>kangur-social-pipeline-queue</div>
  ),
}));

vi.mock('./workspace/social-settings-modal/SocialSettingsContentBrowserTab', () => ({
  SocialSettingsContentBrowserTab: () => <div>Content browser</div>,
}));

import { AdminKangurSocialPage } from './AdminKangurSocialPage';

const buildPost = () => ({
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
});

const buildSecondPost = () => ({
  ...buildPost(),
  id: 'post-2',
  titlePl: 'Second pipeline target',
  titleEn: 'Second pipeline target',
});

const buildHookState = () => ({
  posts: [buildPost()],
  activePostId: 'post-1',
  setActivePostId: vi.fn(),
  activePost: buildPost(),
  editorState: {},
  setEditorState: vi.fn(),
  scheduledAt: '',
  setScheduledAt: vi.fn(),
  docReferenceInput: '',
  setDocReferenceInput: vi.fn(),
  generationNotes: '',
  setGenerationNotes: vi.fn(),
  imageAssets: [],
  imageAddonIds: [],
  missingSelectedImageAddonIds: [],
  addonForm: {
    title: '',
    sourceUrl: '',
    selector: '',
    description: '',
    waitForMs: '',
  },
  setAddonForm: vi.fn(),
  showMediaLibrary: false,
  setShowMediaLibrary: vi.fn(),
  linkedinConnectionId: 'linkedin-1',
  brainModelId: 'gpt-4.1-mini',
  visionModelId: 'gpt-4.1',
  canGenerateSocialDraft: true,
  canRunFreshCapturePipeline: false,
  socialDraftBlockedReason: null,
  socialBatchCaptureBlockedReason: null,
  socialVisionWarning: null,
  projectUrl: 'https://studiq.example.com/project',
  setProjectUrl: vi.fn(),
  isSettingsDirty: false,
  isSavingSettings: false,
  handleSaveSettings: vi.fn(),
  recentAddons: [],
  batchCaptureBaseUrl: 'https://studiq.example.com',
  setBatchCaptureBaseUrl: vi.fn(),
  batchCapturePresetIds: [],
  batchCapturePresetLimit: null,
  setBatchCapturePresetLimit: vi.fn(),
  effectiveBatchCapturePresetCount: 0,
  batchCaptureResult: null,
  batchCaptureJob: null,
  batchCaptureRecentJobs: [],
  batchCaptureRecentJobsLoading: false,
  hasSavedProgrammableCaptureDefaults: false,
  persistedProgrammableCaptureBaseUrl: null,
  persistedProgrammableCapturePersonaId: null,
  persistedProgrammableCaptureScript: '',
  persistedProgrammableCaptureRoutes: [],
  deleteError: null,
  clearDeleteError: vi.fn(),
  linkedinIntegration: null,
  linkedinConnections: [],
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
  addonsQuery: {
    isLoading: false,
  },
  postsQuery: {
    isLoading: false,
  },
  saveMutation: {
    isPending: false,
  },
  patchMutation: {
    isPending: false,
  },
  deleteMutation: {
    isPending: false,
  },
  publishMutation: {
    isPending: false,
  },
  unpublishMutation: {
    isPending: false,
  },
  createAddonMutation: {
    isPending: false,
  },
  batchCaptureMutation: {
    isPending: false,
  },
  handleCreateDraft: vi.fn(),
  handleDeletePost: vi.fn(),
  handleQuickPublishPost: vi.fn(),
  handleUnpublishPost: vi.fn(),
  handleSave: vi.fn(),
  handleGenerate: vi.fn(),
  handleSelectAddon: vi.fn(),
  handleRemoveAddon: vi.fn(),
  handleRefreshMissingImageAddons: vi.fn(),
  handleRemoveMissingAddons: vi.fn(),
  missingImageAddonActionPending: null,
  missingImageAddonActionErrorMessage: null,
  handleCreateAddon: vi.fn(),
  handleBatchCapture: vi.fn(),
  handleOpenProgrammablePlaywrightModal: vi.fn(),
  handleOpenProgrammablePlaywrightModalFromDefaults: vi.fn(),
  handleResetProgrammableCaptureDefaults: vi.fn(),
  handlePublish: vi.fn(),
  handleRemoveImage: vi.fn(),
  handleAddImages: vi.fn(),
  handleToggleCapturePreset: vi.fn(),
  selectAllCapturePresets: vi.fn(),
  clearCapturePresets: vi.fn(),
  handleBrainModelChange: vi.fn(),
  handleVisionModelChange: vi.fn(),
  handleLinkedInConnectionChange: vi.fn(),
  resolveDocReferences: vi.fn(() => []),
  pipelineStep: 'idle',
  pipelineProgress: null,
  pipelineErrorMessage: null,
  handleRunFullPipeline: vi.fn(),
  handleRunFullPipelineWithFreshCapture: vi.fn(),
  captureOnlyPending: false,
  captureOnlyBatchCaptureJob: null,
  captureOnlyMessage: null,
  captureOnlyErrorMessage: null,
  programmableCapturePending: false,
  programmableCaptureBatchCaptureJob: null,
  programmableCaptureMessage: null,
  programmableCaptureErrorMessage: null,
  handleCaptureImagesOnly: vi.fn(),
  isVisualAnalysisModalOpen: false,
  isProgrammablePlaywrightModalOpen: false,
  publishingPostId: null,
  unpublishingPostId: null,
  contextSummary: null,
  contextLoading: false,
  handleLoadContext: vi.fn(),
  currentVisualAnalysisJob: null,
  currentGenerationJob: null,
  currentPipelineJob: null,
});

describe('AdminKangurSocialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useKangurSocialImageAddonsBatchJobsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useAdminKangurSocialPageMock.mockReturnValue(buildHookState());
  });

  it('keeps the posts workspace visible until the settings modal is opened', () => {
    render(<AdminKangurSocialPage />);

    expect(screen.queryByRole('tablist', { name: 'StudiQ Social sections' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Posts' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    expect(screen.getByTestId('social-post-list')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-social-pipeline-queue')).toBeInTheDocument();
    expect(screen.queryByTestId('social-post-editor-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-post-visual-analysis-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-post-playwright-capture-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New draft' })).toBeInTheDocument();

    expect(screen.queryByRole('dialog', { name: 'Social Settings' })).not.toBeInTheDocument();
  });

  it('keeps batch capture history disabled until settings are opened', () => {
    render(<AdminKangurSocialPage />);

    expect(useKangurSocialImageAddonsBatchJobsMock).toHaveBeenLastCalledWith({
      limit: 5,
      enabled: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(useKangurSocialImageAddonsBatchJobsMock).toHaveBeenLastCalledWith({
      limit: 5,
      enabled: true,
    });
  });

  it('loads batch capture history when programmable capture is already open', () => {
    const hookState = buildHookState();
    hookState.isProgrammablePlaywrightModalOpen = true;
    useAdminKangurSocialPageMock.mockReturnValue(hookState);

    render(<AdminKangurSocialPage />);

    expect(useKangurSocialImageAddonsBatchJobsMock).toHaveBeenLastCalledWith({
      limit: 5,
      enabled: true,
    });
  });

  it('keeps the list visible while the active social workspace detail is still loading', () => {
    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      posts: [],
      activePostId: null,
      activePost: null,
      postsQuery: {
        isLoading: true,
      },
    });

    render(<AdminKangurSocialPage />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Select a social post to open its pipeline workspace.'
    );
    expect(screen.getByTestId('social-post-list')).toBeInTheDocument();
    expect(screen.queryByTestId('social-post-pipeline')).not.toBeInTheDocument();
  });

  it('opens the settings modal with models, project, documentation, publishing, and capture tabs', () => {
    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    expect(screen.getByRole('dialog', { name: 'Social Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Social settings tabs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Models' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Project' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Publishing' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Capture' })).toBeInTheDocument();
    expect(screen.getByText('Brain model')).toBeInTheDocument();
    expect(screen.getByText('Vision model')).toBeInTheDocument();
    expect(screen.getByLabelText('Selected brain model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('Selected vision model')).toHaveValue('gpt-4.1');
    expect(screen.getByLabelText('Project URL')).toHaveValue('https://studiq.example.com/project');
    expect(screen.getByLabelText('Documentation references')).toHaveValue('');
    expect(screen.getByLabelText('Notes for the Brain generator')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Load context' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate PL/EN draft' })).toBeInTheDocument();
    expect(screen.getByLabelText('Default LinkedIn connection')).toBeInTheDocument();
    expect(screen.getByText('Capture single add-on')).toBeInTheDocument();
    expect(screen.getByText('Batch capture preview')).toBeInTheDocument();

    expect(screen.getByTestId('social-post-list')).toBeInTheDocument();
    expect(screen.queryByTestId('social-post-editor-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New draft' })).toBeInTheDocument();
  });

  it('forwards persisted missing-addons actions through the real social post provider', () => {
    const handleRefreshMissingImageAddons = vi.fn().mockResolvedValue(undefined);
    const handleRemoveMissingAddons = vi.fn().mockResolvedValue(undefined);

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      missingSelectedImageAddonIds: ['addon-missing'],
      handleRefreshMissingImageAddons,
      handleRemoveMissingAddons,
      missingImageAddonActionPending: 'remove',
      missingImageAddonActionErrorMessage: 'Failed to remove the missing image add-ons.',
    });

    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh missing add-ons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove missing add-ons' }));

    expect(handleRefreshMissingImageAddons).toHaveBeenCalledTimes(1);
    expect(handleRemoveMissingAddons).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('social-post-missing-addon-action-pending')).toHaveTextContent(
      'remove'
    );
    expect(screen.getByTestId('social-post-missing-addon-action-error')).toHaveTextContent(
      'Failed to remove the missing image add-ons.'
    );
  });

  it('opens the social post editor modal when a post row is clicked', () => {
    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open post row' }));

    expect(screen.getByTestId('social-post-editor-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('social-post-editor-modal')).toHaveAttribute(
      'data-title',
      'StudiQ Weekly Update'
    );
  });

  it('blocks opening another post editor while Social runtime jobs are still in flight', () => {
    const setActivePostId = vi.fn();

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      posts: [buildPost(), buildSecondPost()],
      setActivePostId,
      currentVisualAnalysisJob: {
        id: 'job-analysis-7',
        status: 'active',
        progress: { message: 'Analyzing visuals for the active draft.' },
        failedReason: null,
      },
    });

    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open other post row' }));

    expect(setActivePostId).not.toHaveBeenCalled();
    expect(screen.queryByTestId('social-post-editor-modal')).not.toBeInTheDocument();
  });

  it('does not render the old header-level runtime job strip for the active Social draft', () => {
    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      currentVisualAnalysisJob: {
        id: 'job-analysis-3',
        status: 'active',
        progress: { message: 'Analyzing the selected visuals.' },
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-3',
        status: 'waiting',
        progress: { message: 'Waiting for generation worker capacity.' },
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-3',
        status: 'completed',
        progress: { message: 'Pipeline run finished.' },
        failedReason: null,
      },
    });

    render(<AdminKangurSocialPage />);

    expect(screen.queryByText('Runtime jobs:')).not.toBeInTheDocument();
    expect(screen.queryByText('Image analysis: Running')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate post: Queued')).not.toBeInTheDocument();
    expect(screen.queryByText('Full pipeline: Completed')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-social-pipeline-queue')).toBeInTheDocument();
  });

  it('shows a page-level Playwright capture counter while a standalone capture job is running', () => {
    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      captureOnlyPending: true,
      captureOnlyBatchCaptureJob: {
        id: 'capture-job-1',
        runId: 'capture-run-1',
        status: 'running',
        progress: {
          processedCount: 2,
          completedCount: 1,
          failureCount: 1,
          remainingCount: 2,
          totalCount: 3,
          message: 'Playwright capture in progress: 1 captured, 2 left of 3 targets. 1 failed.',
        },
        result: null,
        error: null,
        createdAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:00:01.000Z',
      },
    });

    render(<AdminKangurSocialPage />);

    expect(screen.getByTestId('kangur-social-header-actions')).toHaveTextContent(
      'Playwright capture: 1 captured, 2 left of 3. 1 failed.'
    );
  });

  it('blocks creating a new draft while Social runtime jobs are still in flight', () => {
    const handleCreateDraft = vi.fn();

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      handleCreateDraft,
      currentVisualAnalysisJob: {
        id: 'job-analysis-3',
        status: 'active',
        progress: { message: 'Analyzing the selected visuals.' },
        failedReason: null,
      },
    });

    render(<AdminKangurSocialPage />);

    expect(screen.getByRole('button', { name: 'New draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New draft' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'New draft' }));

    expect(handleCreateDraft).not.toHaveBeenCalled();
  });

  it('blocks deleting the active post while Social runtime jobs are still in flight', () => {
    const handleDeletePost = vi.fn();

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      handleDeletePost,
      currentGenerationJob: {
        id: 'job-generate-5',
        status: 'active',
        progress: { message: 'Generating the current draft.' },
        failedReason: null,
      },
    });

    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete active post' }));

    expect(screen.getByRole('dialog', { name: 'Delete draft' })).toBeInTheDocument();
    expect(
      screen.getByText('Wait for the current Social runtime job to finish before confirming this action.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(handleDeletePost).not.toHaveBeenCalled();
  });

  it('confirms deleting the active post through the page dialog', () => {
    const handleDeletePost = vi.fn().mockResolvedValue(undefined);

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      handleDeletePost,
    });

    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete active post' }));
    expect(screen.getByRole('dialog', { name: 'Delete draft' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(handleDeletePost).toHaveBeenCalledWith('post-1');
  });

  it('blocks unpublishing the active post while Social runtime jobs are still in flight', () => {
    const handleUnpublishPost = vi.fn();

    useAdminKangurSocialPageMock.mockReturnValue({
      ...buildHookState(),
      handleUnpublishPost,
      currentPipelineJob: {
        id: 'job-pipeline-5',
        status: 'active',
        progress: { message: 'Pipeline is still updating the current draft.' },
        failedReason: null,
      },
    });

    render(<AdminKangurSocialPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish active post' }));

    expect(screen.getByRole('dialog', { name: 'Unpublish from LinkedIn' })).toBeInTheDocument();
    expect(
      screen.getByText('Wait for the current Social runtime job to finish before confirming this action.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));

    expect(handleUnpublishPost).not.toHaveBeenCalled();
  });
});
