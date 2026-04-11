// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
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

const createRuntimeResourcesMock = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

describe('useImportExportRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mocks.useToastMock.mockReturnValue({ toast: vi.fn() });
    mocks.useImportExportRuntimeResourcesMock.mockReturnValue(createRuntimeResourcesMock());
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

  it('threads exact import target state into runtime resources', async () => {
    const { result } = renderHook(() => useImportExportRuntime());

    expect(mocks.useImportExportRuntimeResourcesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        importDirectTargetType: 'base_product_id',
        importDirectTargetValue: '',
      })
    );

    await act(async () => {
      result.current.stateValue.setImportDirectTargetType('sku');
      result.current.stateValue.setImportDirectTargetValue('FOASW022');
    });

    await waitFor(() => {
      expect(mocks.useImportExportRuntimeResourcesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          importDirectTargetType: 'sku',
          importDirectTargetValue: 'FOASW022',
        })
      );
    });
  });

  it('hydrates saved import settings from local storage on reload', async () => {
    window.localStorage.setItem(
      'product-import-runtime.v1',
      JSON.stringify({
        version: 1,
        saveImportSettings: true,
        importsPageTab: 'import-template',
        selectedBaseConnectionId: 'conn-1',
        inventoryId: 'inv-1',
        catalogId: 'catalog-1',
        limit: '50',
        imageMode: 'links',
        importMode: 'upsert_on_sku',
        importDryRun: true,
        uniqueOnly: false,
        allowDuplicateSku: true,
        importTemplateId: 'tpl-1',
        importNameSearch: 'hoodie',
        importSkuSearch: 'SKU-1',
        importDirectTargetType: 'sku',
        importDirectTargetValue: 'SKU-1',
        importListPage: 3,
        importListPageSize: 50,
        importListEnabled: true,
      })
    );

    mocks.useImportExportRuntimeResourcesMock.mockReturnValue(
      createRuntimeResourcesMock({
        baseConnections: [{ id: 'conn-1', name: 'Conn 1' }],
        catalogsData: [{ id: 'catalog-1', name: 'Catalog 1', isDefault: false }],
        importTemplates: [
          {
            id: 'tpl-1',
            name: 'Template 1',
            provider: 'base',
            mappings: [],
            config: {},
          },
        ],
        inventories: [{ id: 'inv-1', name: 'Inventory 1' }],
      })
    );

    const { result } = renderHook(() => useImportExportRuntime());

    await waitFor(() => {
      expect(result.current.stateValue.saveImportSettings).toBe(true);
      expect(result.current.stateValue.importsPageTab).toBe('import-template');
      expect(result.current.stateValue.selectedBaseConnectionId).toBe('conn-1');
      expect(result.current.stateValue.inventoryId).toBe('inv-1');
      expect(result.current.stateValue.catalogId).toBe('catalog-1');
      expect(result.current.stateValue.limit).toBe('50');
      expect(result.current.stateValue.imageMode).toBe('links');
      expect(result.current.stateValue.importMode).toBe('upsert_on_sku');
      expect(result.current.stateValue.importDryRun).toBe(true);
      expect(result.current.stateValue.uniqueOnly).toBe(false);
      expect(result.current.stateValue.allowDuplicateSku).toBe(true);
      expect(result.current.stateValue.importTemplateId).toBe('tpl-1');
      expect(result.current.stateValue.importNameSearch).toBe('hoodie');
      expect(result.current.stateValue.importSkuSearch).toBe('SKU-1');
      expect(result.current.stateValue.importDirectTargetType).toBe('sku');
      expect(result.current.stateValue.importDirectTargetValue).toBe('SKU-1');
      expect(result.current.stateValue.importListPage).toBe(3);
      expect(result.current.stateValue.importListPageSize).toBe(50);
      expect(result.current.stateValue.importListEnabled).toBe(true);
    });
  });

  it('persists import settings only after the explicit save action is used', async () => {
    const { result } = renderHook(() => useImportExportRuntime());

    await act(async () => {
      result.current.stateValue.setImportsPageTab('import-template');
      result.current.stateValue.setSelectedBaseConnectionId('conn-2');
      result.current.stateValue.setInventoryId('inv-2');
      result.current.stateValue.setCatalogId('catalog-2');
      result.current.stateValue.setLimit('100');
      result.current.stateValue.setImageMode('links');
      result.current.stateValue.setImportMode('create_only');
      result.current.stateValue.setImportDryRun(true);
      result.current.stateValue.setUniqueOnly(false);
      result.current.stateValue.setAllowDuplicateSku(true);
      result.current.stateValue.setImportTemplateId('tpl-2');
      result.current.stateValue.setImportNameSearch('pin');
      result.current.stateValue.setImportSkuSearch('PIN-2');
      result.current.stateValue.setImportDirectTargetType('sku');
      result.current.stateValue.setImportDirectTargetValue('PIN-2');
      result.current.stateValue.setImportListPage(4);
      result.current.stateValue.setImportListPageSize(100);
      result.current.stateValue.setImportListEnabled(true);
    });

    expect(window.localStorage.getItem('product-import-runtime.v1')).toBeNull();
    expect(result.current.stateValue.saveImportSettings).toBe(false);

    await act(async () => {
      await result.current.actionsValue.handleSaveImportSettings();
    });

    await waitFor(() => {
      expect(result.current.stateValue.saveImportSettings).toBe(true);
      expect(result.current.stateValue.hasUnsavedImportSettingsChanges).toBe(false);
      expect(JSON.parse(window.localStorage.getItem('product-import-runtime.v1') ?? 'null')).toEqual(
        {
          version: 1,
          saveImportSettings: true,
          importsPageTab: 'import-template',
          selectedBaseConnectionId: 'conn-2',
          inventoryId: 'inv-2',
          catalogId: 'catalog-2',
          limit: '100',
          imageMode: 'links',
          importMode: 'create_only',
          importDryRun: true,
          uniqueOnly: false,
          allowDuplicateSku: true,
          importTemplateId: 'tpl-2',
          importNameSearch: 'pin',
          importSkuSearch: 'PIN-2',
          importDirectTargetType: 'sku',
          importDirectTargetValue: 'PIN-2',
          importListPage: 4,
          importListPageSize: 100,
          importListEnabled: true,
        }
      );
    });
  });

  it('clears persisted import settings after the clear action is used', async () => {
    const { result } = renderHook(() => useImportExportRuntime());

    await act(async () => {
      result.current.stateValue.setSelectedBaseConnectionId('conn-2');
      result.current.stateValue.setImportListEnabled(true);
    });

    await act(async () => {
      await result.current.actionsValue.handleSaveImportSettings();
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('product-import-runtime.v1')).not.toBeNull();
    });

    await act(async () => {
      await result.current.actionsValue.handleClearSavedImportSettings();
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('product-import-runtime.v1')).toBeNull();
      expect(result.current.stateValue.saveImportSettings).toBe(false);
      expect(result.current.stateValue.hasUnsavedImportSettingsChanges).toBe(false);
    });
  });

  it('marks saved import settings as dirty after editing them', async () => {
    const { result } = renderHook(() => useImportExportRuntime());

    await act(async () => {
      result.current.stateValue.setCatalogId('catalog-2');
      await result.current.actionsValue.handleSaveImportSettings();
    });

    await act(async () => {
      result.current.stateValue.setCatalogId('catalog-3');
    });

    expect(result.current.stateValue.saveImportSettings).toBe(true);
    expect(result.current.stateValue.hasUnsavedImportSettingsChanges).toBe(true);
  });

  it('clears stale persisted ids and falls back to the first available catalog', async () => {
    window.localStorage.setItem(
      'product-import-runtime.v1',
      JSON.stringify({
        version: 1,
        saveImportSettings: true,
        importsPageTab: 'import',
        selectedBaseConnectionId: 'missing-conn',
        inventoryId: 'missing-inv',
        catalogId: 'missing-catalog',
        limit: 'all',
        imageMode: 'download',
        importMode: 'upsert_on_base_id',
        importDryRun: false,
        uniqueOnly: true,
        allowDuplicateSku: false,
        importTemplateId: 'missing-template',
        importNameSearch: '',
        importSkuSearch: '',
        importListPage: 1,
        importListPageSize: 25,
        importListEnabled: true,
      })
    );

    mocks.useImportExportRuntimeResourcesMock.mockImplementation(
      ({
        catalogId,
        setBaseConnections,
        setCatalogId,
      }: {
        catalogId: string;
        setBaseConnections: (connections: Array<{ id: string; name: string }>) => void;
        setCatalogId: (catalogId: string) => void;
      }) => {
      useEffect(() => {
        setBaseConnections([{ id: 'conn-1', name: 'Conn 1' }]);
        if (!catalogId) {
          setCatalogId('catalog-1');
        }
      }, [catalogId, setBaseConnections, setCatalogId]);

      return createRuntimeResourcesMock({
        catalogsData: [{ id: 'catalog-1', name: 'Catalog 1', isDefault: false }],
        importTemplates: [
          {
            id: 'tpl-1',
            name: 'Template 1',
            provider: 'base',
            mappings: [],
            config: {},
          },
        ],
        inventories: [{ id: 'inv-1', name: 'Inventory 1' }],
      });
      }
    );

    const { result } = renderHook(() => useImportExportRuntime());

    await waitFor(() => {
      expect(result.current.stateValue.selectedBaseConnectionId).toBe('');
      expect(result.current.stateValue.inventoryId).toBe('');
      expect(result.current.stateValue.catalogId).toBe('catalog-1');
      expect(result.current.stateValue.importTemplateId).toBe('');
      expect(result.current.stateValue.importListEnabled).toBe(false);
      expect(result.current.stateValue.importsPageTab).toBe('import-list');
    });
  });

  it('syncs lastResult forward from the live active import run when the same run updates', async () => {
    mocks.useImportExportRuntimeResourcesMock.mockReturnValue(
      createRuntimeResourcesMock({
        activeImportRun: {
          run: {
            id: 'run-5',
            status: 'completed',
            dispatchMode: 'queued',
            queueJobId: 'job-5',
            summaryMessage: 'Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.',
          },
        },
      })
    );

    mocks.createImportExportRuntimeActionsMock.mockImplementation(
      ({
        setActiveImportRunId,
        setLastResult,
        setPollImportRun,
      }: {
        setActiveImportRunId: (value: string) => void;
        setLastResult: (value: {
          runId: string;
          status: 'queued';
          dispatchMode: 'queued';
          queueJobId: string;
          summaryMessage: string;
        }) => void;
        setPollImportRun: (value: boolean) => void;
      }) => ({
        handleLoadInventories: vi.fn(),
        handleLoadWarehouses: vi.fn(),
        handleLoadImportList: vi.fn(),
        handleImport: async () => {
          setLastResult({
            runId: 'run-5',
            status: 'queued',
            dispatchMode: 'queued',
            queueJobId: 'job-5',
            summaryMessage: 'Queued 1 products for import.',
          });
          setActiveImportRunId('run-5');
          setPollImportRun(true);
        },
        handleResumeImport: vi.fn(),
        handleCancelImport: vi.fn(),
        handleDownloadImportReport: vi.fn(),
        handleSaveExportSettings: vi.fn(),
        handleClearInventory: vi.fn(),
      })
    );

    const { result } = renderHook(() => useImportExportRuntime());

    await act(async () => {
      await result.current.actionsValue.handleImport();
    });

    await waitFor(() => {
      expect(result.current.dataValue.lastResult).toEqual({
        runId: 'run-5',
        status: 'completed',
        dispatchMode: 'queued',
        queueJobId: 'job-5',
        summaryMessage: 'Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.',
        preflight: null,
      });
    });
  });
});
