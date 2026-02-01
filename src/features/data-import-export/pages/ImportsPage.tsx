"use client";
import {
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
  Label,
  SectionHeader,
  SectionPanel,
} from "@/shared/ui";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";

import type {
  IntegrationConnectionBasic,
  IntegrationWithConnections,
} from "@/features/integrations";
import { ImportTab } from "@/features/data-import-export/components/imports/ImportTab";
import { ExportTab } from "@/features/data-import-export/components/imports/ExportTab";
import {
  PRODUCT_FIELDS,
} from "@/features/data-import-export/components/imports/constants";
import type {
  ImportResponse,
  InventoryDebugRaw,
  InventoryOption,
  Template,
  TemplateMapping,
  WarehouseDebugRaw,
  WarehouseOption,
  ImageRetryPreset,
  ImportListItem,
} from "@/features/data-import-export/types/imports";

import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from "@/features/data-import-export/utils/image-retry-presets";
import { useIntegrationsWithConnections } from "@/features/integrations/hooks/useIntegrationQueries";
import {
  useTemplates,
  useImportPreference,
  useSavePreferenceMutation,
  useTemplateMutation,
  useInventories,
  useWarehouses,
  useImportList,
  useImportMutation,
  useSaveExportSettingsMutation,
  type CatalogRecord,
} from "@/features/data-import-export/hooks/useImportQueries";
import { useCatalogs } from "@/features/products/hooks/useProductSettingsQueries";

