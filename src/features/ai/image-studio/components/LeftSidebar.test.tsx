// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  handleRenameProject: vi.fn(),
  saveStudioSettings: vi.fn(),
  setStudioSettings: vi.fn(),
  setSlotInlineEditOpen: vi.fn(),
  setSelectedSlotId: vi.fn(),
  setWorkingSlotId: vi.fn(),
  setPreviewMode: vi.fn(),
  createSlots: vi.fn(),
  createFolderMutateAsync: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string }
  >(function MockButton(props, ref) {
    const { children, ...rest } = props;
    return (
      <button ref={ref} type='button' {...rest}>
        {children}
      </button>
    );
  }),
  Input: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { size?: string }
  >(function MockInput(props, ref) {
    return <input ref={ref} {...props} />;
  }),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  SidePanel: ({
    children,
    isFocusMode: _isFocusMode,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { isFocusMode?: boolean }) => (
    <div {...props}>{children}</div>
  ),
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
    className?: string;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSettingMutateAsync,
  }),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: () => ({
    effectiveModelId: 'gpt-image-1',
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('./ImageStudioSingleSlotManager', () => ({
  ImageStudioSingleSlotManager: React.forwardRef(function MockImageStudioSingleSlotManager(
    _props,
    _ref
  ) {
    return <div data-testid='single-slot-manager'>Single Slot Manager</div>;
  }),
}));

vi.mock('./SlotTree', () => ({
  SlotTree: () => <div data-testid='slot-tree'>Slot Tree</div>,
}));

vi.mock('../context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
    projectsQuery: {
      data: [{ id: 'project-1', name: 'Project One' }],
      isLoading: false,
    },
  }),
  useProjectsActions: () => ({
    handleRenameProject: mocks.handleRenameProject,
  }),
}));

vi.mock('../context/UiContext', () => ({
  useUiState: () => ({
    isFocusMode: false,
  }),
}));

vi.mock('../context/SettingsContext', () => ({
  useSettingsState: () => ({
    studioSettings: {},
  }),
  useSettingsActions: () => ({
    saveStudioSettings: mocks.saveStudioSettings,
    setStudioSettings: mocks.setStudioSettings,
  }),
}));

vi.mock('../context/PromptContext', () => ({
  usePromptState: () => ({
    promptText: '',
    paramsState: {},
    paramSpecs: null,
    paramUiOverrides: {},
  }),
}));

vi.mock('../context/MaskingContext', () => ({
  useMaskingState: () => ({
    maskShapes: [],
  }),
  useMaskingActions: () => ({
    setMaskShapes: vi.fn(),
    setActiveMaskId: vi.fn(),
    setSelectedPointIndex: vi.fn(),
  }),
}));

vi.mock('../context/SlotsContext', () => ({
  useSlotsState: () => ({
    slots: [],
    virtualFolders: ['Root'],
    selectedSlot: null,
    selectedSlotId: null,
    selectedFolder: 'Root',
    workingSlot: null,
    workingSlotId: null,
    previewMode: 'image',
    compositeAssetIds: [],
    temporaryObjectUpload: null,
  }),
  useSlotsActions: () => ({
    setSlotInlineEditOpen: mocks.setSlotInlineEditOpen,
    setSelectedSlotId: mocks.setSelectedSlotId,
    setWorkingSlotId: mocks.setWorkingSlotId,
    setPreviewMode: mocks.setPreviewMode,
    createSlots: mocks.createSlots,
    createFolderMutation: {
      isPending: false,
      mutateAsync: mocks.createFolderMutateAsync,
    },
  }),
}));

import { LeftSidebar } from './LeftSidebar';

describe('LeftSidebar', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.handleRenameProject.mockReset();
    mocks.saveStudioSettings.mockReset();
    mocks.setStudioSettings.mockReset();
    mocks.setSlotInlineEditOpen.mockReset();
    mocks.setSelectedSlotId.mockReset();
    mocks.setWorkingSlotId.mockReset();
    mocks.setPreviewMode.mockReset();
    mocks.createSlots.mockReset();
    mocks.createFolderMutateAsync.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
  });

  it('renders the sidebar shell and lazy-loaded sidebar tools', async () => {
    render(<LeftSidebar />);

    expect(screen.getByDisplayValue('Project One')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save current Image Studio project state' })).toBeInTheDocument();
    expect(screen.getByText('No shapes drawn yet')).toBeInTheDocument();
    expect(await screen.findByTestId('single-slot-manager')).toBeInTheDocument();
    expect(await screen.findByTestId('slot-tree')).toBeInTheDocument();
  });
});
