/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock, usePlaywrightPersonasMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  FormModal: ({
    open,
    title,
    subtitle,
    actions,
    onSave,
    isSaveDisabled,
    saveTitle,
    saveText = 'Save',
    cancelText = 'Close',
    onClose,
    children,
  }: {
    open?: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    onSave: () => void;
    isSaveDisabled?: boolean;
    saveTitle?: string;
    saveText?: string;
    cancelText?: string;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog' aria-label={String(title)}>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <div>{actions}</div>
        <button
          type='button'
          disabled={Boolean(isSaveDisabled)}
          title={saveTitle}
          onClick={() => onSave()}
        >
          {saveText}
        </button>
        <button type='button' onClick={() => onClose()}>
          {cancelText}
        </button>
        {children}
      </div>
    ) : null,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  FormField: ({
    label,
    description,
    children,
  }: {
    label: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <span>{description}</span> : null}
      {children}
    </label>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
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
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  LoadingState: ({ message }: { message?: string }) => <div role='status'>{message}</div>,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
}));

import { SocialPostPlaywrightCaptureModal } from './SocialPost.PlaywrightCaptureModal';

describe('SocialPostPlaywrightCaptureModal Actions', () => {
  beforeEach(() => {
    useSocialPostContextMock.mockReset();
    usePlaywrightPersonasMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('delegates modal actions to the Social page context', () => {
    const handleCloseProgrammablePlaywrightModal = vi.fn();
    const setProgrammableCapturePersonaId = vi.fn();
    const handleAddProgrammableCaptureRoute = vi.fn();
    const handleSeedProgrammableCaptureRoutesFromPresets = vi.fn();
    const handleResetProgrammableCaptureScript = vi.fn();
    const handleSaveProgrammableCaptureDefaults = vi.fn();
    const handleRunProgrammablePlaywrightCapture = vi.fn();
    const handleRunProgrammablePlaywrightCaptureAndPipeline = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'persona-1', name: 'Fast reviewer' }],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal,
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId,
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute,
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets,
      handleResetProgrammableCaptureScript,
      handleSaveProgrammableCaptureDefaults,
      handleRunProgrammablePlaywrightCapture,
      handleRunProgrammablePlaywrightCaptureAndPipeline,
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    fireEvent.change(screen.getByLabelText('Playwright persona'), {
      target: { value: 'persona-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add route' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seed from presets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset script' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture programmable images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture + run pipeline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(setProgrammableCapturePersonaId).toHaveBeenCalledWith('persona-1');
    expect(handleAddProgrammableCaptureRoute).toHaveBeenCalledTimes(1);
    expect(handleSeedProgrammableCaptureRoutesFromPresets).toHaveBeenCalledTimes(1);
    expect(handleResetProgrammableCaptureScript).toHaveBeenCalledTimes(1);
    expect(handleSaveProgrammableCaptureDefaults).toHaveBeenCalledTimes(1);
    expect(handleRunProgrammablePlaywrightCapture).toHaveBeenCalledTimes(1);
    expect(handleRunProgrammablePlaywrightCaptureAndPipeline).toHaveBeenCalledTimes(1);
    expect(handleCloseProgrammablePlaywrightModal).toHaveBeenCalledTimes(1);
  });

  it('shows the live programmable capture progress message while the batch job is running', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: true,
      programmableCaptureBatchCaptureJob: {
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
        createdAt: '2026-03-29T10:00:00.000Z',
        updatedAt: '2026-03-29T10:00:01.000Z',
      },
      programmableCaptureMessage:
        'Playwright capture in progress: 1 captured, 2 left of 3 targets. 1 failed.',
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(
      screen.getByText('Playwright capture in progress: 1 captured, 2 left of 3 targets. 1 failed.')
    ).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
  });

  it('shows failed programmable route details after the capture job completes', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureBatchCaptureJob: {
        id: 'job-1',
        runId: 'run-1',
        status: 'completed',
        progress: {
          processedCount: 1,
          completedCount: 0,
          failureCount: 1,
          remainingCount: 0,
          totalCount: 1,
          message: 'Capture finished with 1 failure.',
        },
        result: {
          addons: [],
          failures: [{ id: 'route-1', reason: 'capture_failed' }],
          captureResults: [
            {
              id: 'route-1',
              title: 'Pricing page',
              status: 'failed',
              reason: 'capture_failed',
              resolvedUrl: 'https://example.com/pricing?kangurCapture=social-batch',
              artifactName: null,
              attemptCount: 2,
              durationMs: 3200,
              stage: 'waiting_for_selector',
            },
          ],
          usedPresetCount: 1,
          runId: 'run-1',
        },
        error: null,
        createdAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:00:01.000Z',
      },
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(
      screen.getByText(
        'Last failed target: Pricing page failed at Waiting For Selector after 2 attempts. Capture failed'
      )
    ).toBeInTheDocument();
  });

  it('renders recent programmable runs and retries failed routes from stored history', () => {
    const handleRetryFailedProgrammableCaptureJob = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureBatchCaptureJob: null,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      batchCaptureRecentJobs: [
        {
          id: 'job-history-1',
          runId: 'run-history-1',
          status: 'completed',
          request: {
            baseUrl: 'https://saved.example.com',
            presetIds: [],
            presetLimit: null,
            appearanceMode: 'default',
            playwrightPersonaId: null,
            playwrightScript: 'return input.captures;',
            playwrightRoutes: [
              {
                id: 'route-1',
                title: 'Pricing page',
                path: '/pricing',
                description: '',
                selector: '',
                waitForMs: 0,
                waitForSelectorMs: 10000,
              },
            ],
          },
          progress: {
            processedCount: 1,
            completedCount: 0,
            failureCount: 1,
            remainingCount: 0,
            totalCount: 1,
            currentCaptureId: null,
            currentCaptureTitle: null,
            currentCaptureStatus: null,
            lastCaptureId: 'route-1',
            lastCaptureStatus: 'failed',
            message: 'Capture finished with 1 failure.',
          },
          result: {
            addons: [],
            failures: [{ id: 'route-1', reason: 'capture_failed' }],
            runId: 'run-history-1',
          },
          error: null,
          createdAt: '2026-03-30T10:00:00.000Z',
          updatedAt: '2026-03-30T10:05:00.000Z',
        },
      ],
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      handleRetryFailedProgrammableCaptureJob,
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(screen.getByText('Recent programmable runs')).toBeInTheDocument();
    expect(screen.getByText('Run run-history-1')).toBeInTheDocument();
    expect(
      screen.getByText('Failed targets: Pricing page: Capture failed')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry failed routes' }));

    expect(handleRetryFailedProgrammableCaptureJob).toHaveBeenCalledTimes(1);
  });

  it('allows programmable capture but blocks capture-plus-pipeline when Project URL is invalid', () => {
    const handleRunProgrammablePlaywrightCapture = vi.fn();
    const handleRunProgrammablePlaywrightCaptureAndPipeline = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture,
      handleRunProgrammablePlaywrightCaptureAndPipeline,
      canGenerateSocialDraft: false,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason:
        'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toHaveAttribute(
      'title',
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Capture programmable images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture + run pipeline' }));

    expect(handleRunProgrammablePlaywrightCapture).toHaveBeenCalledTimes(1);
    expect(handleRunProgrammablePlaywrightCaptureAndPipeline).not.toHaveBeenCalled();
  });

  it('blocks programmable capture while Social image analysis is already running', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: {
        id: 'job-analysis-1',
        status: 'active',
        progress: { message: 'Analyzing the selected screenshots.' },
        failedReason: null,
      },
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('shows a dedicated generation progress label when post generation is the blocker', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'default',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleSaveProgrammableCaptureDefaults: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      canGenerateSocialDraft: true,
      currentVisualAnalysisJob: null,
      currentGenerationJob: {
        id: 'job-generate-1',
        status: 'active',
        progress: { message: 'Generating the post from the current draft.' },
        failedReason: null,
      },
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(screen.getByText('Generate post: Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });
});
