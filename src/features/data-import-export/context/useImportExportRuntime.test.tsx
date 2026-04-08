// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useToastMock: vi.fn(),
  useImportExportRuntimeResourcesMock: vi.fn(),
  createImportExportRuntimeActionsMock: vi.fn(),
  useImportMutationMock: vi.fn(),
  useResumeImportRunMutationMock: vi.fn(),
  useCancelImportRunMutationMock: vi.fn(),
  useSaveDefaultConnectionMutationMock: vi.fn(),
  useSaveExportSettingsMutationMock: vi.fn(),
  useClearInventoryMutationMock: vi.fn(),
  getDefaultImageRetryPresetsMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => mocks.useToastMock(),
}));

vi.mock('./useImportExportRuntimeResources', () => ({
  useImportExportRuntimeResources: (...args: unknown[]) =>
    mocks.useImportExportRuntimeResourcesMock(...args),
}));

vi.mock('./import-export-runtime-actions', () => ({
  createImportExportRuntimeActions: (...args: unknown[]) =>
    mocks.createImportExportRuntimeActionsMock(...args),
}));

vi.mock('@/features/data-import-export/hooks/useImportQueries', () => ({
  useImportMutation: () => mocks.useImportMutationMock(),
  useResumeImportRunMutation: (...args: unknown[]) => mocks.useResumeImportRunMutationMock(...args),
  useCancelImportRunMutation: (...args: unknown[]) => mocks.useCancelImportRunMutationMock(...args),
  useSaveDefaultConnectionMutation: () => mocks.useSaveDefaultConnectionMutationMock(),
  useSaveExportSettingsMutation: () => mocks.useSaveExportSettingsMutationMock(),
  useClearInventoryMutation: () => mocks.useClearInventoryMutationMock(),
}));

vi.mock('@/features/data-import-export/utils/image-retry-presets', () => ({
  getDefaultImageRetryPresets: () => mocks.getDefaultImageRetryPresetsMock(),
}));

import { useImportExportRuntime } from './useImportExportRuntime';

describe('useImportExportRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useToastMock.mockReturnValue({ toast: vi.fn() });
    mocks.useImportExportRuntimeResourcesMock.mockReturnValue({
      activeImportRun: null,
      allWarehouses: [],
      baseConnections: [],
      catalogsData: [],
      checkingIntegration: false,
      exportTemplates: [],
      importList: [],
      importListStats: null,
      importSourceFieldValues: {},
      importSourceFields: [],
      importTemplates: [],
      integrationsWithConnections: [],
      inventories: [],
      isBaseConnected: false,
      isFetchingInventories: false,
      isFetchingWarehouses: false,
      loadingCatalogs: false,
      loadingExportTemplates: false,
      loadingImportList: false,
      loadingImportRun: false,
      loadingImportSourceFields: false,
      loadingImportTemplates: false,
      refreshImportParameterCacheMutation: { mutateAsync: vi.fn() },
      refetchImportList: vi.fn().mockResolvedValue({ data: [], error: undefined }),
      refetchInventories: vi.fn().mockResolvedValue({ data: [], error: undefined }),
      refetchWarehouses: vi.fn().mockResolvedValue({ data: [], error: undefined }),
      templates: {
        exportActiveTemplateId: '',
        exportImagesAsBase64: false,
        setExportImagesAsBase64: vi.fn(),
        handleNewTemplate: vi.fn(),
        handleDuplicateTemplate: vi.fn(),
        handleCreateExportFromImportTemplate: vi.fn(),
        handleSaveTemplate: vi.fn(),
        handleDeleteTemplate: vi.fn(),
        applyTemplate: vi.fn(),
        saveImportTemplateMutation: { isPending: false },
        createImportTemplateMutation: { isPending: false },
        saveExportTemplateMutation: { isPending: false },
        createExportTemplateMutation: { isPending: false },
        importActiveTemplateId: '',
        setImportActiveTemplateId: vi.fn(),
        exportTemplateName: '',
        setExportTemplateName: vi.fn(),
        exportTemplateDescription: '',
        setExportTemplateDescription: vi.fn(),
        importTemplateName: '',
        setImportTemplateName: vi.fn(),
        importTemplateDescription: '',
        setImportTemplateDescription: vi.fn(),
        importTemplateMappings: [],
        setImportTemplateMappings: vi.fn(),
        importTemplateParameterImport: {
          enabled: false,
          mode: 'all',
          languageScope: 'catalog_languages',
          createMissingParameters: false,
          overwriteExistingValues: false,
          matchBy: 'base_id_then_name',
        },
        setImportTemplateParameterImport: vi.fn(),
        exportTemplateMappings: [],
        setExportTemplateMappings: vi.fn(),
        templateScope: 'import',
        setTemplateScope: vi.fn(),
      },
      warehouses: [],
    });
    mocks.createImportExportRuntimeActionsMock.mockReturnValue({
      handleLoadInventories: vi.fn(),
      handleLoadWarehouses: vi.fn(),
      handleLoadImportList: vi.fn(),
      handleImport: vi.fn(),
      handleResumeImport: vi.fn(),
      handleCancelImport: vi.fn(),
      handleDownloadImportReport: vi.fn(),
      handleSaveExportSettings: vi.fn(),
      handleClearInventory: vi.fn(),
    });
    mocks.useImportMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    mocks.useResumeImportRunMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.useCancelImportRunMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.useSaveDefaultConnectionMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.useSaveExportSettingsMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.useClearInventoryMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.getDefaultImageRetryPresetsMock.mockReturnValue([]);
  });

  it('defaults imageMode to download', () => {
    const { result } = renderHook(() => useImportExportRuntime());

    expect(result.current.stateValue.imageMode).toBe('download');
  });
});
