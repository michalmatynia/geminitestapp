/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  buildSocialPostContextState,
  hasTextContent,
  usePlaywrightPersonasMock,
  useSocialPostContextMock,
} from './AdminKangurSocialSettingsModal.test-support';
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
    expect(screen.getByText(/"timeoutMs": 240000/)).toBeInTheDocument();
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

  it('shows the live draft-generation job pill in the documentation tab', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentGenerationJob: {
          id: 'job-generate-1',
          status: 'active',
          progress: {
            message: 'Generating bilingual draft from the selected references.',
          },
          failedReason: null,
        },
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

    expect(screen.getByText('Generate draft: Running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load context' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load context' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Generate draft in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate draft in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('shows live batch capture counts in the capture tab while Playwright capture is running', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        batchCapturePending: true,
        batchCaptureJob: {
          id: 'batch-job-1',
          runId: 'run-1',
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
        batchCaptureMessage:
          'Playwright capture in progress: 1 captured, 2 left of 3 targets. 1 failed.',
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

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));

    expect(
      screen.getByText('Playwright capture in progress: 1 captured, 2 left of 3 targets. 1 failed.')
    ).toBeInTheDocument();
    expect(screen.getByText('Captured')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capturing...' })).toHaveAttribute(
      'title',
      'Wait for the current Playwright capture job to finish.'
    );
  });

  it('renders the new minigame capture presets in the capture tab', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        batchCapturePresetIds: ['clock-quiz', 'calendar-quiz', 'geometry-quiz'],
        effectiveBatchCapturePresetCount: 3,
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

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));

    expect(screen.getByRole('button', { name: 'Clock Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calendar Training' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Geometry Drawing' })).toBeInTheDocument();
    expect(screen.getByText('Presets selected: 3 (Limit: 2)')).toBeInTheDocument();
  });

  it('locks models, project, and publishing settings while Social runtime jobs are in flight', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentPipelineJob: {
          id: 'job-pipeline-8',
          status: 'active',
          progress: {
            message: 'Pipeline is still updating the current Social draft.',
          },
          failedReason: null,
        },
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

    expect(screen.getByLabelText('Selected brain model')).toBeDisabled();
    expect(screen.getByLabelText('Selected brain model')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Selected vision model')).toBeDisabled();
    expect(screen.getByLabelText('Selected vision model')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Project' }));

    expect(screen.getByLabelText('Project URL')).toBeDisabled();
    expect(screen.getByLabelText('Project URL')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Publishing' }));

    expect(screen.getByLabelText('Default LinkedIn connection')).toBeDisabled();
    expect(screen.getByLabelText('Default LinkedIn connection')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('explains disabled model and publishing selects for loading and missing LinkedIn setup states', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        brainModelOptions: {
          effectiveModelId: 'gpt-4.1-mini',
          models: ['gpt-4.1-mini', 'gpt-4.1'],
          isLoading: true,
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
          isLoading: true,
          sourceWarnings: [],
          assignment: {
            enabled: true,
            provider: 'model',
            modelId: 'gpt-4.1',
          },
          refresh: vi.fn(),
        },
        linkedinIntegration: null,
        linkedinConnectionId: null,
        linkedinConnections: [],
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

    expect(screen.getByLabelText('Selected brain model')).toBeDisabled();
    expect(screen.getByLabelText('Selected brain model')).toHaveAttribute(
      'title',
      'Loading AI Brain model options...'
    );
    expect(screen.getByLabelText('Selected vision model')).toBeDisabled();
    expect(screen.getByLabelText('Selected vision model')).toHaveAttribute(
      'title',
      'Loading AI Brain vision model options...'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Publishing' }));

    expect(screen.getByLabelText('Default LinkedIn connection')).toBeDisabled();
    expect(screen.getByLabelText('Default LinkedIn connection')).toHaveAttribute(
      'title',
      'Create LinkedIn integration first'
    );
  });

  it('explains when LinkedIn publishing is disabled because no connections are available yet', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        linkedinConnectionId: null,
        linkedinConnections: [],
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

    expect(screen.getByLabelText('Default LinkedIn connection')).toBeDisabled();
    expect(screen.getByLabelText('Default LinkedIn connection')).toHaveAttribute(
      'title',
      'Add a LinkedIn connection in Admin > Integrations to use it here.'
    );
  });

  it('disables Save Settings while Social runtime jobs are in flight', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentGenerationJob: {
          id: 'job-generate-11',
          status: 'active',
          progress: {
            message: 'Generating the current Social draft.',
          },
          failedReason: null,
        },
      })
    );

    render(
      <AdminKangurSocialSettingsModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        hasUnsavedChanges={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Settings' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('blocks the documentation editor while a full pipeline job is still in flight', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentGenerationJob: null,
        currentPipelineJob: {
          id: 'job-pipeline-7',
          status: 'active',
          progress: {
            message: 'Pipeline is updating the draft from the current documentation context.',
          },
          failedReason: null,
        },
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

    expect(screen.getByLabelText('Documentation references')).toBeDisabled();
    expect(screen.getByLabelText('Documentation references')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Notes for the Brain generator')).toBeDisabled();
    expect(screen.getByLabelText('Notes for the Brain generator')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Load context' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load context' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Generate PL/EN draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate PL/EN draft' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('shows live runtime job pills in the capture tab', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentVisualAnalysisJob: {
          id: 'job-analysis-4',
          status: 'active',
          progress: {
            message: 'Analyzing the latest selected visuals.',
          },
          failedReason: null,
        },
        currentGenerationJob: {
          id: 'job-generate-4',
          status: 'waiting',
          progress: {
            message: 'Waiting for generation worker capacity.',
          },
          failedReason: null,
        },
        currentPipelineJob: {
          id: 'job-pipeline-4',
          status: 'completed',
          progress: {
            message: 'Pipeline finished and saved the updated draft.',
          },
          failedReason: null,
        },
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

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));

    expect(screen.getByText('Runtime jobs')).toBeInTheDocument();
    expect(screen.getAllByText('Image analysis: Running')).toHaveLength(2);
    expect(screen.getAllByText('Generate post: Queued')).toHaveLength(2);
    expect(screen.getAllByText('Full pipeline: Completed')).toHaveLength(2);
  });

  it('blocks capture launch actions while Social runtime jobs are still in flight', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        currentVisualAnalysisJob: {
          id: 'job-analysis-4',
          status: 'active',
          progress: {
            message: 'Analyzing the latest selected visuals.',
          },
          failedReason: null,
        },
        currentGenerationJob: {
          id: 'job-generate-4',
          status: 'waiting',
          progress: {
            message: 'Waiting for generation worker capacity.',
          },
          failedReason: null,
        },
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

    fireEvent.click(screen.getByRole('tab', { name: 'Capture' }));

    expect(screen.getByRole('button', { name: 'Create single add-on' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create single add-on' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Add-on title')).toBeDisabled();
    expect(screen.getByLabelText('Add-on title')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Source URL')).toBeDisabled();
    expect(screen.getByLabelText('Source URL')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Optional selector')).toBeDisabled();
    expect(screen.getByLabelText('Optional selector')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Wait before capture (ms)')).toBeDisabled();
    expect(screen.getByLabelText('Wait before capture (ms)')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByLabelText('Optional description')).toBeDisabled();
    expect(screen.getByLabelText('Optional description')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getAllByDisplayValue('https://studiq.example.com')).toHaveLength(2);
    screen
      .getAllByDisplayValue('https://studiq.example.com')
      .forEach((element) => {
        expect(element).toBeDisabled();
        expect(element).toHaveAttribute('title', 'Wait for the current Social runtime job to finish.');
      });
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Select all' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kangur Game Home' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kangur Game Home' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Reset saved defaults' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset saved defaults' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Launch batch capture' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Launch batch capture' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });
});
