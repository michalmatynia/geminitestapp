import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ControlPromptModal } from '../ControlPromptModalImpl';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  closePromptControl: vi.fn(),
  onRunGeneration: vi.fn(),
  onRunSequenceGeneration: vi.fn(),
  routerPush: vi.fn(),
  savePromptExploderDraftPrompt: vi.fn(),
  setExtractDraftPrompt: vi.fn(),
  setExtractReviewOpen: vi.fn(),
  setFormatterEnabled: vi.fn(),
  setPromptText: vi.fn(),
  setValidatorEnabled: vi.fn(),
  toast: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
  runtime: {
    formatterEnabled: false,
    modelSupportsSequenceGeneration: true,
    projectId: 'project-alpha',
    promptControlOpen: true,
    promptText: 'Prompt body',
    sequenceRunBusy: false,
    validatorEnabled: false,
  },
}));

vi.mock('@/shared/ui', async () => {
  const shared = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: shared.MockButton,
    UI_CENTER_ROW_RELAXED_CLASSNAME: shared.UI_CENTER_ROW_RELAXED_CLASSNAME,
    ValidatorFormatterToggle: ({
      formatterEnabled,
      onFormatterChange,
      onValidatorChange,
      validatorEnabled,
    }: {
      formatterEnabled: boolean;
      onFormatterChange: (value: boolean) => void;
      onValidatorChange: (value: boolean) => void;
      validatorEnabled: boolean;
    }): React.JSX.Element => (
      <div>
        <button type='button' onClick={() => onValidatorChange(!validatorEnabled)}>
          Toggle Validate
        </button>
        <button type='button' onClick={() => onFormatterChange(!formatterEnabled)}>
          Toggle Format
        </button>
      </div>
    ),
    useToast: () => ({
      toast: mocks.toast,
    }),
  };
});

vi.mock('@/shared/ui/templates/modals/DetailModal', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock('../../UIPresetsPanel', () => ({
  UIPresetsPanel: (): React.JSX.Element => <div>UI Presets Panel</div>,
}));

vi.mock('../../modals/StudioActionButtonRow', async () => {
  const mocks = await import('../../modals/__tests__/studioPromptRuntimeMockComponents');
  return {
    StudioActionButtonRow: mocks.MockStudioActionButtonRow,
  };
});

vi.mock('../../modals/StudioPromptTextSection', async () => {
  const mocks = await import('../../modals/__tests__/studioPromptRuntimeMockComponents');
  return {
    StudioPromptTextSection: (props: {
      label: string;
      onValueChange: (value: string) => void;
      value: string;
    }): React.JSX.Element => (
      <mocks.MockStudioPromptTextSection id='control-prompt-text' {...props} />
    ),
  };
});

vi.mock('@/features/ai/image-studio/context/PromptContext', () => ({
  usePromptState: () => ({
    promptText: mocks.runtime.promptText,
    paramsState: { style: 'storybook' },
    paramSpecs: null,
    paramUiOverrides: {},
  }),
  usePromptActions: () => ({
    setPromptText: mocks.setPromptText,
    setExtractReviewOpen: mocks.setExtractReviewOpen,
    setExtractDraftPrompt: mocks.setExtractDraftPrompt,
  }),
}));

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiState: () => ({
    validatorEnabled: mocks.runtime.validatorEnabled,
    formatterEnabled: mocks.runtime.formatterEnabled,
  }),
  useUiActions: () => ({
    setValidatorEnabled: mocks.setValidatorEnabled,
    setFormatterEnabled: mocks.setFormatterEnabled,
  }),
}));

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: mocks.runtime.projectId,
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: () => ({
    selectedFolder: 'Folder A',
    selectedSlotId: 'slot-123',
    workingSlotId: 'slot-123',
    compositeAssetIds: ['composite-1'],
    previewMode: 'single',
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSettingMutateAsync,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

vi.mock('@/shared/lib/prompt-engine/settings', () => ({
  PROMPT_ENGINE_SETTINGS_KEY: 'prompt-engine-settings',
  parsePromptEngineSettings: () => ({
    promptValidation: {},
  }),
}));

vi.mock('@/shared/lib/prompt-engine', () => ({
  validateProgrammaticPrompt: vi.fn(() => []),
  formatProgrammaticPrompt: vi.fn(() => ({
    changed: false,
    prompt: 'Prompt body',
    issuesAfter: 0,
  })),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/shared/lib/prompt-exploder/bridge', () => ({
  savePromptExploderDraftPrompt: mocks.savePromptExploderDraftPrompt,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}));

describe('ControlPromptModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.formatterEnabled = false;
    mocks.runtime.modelSupportsSequenceGeneration = true;
    mocks.runtime.projectId = 'project-alpha';
    mocks.runtime.promptControlOpen = true;
    mocks.runtime.promptText = 'Prompt body';
    mocks.runtime.sequenceRunBusy = false;
    mocks.runtime.validatorEnabled = false;
  });

  it('renders from RightSidebarContext and forwards prompt actions', () => {
    renderWithRightSidebarContext(<ControlPromptModal />, {
      closePromptControl: mocks.closePromptControl,
      generationBusy: false,
      modelSupportsSequenceGeneration: mocks.runtime.modelSupportsSequenceGeneration,
      onRunGeneration: mocks.onRunGeneration,
      onRunSequenceGeneration: mocks.onRunSequenceGeneration,
      promptControlOpen: mocks.runtime.promptControlOpen,
      sequenceRunBusy: mocks.runtime.sequenceRunBusy,
    });

    expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Control Prompt' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prompt body')).toBeInTheDocument();
    expect(screen.getByText('UI Presets Panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: 'Updated prompt' },
    });
    expect(mocks.setPromptText).toHaveBeenCalledWith('Updated prompt');

    fireEvent.click(screen.getByRole('button', { name: 'Generate Sequence' }));
    expect(mocks.onRunSequenceGeneration).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Generate From Prompt' }));
    expect(mocks.onRunGeneration).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
    expect(mocks.closePromptControl).toHaveBeenCalledTimes(1);
    expect(mocks.setExtractDraftPrompt).toHaveBeenCalledWith('Prompt body');
    expect(mocks.setExtractReviewOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Open Prompt Exploder with current prompt' }));
    expect(mocks.savePromptExploderDraftPrompt).toHaveBeenCalledWith('Prompt body');
    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/admin/prompt-exploder?source=image-studio&returnTo=%2Fadmin%2Fimage-studio'
    );
  });

  it('disables header and action buttons when prompt or project state is unavailable', () => {
    mocks.runtime.modelSupportsSequenceGeneration = false;
    mocks.runtime.projectId = '';
    mocks.runtime.promptText = '';

    renderWithRightSidebarContext(<ControlPromptModal />, {
      closePromptControl: mocks.closePromptControl,
      generationBusy: false,
      modelSupportsSequenceGeneration: mocks.runtime.modelSupportsSequenceGeneration,
      onRunGeneration: mocks.onRunGeneration,
      onRunSequenceGeneration: mocks.onRunSequenceGeneration,
      promptControlOpen: mocks.runtime.promptControlOpen,
      sequenceRunBusy: mocks.runtime.sequenceRunBusy,
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Open Prompt Exploder with current prompt' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate From Prompt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Extract' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Generate Sequence' })).not.toBeInTheDocument();
  });
});
