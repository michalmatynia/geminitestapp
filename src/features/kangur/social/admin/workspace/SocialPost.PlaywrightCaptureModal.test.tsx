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

const hasTextContent = (text: string) => (_content: string, node: Element | null) =>
  node?.textContent === text;

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

describe('SocialPostPlaywrightCaptureModal', () => {
  beforeEach(() => {
    useSocialPostContextMock.mockReset();
    usePlaywrightPersonasMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders personas, programmable routes, and the editable script', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'persona-1', name: 'Fast reviewer' }],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: { id: 'post-1' },
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      captureAppearanceMode: 'dark',
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: 'persona-1',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: 'Capture pricing hero',
          selector: '[data-pricing]',
          waitForMs: 200,
          waitForSelectorMs: 3000,
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
        id: 'job-analysis-4',
        status: 'active',
        progress: { message: 'Analyzing the current draft screenshots.' },
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-2',
        status: 'waiting',
        progress: { message: 'Waiting for the post generation worker.' },
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-9',
        status: 'active',
        progress: { message: 'Generating the post after programmable capture.' },
        failedReason: null,
      },
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(
      screen.getByRole('dialog', { name: 'Programmable Playwright capture' })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pricing page')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/pricing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('return input.captures;')).toBeInTheDocument();
    expect(screen.getByText('Resolved target')).toBeInTheDocument();
    expect(
      screen.getByText('https://example.com/pricing?kangurCapture=social-batch')
    ).toBeInTheDocument();
    expect(screen.getByText('Runtime request preview')).toBeInTheDocument();
    expect(screen.getByText(hasTextContent('Appearance mode: dark'))).toBeInTheDocument();
    expect(screen.getByText(hasTextContent('Persona: Fast reviewer'))).toBeInTheDocument();
    expect(screen.getByText(/"browserEngine": "chromium"/)).toBeInTheDocument();
    expect(screen.getByText(/"timeoutMs": 240000/)).toBeInTheDocument();
    expect(screen.getByText(/"appearanceMode": "dark"/)).toBeInTheDocument();
    expect(screen.getByText(/"personaId": "persona-1"/)).toBeInTheDocument();
    expect(screen.getByText(/"input": \{/)).toBeInTheDocument();
    expect(screen.getByText(/"title": "Pricing page"/)).toBeInTheDocument();
    expect(
      screen.getByText(/"url": "https:\/\/example.com\/pricing\?kangurCapture=social-batch"/)
    ).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByText('Generate post: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Full pipeline in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Full pipeline in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Add route' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add route' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Seed from presets' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset script' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as defaults' })).toBeDisabled();
    expect(screen.getByLabelText('Programmable capture base URL')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Playwright persona')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
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
      screen.getByText('Failed targets: Pricing page: Capture failed')
    ).toBeInTheDocument();
  });

  it('allows saving defaults without an active draft while keeping capture actions disabled', () => {
    const handleSaveProgrammableCaptureDefaults = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: null,
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
      handleSaveProgrammableCaptureDefaults,
      handleRunProgrammablePlaywrightCapture: vi.fn(),
      handleRunProgrammablePlaywrightCaptureAndPipeline: vi.fn(),
      canGenerateSocialDraft: false,
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason:
        'Choose a StudiQ Social post model before running capture and pipeline.',
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(
      screen.getByText(
        'No active draft is selected. You can still edit the programmable Playwright config and save it as defaults, but capture actions stay disabled until a draft is active.'
    )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toHaveAttribute(
      'title',
      'Select an active draft before running programmable capture.'
    );
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toHaveAttribute(
      'title',
      'Select an active draft before running programmable capture and pipeline.'
    );
    expect(screen.getByText(hasTextContent('Appearance mode: default'))).toBeInTheDocument();
    expect(screen.getByText(hasTextContent('Persona: Default runtime persona'))).toBeInTheDocument();
    expect(screen.getByText(/"personaId": null/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save as defaults' }));

    expect(handleSaveProgrammableCaptureDefaults).toHaveBeenCalledTimes(1);
  });

  it('shows route preview guidance when a relative route has no base URL yet', () => {
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
      programmableCaptureBaseUrl: '',
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
      currentGenerationJob: null,
      currentPipelineJob: null,
      socialDraftBlockedReason: null,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(screen.getByText('Resolved target')).toBeInTheDocument();
    expect(
      screen.getByText('Add a base URL to resolve this route.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toHaveAttribute(
      'title',
      'Add a base URL, at least one route, and a script before starting programmable capture.'
    );
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture + run pipeline' })).toHaveAttribute(
      'title',
      'Add a base URL, at least one route, and a script before starting capture and pipeline.'
    );
    expect(screen.getByText('Runtime request preview')).toBeInTheDocument();
    expect(screen.getByText(/"issue": "Add a base URL to resolve this route\."/)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Add route' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add route' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Seed from presets' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset script' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as defaults' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(screen.getByLabelText('Programmable capture base URL')).toBeDisabled();
    expect(screen.getByLabelText('Programmable capture base URL')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Programmable Playwright capture script')).toBeDisabled();
    expect(screen.getByLabelText('Programmable Playwright capture script')).toHaveAttribute(
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
