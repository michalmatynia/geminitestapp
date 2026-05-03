import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePathsTabPanelActions } from './usePathsTabPanelActions';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  ConfirmationModal: vi.fn(() => null),
  savePathIndex: vi.fn(),
  persistPathSettings: vi.fn(),
  persistSettingsBulk: vi.fn(),
  persistActivePathPreference: vi.fn(),
  reportAiPathsError: vi.fn(),
  graphState: {
    activePathId: 'path-1',
    isPathLocked: false,
    pathConfigs: {
      'path-1': {
        id: 'path-1',
        name: 'Path one',
      },
    },
    paths: [
      {
        id: 'path-1',
        name: 'Path one',
      },
    ],
  },
  pathActionsInput: null as Record<string, unknown> | null,
  pathActions: {
    handleReset: vi.fn(),
    handleCreatePath: vi.fn(),
    handleCreateFromTemplate: vi.fn(),
    handleDuplicatePath: vi.fn(),
    handleDeletePath: vi.fn(),
    handleSwitchPath: vi.fn(),
  },
  errorReportingSurface: null as string | null,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/ui', () => ({}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: mockState.ConfirmationModal,
  }),
}));

vi.mock('../../context', () => ({
  usePathMetadataState: () => mockState.graphState,
}));

vi.mock('../../context/PersistenceContext', () => ({
  usePersistenceActions: () => ({
    persistPathSettings: mockState.persistPathSettings,
    persistSettingsBulk: mockState.persistSettingsBulk,
    persistActivePathPreference: mockState.persistActivePathPreference,
    savePathIndex: mockState.savePathIndex,
  }),
}));

vi.mock('../ai-paths-settings/useAiPathsErrorReporting', () => ({
  useAiPathsErrorReporting: (surface: string) => {
    mockState.errorReportingSurface = surface;
    return {
      reportAiPathsError: mockState.reportAiPathsError,
    };
  },
}));

vi.mock('../ai-paths-settings/useAiPathsSettingsPathActions', () => ({
  useAiPathsSettingsPathActions: (input: Record<string, unknown>) => {
    mockState.pathActionsInput = input;
    return mockState.pathActions;
  },
}));

describe('usePathsTabPanelActions', () => {
  beforeEach(() => {
    mockState.toast.mockReset();
    mockState.confirm.mockReset();
    mockState.savePathIndex.mockReset();
    mockState.persistPathSettings.mockReset();
    mockState.persistSettingsBulk.mockReset();
    mockState.persistActivePathPreference.mockReset();
    mockState.reportAiPathsError.mockReset();
    mockState.pathActionsInput = null;
    mockState.errorReportingSurface = null;
    mockState.graphState.activePathId = 'path-1';
    mockState.graphState.isPathLocked = false;
  });

  it('passes graph and persistence dependencies through to the path actions hook', () => {
    const { result } = renderHook(() => usePathsTabPanelActions());

    expect(mockState.errorReportingSurface).toBe('paths');
    expect(mockState.pathActionsInput).toEqual(
      expect.objectContaining({
        activePathId: 'path-1',
        isPathLocked: false,
        pathConfigs: mockState.graphState.pathConfigs,
        paths: mockState.graphState.paths,
        persistSettingsBulk: mockState.persistSettingsBulk,
        persistActivePathPreference: mockState.persistActivePathPreference,
        confirm: mockState.confirm,
        toast: mockState.toast,
        reportAiPathsError: mockState.reportAiPathsError,
      }),
    );

    expect(result.current.handleReset).toBe(mockState.pathActions.handleReset);
    expect(result.current.handleCreatePath).toBe(
      mockState.pathActions.handleCreatePath,
    );
    expect(result.current.handleDeletePath).toBe(
      mockState.pathActions.handleDeletePath,
    );
    expect(result.current.savePathIndex).toBe(mockState.savePathIndex);
    expect(result.current.persistPathSettings).toBe(mockState.persistPathSettings);
    expect(result.current.toast).toBe(mockState.toast);
    expect(result.current.reportAiPathsError).toBe(mockState.reportAiPathsError);
    expect(result.current.ConfirmationModal).toBe(mockState.ConfirmationModal);
  });

  it('normalizes legacy trigger labels before delegating to the shared path actions hook', async () => {
    renderHook(() => usePathsTabPanelActions());

    const normalizeTriggerLabel = mockState.pathActionsInput?.[
      'normalizeTriggerLabel'
    ] as ((value?: string | null) => string) | undefined;
    const persistPathSettings = mockState.pathActionsInput?.[
      'persistPathSettings'
    ] as
      | ((
          nextPaths: unknown[],
          configId: string,
          config: unknown,
        ) => Promise<void>)
      | undefined;

    expect(normalizeTriggerLabel).toBeTypeOf('function');
    expect(normalizeTriggerLabel?.('Product Modal - Context Grabber')).toBe(
      'Product Modal - Context Filter',
    );
    expect(normalizeTriggerLabel?.('On Product Save')).toBe('On Product Save');
    expect(normalizeTriggerLabel?.(null)).toBe('Product Modal - Context Filter');

    await persistPathSettings?.([], 'path-1', { any: 'config' });
    expect(mockState.persistPathSettings).toHaveBeenCalledWith(
      [],
      'path-1',
      { any: 'config' },
    );
  });
});
