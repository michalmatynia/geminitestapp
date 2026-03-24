/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useAdminKangurSocialPageMock } = vi.hoisted(() => ({
  useAdminKangurSocialPageMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
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
}));

vi.mock('@/features/kangur/shared/ui/templates/modals', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/shared/ui/admin-favorite-breadcrumb-row', () => ({
  AdminFavoriteBreadcrumbRow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./admin-kangur-social/AdminKangurSocialPage.hooks', () => ({
  useAdminKangurSocialPage: () => useAdminKangurSocialPageMock(),
}));

vi.mock('./admin-kangur-social/SocialPost.List', async () => {
  const actual = await vi.importActual<typeof import('./admin-kangur-social/SocialPostContext')>(
    './admin-kangur-social/SocialPostContext'
  );

  return {
    SocialPostList: () => {
      const { handleOpenPostEditor } = actual.useSocialPostContext();

      return (
        <div data-testid='social-post-list'>
          <button type='button' onClick={() => handleOpenPostEditor('post-1')}>
            Open post row
          </button>
        </div>
      );
    },
  };
});

vi.mock('./admin-kangur-social/SocialPost.Pipeline', () => ({
  SocialPostPipeline: () => <div data-testid='social-post-pipeline'>social-post-pipeline</div>,
}));

vi.mock('./admin-kangur-social/SocialPost.EditorModal', async () => {
  const actual = await vi.importActual<typeof import('./admin-kangur-social/SocialPostContext')>(
    './admin-kangur-social/SocialPostContext'
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

vi.mock('./admin-kangur-social/KangurSocialPipelineQueuePanel', () => ({
  KangurSocialPipelineQueuePanel: () => (
    <div data-testid='kangur-social-pipeline-queue'>kangur-social-pipeline-queue</div>
  ),
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
  visualDocUpdates: [],
  docUpdatesAppliedAt: null,
  docUpdatesAppliedBy: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
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
  docUpdatesResult: null,
  recentAddons: [],
  batchCaptureBaseUrl: 'https://studiq.example.com',
  setBatchCaptureBaseUrl: vi.fn(),
  batchCapturePresetIds: [],
  batchCapturePresetLimit: null,
  setBatchCapturePresetLimit: vi.fn(),
  effectiveBatchCapturePresetCount: 0,
  batchCaptureResult: null,
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
  previewDocUpdatesMutation: {
    isPending: false,
  },
  applyDocUpdatesMutation: {
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
  handlePreviewDocUpdates: vi.fn(),
  handleApplyDocUpdates: vi.fn(),
  handleSelectAddon: vi.fn(),
  handleRemoveAddon: vi.fn(),
  handleCreateAddon: vi.fn(),
  handleBatchCapture: vi.fn(),
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
  captureOnlyMessage: null,
  captureOnlyErrorMessage: null,
  handleCaptureImagesOnly: vi.fn(),
  publishingPostId: null,
  unpublishingPostId: null,
  contextSummary: null,
  contextLoading: false,
  handleLoadContext: vi.fn(),
});

describe('AdminKangurSocialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByTestId('social-post-editor-modal')).toHaveAttribute('data-open', 'false');
    expect(screen.getByRole('button', { name: 'New draft' })).toBeInTheDocument();

    expect(screen.queryByRole('dialog', { name: 'Social Settings' })).not.toBeInTheDocument();
  });

  it('renders the shared page loader while the social workspace is loading', () => {
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

    expect(screen.getByRole('status')).toHaveTextContent('Loading StudiQ Social...');
    expect(screen.queryByTestId('social-post-list')).not.toBeInTheDocument();
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
    expect(screen.getByText('Documentation updates')).toBeInTheDocument();
    expect(screen.getByLabelText('Default LinkedIn connection')).toBeInTheDocument();
    expect(screen.getByText('Capture single add-on')).toBeInTheDocument();
    expect(screen.getByText('Batch capture presets')).toBeInTheDocument();

    expect(screen.getByTestId('social-post-list')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-editor-modal')).toHaveAttribute('data-open', 'false');
    expect(screen.getByRole('button', { name: 'New draft' })).toBeInTheDocument();
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
});