export default function ImportsPage(): React.JSX.Element {
  const { toast } = useToast();
  
  const [showAllWarehouses, setShowAllWarehouses] = useState(false);
  const [includeAllWarehouses, setIncludeAllWarehouses] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [exportInventoryId, setExportInventoryId] = useState("");
  const [exportWarehouseId, setExportWarehouseId] = useState("");
  
  const [debugWarehouses, setDebugWarehouses] = useState<{
    inventory?: WarehouseOption[];
    all?: WarehouseOption[];
    inventories?: InventoryOption[];
    inventoryRaw?: WarehouseDebugRaw | null;
    inventoriesRaw?: InventoryDebugRaw | null;
    allRaw?: WarehouseDebugRaw | null;
  } | null>(null);

  // Queries
  const { data: integrationsWithConnections = [], isLoading: checkingIntegration } = useIntegrationsWithConnections();
  const { data: catalogsData = [], isLoading: loadingCatalogs } = useCatalogs() as { data: CatalogRecord[], isLoading: boolean };
  const { data: importTemplates = [], isLoading: loadingImportTemplates } = useTemplates("import");
  const { data: exportTemplates = [], isLoading: loadingExportTemplates } = useTemplates("export");

  const [catalogId, setCatalogId] = useState("");
  const [limit, setLimit] = useState("all");
  const [imageMode, setImageMode] = useState<"links" | "download">("links");
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const [templateScope, setTemplateScope] = useState<"import" | "export">("import");
  
  const [importTemplateId, setImportTemplateId] = useState("");
  const [importActiveTemplateId, setImportActiveTemplateId] = useState("");
  const [exportActiveTemplateId, setExportActiveTemplateId] = useState("");
  const [importTemplateName, setImportTemplateName] = useState("");
  const [exportTemplateName, setExportTemplateName] = useState("");
  const [importTemplateDescription, setImportTemplateDescription] = useState("");
  const [exportTemplateDescription, setExportTemplateDescription] = useState("");
  const [importTemplateMappings, setImportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: "", targetField: "" }]);
  const [exportTemplateMappings, setExportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: "", targetField: "" }]);
  const [exportImagesAsBase64, setExportImagesAsBase64] = useState(false);
  const [exportStockFallbackEnabled, setExportStockFallbackEnabled] = useState(false);
  const [imageRetryPresets, setImageRetryPresets] = useState<ImageRetryPreset[]>(getDefaultImageRetryPresets());
  
  const [isBaseConnected, setIsBaseConnected] = useState(false);
  const [baseConnections, setBaseConnections] = useState<IntegrationConnectionBasic[]>([]);
  const [selectedBaseConnectionId, setSelectedBaseConnectionId] = useState("");

  // Sync connections
  useEffect(() => {
    if (integrationsWithConnections) {
      const baseIntegration = integrationsWithConnections.find(
        (i: IntegrationWithConnections): boolean => i.slug === "baselinker",
      );
      const connections = baseIntegration?.connections ?? [];
      setBaseConnections(connections);
      if (connections.length > 0) {
        setIsBaseConnected(true);
        if (!selectedBaseConnectionId) {
          setSelectedBaseConnectionId(connections[0]?.id || "");
        }
      }
    }
  }, [integrationsWithConnections, selectedBaseConnectionId]);

  // Sync default catalog
  useEffect(() => {
    if (catalogsData.length > 0 && !catalogId) {
      const defaultCatalog = catalogsData.find((catalog: CatalogRecord) => catalog.isDefault);
      if (defaultCatalog) setCatalogId(defaultCatalog.id);
    }
  }, [catalogsData, catalogId]);

  // Preferences
  const { data: lastImportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    "last-template",
    "/api/integrations/imports/base/last-template"
  );
  const { data: activeImportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    "active-template",
    "/api/integrations/imports/base/active-template"
  );
  const { data: activeExportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    "export-active-template",
    "/api/integrations/exports/base/active-template"
  );
  const { data: defaultExportInventoryPref } = useImportPreference<{ inventoryId?: string | null }>(
    "default-inventory",
    "/api/integrations/exports/base/default-inventory"
  );
  const { data: defaultConnectionPref } = useImportPreference<{ connectionId?: string | null }>(
    "default-connection",
    "/api/integrations/exports/base/default-connection"
  );
  const { data: exportStockFallbackPref } = useImportPreference<{ enabled?: boolean }>(
    "stock-fallback",
    "/api/integrations/exports/base/stock-fallback"
  );
  const { data: imageRetryPresetsPref } = useImportPreference<{ presets?: ImageRetryPreset[] }>(
    "image-retry-presets",
    "/api/integrations/exports/base/image-retry-presets"
  );
  const { data: sampleProductPref } = useImportPreference<{ productId?: string | null; inventoryId?: string | null }>(
    "sample-product",
    "/api/integrations/imports/base/sample-product"
  );

  // Apply templates
  const applyTemplate = useCallback((template: Template, scope: "import" | "export"): void => {
    const nextMappings = template.mappings?.length ? template.mappings : [{ sourceKey: "", targetField: "" }];
    if (scope === "import") {
      setImportActiveTemplateId(template.id);
      setImportTemplateName(template.name);
      setImportTemplateDescription(template.description ?? "");
      setImportTemplateMappings(nextMappings);
    } else {
      setExportActiveTemplateId(template.id);
      setExportTemplateName(template.name);
      setExportTemplateDescription(template.description ?? "");
      setExportTemplateMappings(nextMappings);
      setExportImagesAsBase64(template.exportImagesAsBase64 ?? false);
    }
  }, []);

  // Sync preferences to state
  useEffect(() => {
    if (lastImportTemplatePref?.templateId) setImportTemplateId(lastImportTemplatePref.templateId);
  }, [lastImportTemplatePref]);

  useEffect(() => {
    if (activeImportTemplatePref?.templateId && importTemplates.length > 0 && !importActiveTemplateId) {
      const preferred = importTemplates.find(t => t.id === activeImportTemplatePref.templateId);
      if (preferred) applyTemplate(preferred, "import");
    }
  }, [activeImportTemplatePref, importTemplates, importActiveTemplateId, applyTemplate]);

  useEffect(() => {
    if (activeExportTemplatePref?.templateId && exportTemplates.length > 0 && !exportActiveTemplateId) {
      const preferred = exportTemplates.find(t => t.id === activeExportTemplatePref.templateId);
      if (preferred) applyTemplate(preferred, "export");
    }
  }, [activeExportTemplatePref, exportTemplates, exportActiveTemplateId, applyTemplate]);

  useEffect(() => {
    if (defaultExportInventoryPref?.inventoryId) setExportInventoryId(defaultExportInventoryPref.inventoryId);
  }, [defaultExportInventoryPref]);

  useEffect(() => {
    if (defaultConnectionPref?.connectionId && baseConnections.length > 0) {
      if (baseConnections.some(c => c.id === defaultConnectionPref.connectionId)) {
        setSelectedBaseConnectionId(defaultConnectionPref.connectionId);
      }
    }
  }, [defaultConnectionPref, baseConnections]);

  useEffect(() => {
    if (exportStockFallbackPref) setExportStockFallbackEnabled(Boolean(exportStockFallbackPref.enabled));
  }, [exportStockFallbackPref]);

  useEffect(() => {
    if (imageRetryPresetsPref?.presets) setImageRetryPresets(normalizeImageRetryPresets(imageRetryPresetsPref.presets));
  }, [imageRetryPresetsPref]);

  useEffect(() => {
    if (sampleProductPref) {
      if (sampleProductPref.inventoryId && !inventoryId) setInventoryId(sampleProductPref.inventoryId);
    }
  }, [sampleProductPref, inventoryId]);

  // Mutations
  const savePreferenceMutation = useSavePreferenceMutation();
  const importMutation = useImportMutation();
  const saveExportSettingsMutation = useSaveExportSettingsMutation();
  const saveImportTemplateMutation = useTemplateMutation("import", importActiveTemplateId);
  const saveExportTemplateMutation = useTemplateMutation("export", exportActiveTemplateId);

  // Auto-save some preferences
  useEffect(() => {
    if (importTemplateId) {
      savePreferenceMutation.mutate({
        endpoint: "/api/integrations/imports/base/last-template",
        data: { templateId: importTemplateId },
      });
    }
  }, [importTemplateId, savePreferenceMutation]);

  useEffect(() => {
    if (importActiveTemplateId) {
      savePreferenceMutation.mutate({
        endpoint: "/api/integrations/imports/base/active-template",
        data: { templateId: importActiveTemplateId },
      });
    }
  }, [importActiveTemplateId, savePreferenceMutation]);

  // Data loading hooks
  const { data: inventories = [], isFetching: isFetchingInventories, refetch: refetchInventories } = useInventories(selectedBaseConnectionId, isBaseConnected);
  
  useEffect(() => {
    if (inventories.length > 0) {
      if (!inventoryId) setInventoryId(inventories[0]?.id ?? "");
      if (!exportInventoryId) setExportInventoryId(inventories[0]?.id ?? "");
    }
  }, [inventories, inventoryId, exportInventoryId]);

  const { data: warehousesData, isFetching: isFetchingWarehouses, refetch: refetchWarehouses } = useWarehouses(exportInventoryId, selectedBaseConnectionId, includeAllWarehouses, isBaseConnected && !!exportInventoryId);
  
  const warehouses = warehousesData?.warehouses ?? [];
  const allWarehouses = warehousesData?.allWarehouses ?? [];

  const { data: importListData, isFetching: loadingImportList, refetch: refetchImportList } = useImportList(inventoryId, limit, uniqueOnly, isBaseConnected && !!inventoryId);
  
  const importList = (importListData?.products ?? []) as ImportListItem[];
  const importListStats = useMemo(() => {
    if (!importListData) return null;
    return {
      total: importListData.total ?? 0,
      filtered: importListData.filtered ?? 0,
      available: importListData.available ?? importListData.filtered ?? 0,
      existing: importListData.existing ?? 0,
      skuDuplicates: importListData.skuDuplicates ?? 0,
    };
  }, [importListData]);

  useEffect(() => {
    if (importList.length > 0) {
      setSelectedImportIds(new Set(importList.map((item: ImportListItem) => item.baseProductId).filter(Boolean)));
    }
  }, [importList]);

  // Actions
  const handleLoadInventories = async () => {
    await refetchInventories();
    toast("Inventories reloaded", { variant: "success" });
  };

  const handleLoadWarehouses = async () => {
    await refetchWarehouses();
    toast("Warehouses reloaded", { variant: "success" });
  };

  const handleLoadImportList = async () => {
    await refetchImportList();
    toast("Import list reloaded", { variant: "success" });
  };

  const handleImport = async () => {
    if (!inventoryId || !catalogId) {
      toast("Inventory and catalog are required", { variant: "error" });
      return;
    }
    try {
      const selectedIds = Array.from(selectedImportIds);
      const res = await importMutation.mutateAsync({
        inventoryId,
        catalogId,
        templateId: importTemplateId || undefined,
        limit: limit === "all" ? undefined : Number(limit),
        imageMode,
        uniqueOnly,
        allowDuplicateSku,
        selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      setLastResult(res);
      toast(`Imported ${res.imported} products`, { variant: "success" });
    } catch (error: any) {
      toast(error.message, { variant: "error" });
    }
  };

  const handleSaveExportSettings = async () => {
    try {
      await saveExportSettingsMutation.mutateAsync({
        exportActiveTemplateId,
        exportInventoryId,
        selectedBaseConnectionId,
        exportStockFallbackEnabled,
        imageRetryPresets,
        exportWarehouseId,
      });
      toast("Export settings saved", { variant: "success" });
    } catch (error: any) {
      toast(error.message, { variant: "error" });
    }
  };

  const handleClearInventory = async (): Promise<void> => {
    setInventoryId("");
    try {
      await Promise.all([
        fetch("/api/integrations/imports/base/sample-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: "", saveOnly: true }),
        }),
        fetch("/api/integrations/imports/base/parameters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: "", productId: "", clearOnly: true }),
        })
      ]);
      toast("Inventory cleared.", { variant: "success" });
    } catch (_error) {
      toast("Failed to clear inventory.", { variant: "error" });
    }
  };

  const handleNewTemplate = (): void => {
    if (templateScope === "import") {
      setImportActiveTemplateId("");
      setImportTemplateName("");
      setImportTemplateDescription("");
      setImportTemplateMappings([{ sourceKey: "", targetField: "" }]);
    } else {
      setExportActiveTemplateId("");
      setExportTemplateName("");
      setExportTemplateDescription("");
      setExportTemplateMappings([{ sourceKey: "", targetField: "" }]);
      setExportImagesAsBase64(false);
    }
  };

  const handleSaveTemplate = async (): Promise<void> => {
    const isImport = templateScope === "import";
    const name = isImport ? importTemplateName : exportTemplateName;
    const desc = isImport ? importTemplateDescription : exportTemplateDescription;
    const mappings = isImport ? importTemplateMappings : exportTemplateMappings;
    
    if (!name.trim()) {
      toast("Template name is required.", { variant: "error" });
      return;
    }

    const cleanedMappings = mappings
      .map(m => ({ sourceKey: m.sourceKey.trim(), targetField: m.targetField.trim() }))
      .filter(m => m.sourceKey && m.targetField);

    const mutation = isImport ? saveImportTemplateMutation : saveExportTemplateMutation;

    try {
      const res = await mutation.mutateAsync({
        data: {
          name: name.trim(),
          description: desc.trim() || undefined,
          mappings: cleanedMappings,
          ...(isImport ? {} : { exportImagesAsBase64 }),
        }
      });
      applyTemplate(res, isImport ? "import" : "export");
      toast("Template saved.", { variant: "success" });
    } catch (error: any) {
      toast(error.message, { variant: "error" });
    }
  };

  const handleDeleteTemplate = async (): Promise<void> => {
    const isImport = templateScope === "import";
    const activeId = isImport ? importActiveTemplateId : exportActiveTemplateId;
    if (!activeId || !confirm("Are you sure?")) return;
    
    const mutation = isImport ? saveImportTemplateMutation : saveExportTemplateMutation;
    try {
      await mutation.mutateAsync({ isDelete: true });
      handleNewTemplate();
      toast("Template deleted.", { variant: "success" });
    } catch (error: any) {
      toast(error.message, { variant: "error" });
    }
  };

  const updateMapping = (index: number, patch: Partial<TemplateMapping>) => {
    const setMappings = templateScope === "import" ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...patch } : m));
  };

  const addMappingRow = () => {
    const setMappings = templateScope === "import" ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings(prev => [...prev, { sourceKey: "", targetField: "" }]);
  };

  const removeMappingRow = (index: number) => {
    const setMappings = templateScope === "import" ? setImportTemplateMappings : setExportTemplateMappings;
    setMappings(prev => prev.length === 1 ? [{ sourceKey: "", targetField: "" }] : prev.filter((_, i) => i !== index));
  };

  const isImportTemplateScope = templateScope === "import";
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope ? importActiveTemplateId : exportActiveTemplateId;
  const currentTemplateMappings = isImportTemplateScope ? importTemplateMappings : exportTemplateMappings;

  const normalizedImportQuery = importSearch.trim().toLowerCase();
  const filteredImportList = normalizedImportQuery
    ? importList.filter((item: ImportListItem) => [item.baseProductId, item.name, item.sku ?? "", item.description ?? ""].some(f => (f as string).toLowerCase().includes(normalizedImportQuery)))
    : importList;
  const selectedImportCount = selectedImportIds.size;
  const allVisibleSelected = filteredImportList.length > 0 && filteredImportList.every((item: ImportListItem) => selectedImportIds.has(item.baseProductId));
  const isSomeVisibleSelected = filteredImportList.some((item: ImportListItem) => selectedImportIds.has(item.baseProductId)) && !allVisibleSelected;

  if (checkingIntegration) return <SectionPanel className="p-6">Checking integration...</SectionPanel>;
  if (!isBaseConnected) return <SectionPanel className="p-6">Base.com integration required.</SectionPanel>;

  return (
    <SectionPanel className="p-6">
      <SectionHeader title="Product Import/Export" description="Import products from Base.com or export your products to Base.com" className="mb-6" />
      <Tabs defaultValue="imports">
        <TabsList className="bg-card/70">
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="imports" className="mt-6 space-y-6">
          <ImportTab
            inventories={inventories}
            loadingInventories={isFetchingInventories}
            inventoryId={inventoryId}
            setInventoryId={setInventoryId}
            handleLoadInventories={handleLoadInventories}
            handleClearInventory={handleClearInventory}
            limit={limit}
            setLimit={setLimit}
            catalogs={catalogsData}
            loadingCatalogs={loadingCatalogs}
            catalogId={catalogId}
            setCatalogId={setCatalogId}
            importTemplateId={importTemplateId}
            setImportTemplateId={setImportTemplateId}
            importTemplates={importTemplates}
            loadingImportTemplates={loadingImportTemplates}
            imageMode={imageMode}
            setImageMode={setImageMode}
            allowDuplicateSku={allowDuplicateSku}
            setAllowDuplicateSku={setAllowDuplicateSku}
            importing={importMutation.isPending}
            handleImport={handleImport}
            importSearch={importSearch}
            setImportSearch={setImportSearch}
            uniqueOnly={uniqueOnly}
            setUniqueOnly={setUniqueOnly}
            handleLoadImportList={handleLoadImportList}
            loadingImportList={loadingImportList}
            importListStats={importListStats}
            importList={importList}
            filteredImportList={filteredImportList}
            selectedImportIds={selectedImportIds}
            setSelectedImportIds={setSelectedImportIds}
            selectedImportCount={selectedImportCount}
            allVisibleSelected={allVisibleSelected}
            isSomeVisibleSelected={isSomeVisibleSelected}
            lastResult={lastResult}
          />
        </TabsContent>

        <TabsContent value="exports" className="mt-6 space-y-6">
          <ExportTab
            baseConnections={baseConnections}
            selectedBaseConnectionId={selectedBaseConnectionId}
            setSelectedBaseConnectionId={setSelectedBaseConnectionId}
            inventories={inventories}
            exportInventoryId={exportInventoryId}
            setExportInventoryId={setExportInventoryId}
            exportActiveTemplateId={exportActiveTemplateId}
            setExportActiveTemplateId={setExportActiveTemplateId}
            exportTemplates={exportTemplates}
            loadingExportTemplates={loadingExportTemplates}
            applyTemplate={applyTemplate}
            exportWarehouseId={exportWarehouseId}
            setExportWarehouseId={setExportWarehouseId}
            warehouseOptions={warehouses}
            showAllWarehouses={showAllWarehouses}
            setShowAllWarehouses={setShowAllWarehouses}
            inventoryWarehouseIds={new Set(warehouses.map((w: any) => w.id))}
            exportStockFallbackEnabled={exportStockFallbackEnabled}
            setExportStockFallbackEnabled={setExportStockFallbackEnabled}
            exportStockFallbackLoaded={true}
            allWarehouses={allWarehouses}
            warehouses={warehouses}
            imageRetryPresets={imageRetryPresets}
            setImageRetryPresets={setImageRetryPresets}
            imageRetryPresetsLoaded={true}
            handleLoadInventories={handleLoadInventories}
            loadingInventories={isFetchingInventories}
            handleLoadWarehouses={handleLoadWarehouses}
            loadingWarehouses={isFetchingWarehouses}
            handleDebugWarehouses={() => {}} // Not implemented in this turn
            loadingDebugWarehouses={false}
            includeAllWarehouses={includeAllWarehouses}
            setIncludeAllWarehouses={setIncludeAllWarehouses}
            handleSaveExportSettings={handleSaveExportSettings}
            savingExportSettings={saveExportSettingsMutation.isPending}
            debugWarehouses={debugWarehouses}
            setDebugWarehouses={setDebugWarehouses}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <div className="bg-gray-900 p-4 border border-border rounded-md">
             <div className="flex justify-between items-start gap-4 mb-4">
                <Tabs value={templateScope} onValueChange={(v: string) => setTemplateScope(v as "import" | "export")}>
                   <TabsList>
                      <TabsTrigger value="import">Import</TabsTrigger>
                      <TabsTrigger value="export">Export</TabsTrigger>
                   </TabsList>
                </Tabs>
                <div className="flex gap-2">
                   <Button variant="secondary" onClick={handleNewTemplate}>New</Button>
                   <Button onClick={handleSaveTemplate} disabled={saveImportTemplateMutation.isPending || saveExportTemplateMutation.isPending}>Save</Button>
                   <Button variant="destructive" onClick={handleDeleteTemplate} disabled={!currentActiveTemplateId}>Delete</Button>
                </div>
             </div>
             <div className="grid md:grid-cols-[220px_1fr] gap-4">
                <div className="bg-card/60 p-2 border border-border rounded-md max-h-64 overflow-auto">
                   {currentTemplates.map(t => (
                      <Button key={t.id} variant="ghost" className={`w-full justify-start text-xs mb-1 ${currentActiveTemplateId === t.id ? 'bg-emerald-500/20' : ''}`} onClick={() => applyTemplate(t, templateScope)}>
                         {t.name}
                      </Button>
                   ))}
                </div>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input value={isImportTemplateScope ? importTemplateName : exportTemplateName} onChange={e => isImportTemplateScope ? setImportTemplateName(e.target.value) : setExportTemplateName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Input value={isImportTemplateScope ? importTemplateDescription : exportTemplateDescription} onChange={e => isImportTemplateScope ? setImportTemplateDescription(e.target.value) : setExportTemplateDescription(e.target.value)} />
                      </div>
                   </div>
                   <div className="space-y-2">
                      {currentTemplateMappings.map((m, i) => (
                         <div key={i} className="flex gap-2 items-center">
                            <Input value={m.sourceKey} onChange={e => updateMapping(i, { sourceKey: e.target.value })} placeholder="Source" className="flex-1" />
                            <select className="bg-gray-900 border border-border p-2 rounded text-sm flex-1" value={m.targetField} onChange={e => updateMapping(i, { targetField: e.target.value })}>
                               <option value="">Target Field</option>
                               {PRODUCT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                            <Button variant="ghost" size="icon" onClick={() => removeMappingRow(i)}><Trash2 className="size-4" /></Button>
                         </div>
                      ))}
                      <Button variant="secondary" onClick={addMappingRow}>Add Row</Button>
                   </div>
                </div>
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </SectionPanel>
  );
}