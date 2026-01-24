"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { IntegrationConnectionBasic, IntegrationWithConnections } from "@/types";
import { ImportTab } from "@/components/products/imports/ImportTab";
import { ExportTab } from "@/components/products/imports/ExportTab";
import {
  ALL_IMAGE_KEYS,
  EXPORT_PARAMETER_DOCS,
  EXPORT_PARAMETER_KEYS,
  PRODUCT_FIELDS,
} from "@/components/products/imports/constants";
import type {
  CatalogOption,
  ImportListItem,
  ImportResponse,
  InventoryDebugRaw,
  InventoryOption,
  Template,
  TemplateMapping,
  WarehouseDebugRaw,
  WarehouseOption,
  ImageRetryPreset,
} from "@/types/product-imports";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from "@/lib/constants/image-retry-presets";

export default function ProductImportsPage() {
  const { toast } = useToast();
  // Token is now handled by the backend via integration
  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<WarehouseOption[]>([]);
  const [showAllWarehouses, setShowAllWarehouses] = useState(false);
  const [includeAllWarehouses, setIncludeAllWarehouses] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [exportInventoryId, setExportInventoryId] = useState("");
  const [exportWarehouseId, setExportWarehouseId] = useState("");
  const [exportWarehouseLoaded, setExportWarehouseLoaded] = useState(false);
  const [exportInventoryPreferenceLoaded, setExportInventoryPreferenceLoaded] =
    useState(false);
  const [debugWarehouses, setDebugWarehouses] = useState<{
    inventory?: WarehouseOption[];
    all?: WarehouseOption[];
    inventories?: InventoryOption[];
    inventoryRaw?: WarehouseDebugRaw | null;
    inventoriesRaw?: InventoryDebugRaw | null;
    allRaw?: WarehouseDebugRaw | null;
  } | null>(null);
  const [loadingDebugWarehouses, setLoadingDebugWarehouses] = useState(false);
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [limit, setLimit] = useState("all");
  const [imageMode, setImageMode] = useState<"links" | "download">("links");
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [importList, setImportList] = useState<ImportListItem[]>([]);
  const [importListStats, setImportListStats] = useState<{
    total: number;
    filtered: number;
    available?: number;
    existing: number;
    skuDuplicates?: number;
  } | null>(null);
  const [loadingImportList, setLoadingImportList] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(
    () => new Set()
  );
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const [templateScope, setTemplateScope] = useState<"import" | "export">(
    "import"
  );
  const [importTemplates, setImportTemplates] = useState<Template[]>([]);
  const [exportTemplates, setExportTemplates] = useState<Template[]>([]);
  const [loadingImportTemplates, setLoadingImportTemplates] = useState(false);
  const [loadingExportTemplates, setLoadingExportTemplates] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState("");
  const [importTemplatePreferenceLoaded, setImportTemplatePreferenceLoaded] =
    useState(false);
  const [importActiveTemplatePreferenceLoaded, setImportActiveTemplatePreferenceLoaded] =
    useState(false);
  const [exportActiveTemplatePreferenceLoaded, setExportActiveTemplatePreferenceLoaded] =
    useState(false);
  const [importActiveTemplatePreferenceId, setImportActiveTemplatePreferenceId] =
    useState<string | null>(null);
  const [exportActiveTemplatePreferenceId, setExportActiveTemplatePreferenceId] =
    useState<string | null>(null);
  const [importActiveTemplateId, setImportActiveTemplateId] = useState("");
  const [exportActiveTemplateId, setExportActiveTemplateId] = useState("");
  const [importTemplateName, setImportTemplateName] = useState("");
  const [exportTemplateName, setExportTemplateName] = useState("");
  const [importTemplateDescription, setImportTemplateDescription] = useState("");
  const [exportTemplateDescription, setExportTemplateDescription] = useState("");
  const [importTemplateMappings, setImportTemplateMappings] = useState<
    TemplateMapping[]
  >([{ sourceKey: "", targetField: "" }]);
  const [exportTemplateMappings, setExportTemplateMappings] = useState<
    TemplateMapping[]
  >([{ sourceKey: "", targetField: "" }]);
  const [exportImagesAsBase64, setExportImagesAsBase64] = useState(false);
  const [exportStockFallbackEnabled, setExportStockFallbackEnabled] =
    useState(false);
  const [exportStockFallbackLoaded, setExportStockFallbackLoaded] =
    useState(false);
  const [imageRetryPresets, setImageRetryPresets] = useState<ImageRetryPreset[]>(
    getDefaultImageRetryPresets()
  );
  const [imageRetryPresetsLoaded, setImageRetryPresetsLoaded] =
    useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [savingExportSettings, setSavingExportSettings] = useState(false);
  const [parameterKeys, setParameterKeys] = useState<string[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>(
    {}
  );
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [parameterProductId, setParameterProductId] = useState("");
  const [openKeyIndex, setOpenKeyIndex] = useState<number | null>(null);
  const [draggedMappingIndex, setDraggedMappingIndex] = useState<number | null>(
    null
  );
  const [dragOverMappingIndex, setDragOverMappingIndex] = useState<number | null>(
    null
  );
  const lastParameterProductIdRef = useRef<string | null>(null);
  const lastWarehouseInventoryIdRef = useRef<string | null>(null);
  const autoInventoriesLoadedRef = useRef(false);
  const [parameterCacheReady, setParameterCacheReady] = useState(false);

  const [checkingIntegration, setCheckingIntegration] = useState(true);
  const [isBaseConnected, setIsBaseConnected] = useState(false);
  const [baseConnections, setBaseConnections] = useState<
    IntegrationConnectionBasic[]
  >([]);
  const [selectedBaseConnectionId, setSelectedBaseConnectionId] = useState("");

  const isImportTemplateScope = templateScope === "import";
  const currentTemplates = isImportTemplateScope ? importTemplates : exportTemplates;
  const currentActiveTemplateId = isImportTemplateScope
    ? importActiveTemplateId
    : exportActiveTemplateId;
  const currentTemplateName = isImportTemplateScope
    ? importTemplateName
    : exportTemplateName;
  const currentTemplateDescription = isImportTemplateScope
    ? importTemplateDescription
    : exportTemplateDescription;
  const currentTemplateMappings = isImportTemplateScope
    ? importTemplateMappings
    : exportTemplateMappings;
  const currentLoadingTemplates = isImportTemplateScope
    ? loadingImportTemplates
    : loadingExportTemplates;
  const exportParameterValues = EXPORT_PARAMETER_DOCS.reduce<Record<string, string>>(
    (acc, entry) => {
      acc[entry.key] = entry.description;
      return acc;
    },
    {}
  );
  const currentParameterValues = isImportTemplateScope
    ? parameterValues
    : exportParameterValues;
  const currentParameterKeys = isImportTemplateScope
    ? Array.from(new Set([...parameterKeys, ...ALL_IMAGE_KEYS]))
    : EXPORT_PARAMETER_KEYS;
  const inventoryWarehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));
  const warehouseOptions =
    showAllWarehouses && allWarehouses.length > 0 ? allWarehouses : warehouses;
  const normalizeWarehouseId = (value: string) => value.trim().toLowerCase();
  const inferTypedWarehouseId = (value: string) => {
    const match = value.match(/([a-z]+)[_-]?(\d+)/i);
    if (!match?.[1] || !match?.[2]) return null;
    return { typed: `${match[1].toLowerCase()}_${match[2]}`, numeric: match[2] };
  };
  const acceptedWarehouseIds = new Set<string>();
  const warehouseAliases: Record<string, string> = {};
  for (const warehouse of warehouses) {
    const typed = warehouse.typedId ?? inferTypedWarehouseId(warehouse.id)?.typed;
    if (typed) {
      acceptedWarehouseIds.add(normalizeWarehouseId(typed));
      const numeric = inferTypedWarehouseId(typed)?.numeric;
      if (numeric) {
        warehouseAliases[numeric] = typed;
      }
    } else if (warehouse.id) {
      acceptedWarehouseIds.add(normalizeWarehouseId(warehouse.id));
    }
  }
  const stockMappingEntries = currentTemplateMappings
    .map((mapping) => mapping.sourceKey.trim())
    .filter((key) => key.toLowerCase().startsWith("stock"))
    .map((key) => {
      const suffix = key.replace(/^stock[._-]?/i, "").trim();
      return { key, suffix, normalized: normalizeWarehouseId(suffix) };
    });
  const invalidStockMappings =
    acceptedWarehouseIds.size > 0
      ? stockMappingEntries.filter(
          ({ suffix, normalized }) => suffix && !acceptedWarehouseIds.has(normalized)
        )
      : [];
  const hasStockMappingMismatch =
    !isImportTemplateScope && invalidStockMappings.length > 0;
  const invalidStockMappingLabels = invalidStockMappings.map(({ key }) => key);
  const stockMappingSuggestions = invalidStockMappings
    .map(({ suffix }) => {
      const numeric = suffix.match(/(\d+)/)?.[1];
      const typed = numeric ? warehouseAliases[numeric] : null;
      return typed ? `stock.${typed}` : null;
    })
    .filter((value): value is string => Boolean(value));

  const applyTemplate = useCallback((template: Template, scope: "import" | "export") => {
    const nextMappings =
      template.mappings && template.mappings.length > 0
        ? template.mappings
        : [{ sourceKey: "", targetField: "" }];
    if (scope === "import") {
      setImportActiveTemplateId(template.id);
      setImportTemplateName(template.name);
      setImportTemplateDescription(template.description ?? "");
      setImportTemplateMappings(nextMappings);
      return;
    }
    setExportActiveTemplateId(template.id);
    setExportTemplateName(template.name);
    setExportTemplateDescription(template.description ?? "");
    setExportTemplateMappings(nextMappings);
    setExportImagesAsBase64(template.exportImagesAsBase64 ?? false);
  }, []);

  useEffect(() => {
    const checkIntegration = async () => {
      try {
        const res = await fetch("/api/integrations/with-connections");
        if (res.ok) {
          const data = (await res.json()) as IntegrationWithConnections[];
          const baseIntegration = data.find((i) => i.slug === "baselinker");
          // Check if there is at least one connection with a token (though frontend doesn't see token, it sees connections)
          // The backend route /api/integrations/with-connections returns connections.
          // We can check if any connection exists.
          const connections = baseIntegration?.connections ?? [];
          setBaseConnections(connections);
          if (connections.length > 0) {
            setIsBaseConnected(true);
            setSelectedBaseConnectionId((prev) => prev || connections[0]?.id || "");
          }
        }
      } catch (error) {
        console.error("Failed to check integration status", error);
      } finally {
        setCheckingIntegration(false);
      }
    };
    void checkIntegration();
  }, []);

  // Load saved default connection preference
  useEffect(() => {
    if (!isBaseConnected || baseConnections.length === 0) return;
    if (selectedBaseConnectionId) return; // Already set

    const loadDefaultConnection = async () => {
      try {
        const res = await fetch("/api/products/exports/base/default-connection");
        if (!res.ok) return;
        const payload = (await res.json()) as { connectionId?: string | null };
        if (payload.connectionId) {
          // Check if the saved connection still exists in current connections
          const connectionExists = baseConnections.some(
            (conn) => conn.id === payload.connectionId
          );
          if (connectionExists) {
            setSelectedBaseConnectionId(payload.connectionId);
          }
        }
      } catch (error) {
        console.error("Failed to load default connection:", error);
      }
    };
    void loadDefaultConnection();
  }, [isBaseConnected, baseConnections, selectedBaseConnectionId]);

  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const res = await fetch("/api/catalogs");
        const payload = (await res.json()) as CatalogOption[];
        if (!res.ok) return;
        setCatalogs(payload);
        const defaultCatalog = payload.find((catalog) => catalog.isDefault);
        if (defaultCatalog) {
          setCatalogId(defaultCatalog.id);
        }
      } catch (error) {
        console.error("Failed to load catalogs", error);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    void loadCatalogs();
  }, []);

  useEffect(() => {
    const loadImportTemplates = async () => {
      setLoadingImportTemplates(true);
      try {
        const res = await fetch("/api/products/import-templates");
        const payload = (await res.json()) as Template[];
        if (!res.ok) return;
        setImportTemplates(payload);
      } catch (error) {
        console.error("Failed to load import templates", error);
      } finally {
        setLoadingImportTemplates(false);
      }
    };
    void loadImportTemplates();
  }, []);

  useEffect(() => {
    const loadExportTemplates = async () => {
      setLoadingExportTemplates(true);
      try {
        const res = await fetch("/api/products/export-templates");
        const payload = (await res.json()) as Template[];
        if (!res.ok) return;
        setExportTemplates(payload);
      } catch (error) {
        console.error("Failed to load export templates", error);
      } finally {
        setLoadingExportTemplates(false);
      }
    };
    void loadExportTemplates();
  }, []);

  const handleSelectTemplate = useCallback(
    (id: string) => {
      const template = currentTemplates.find((item) => item.id === id);
      if (!template) return;
      applyTemplate(template, isImportTemplateScope ? "import" : "export");
    },
    [applyTemplate, currentTemplates, isImportTemplateScope]
  );

  useEffect(() => {
    const loadTemplatePreference = async () => {
      try {
        const res = await fetch("/api/products/imports/base/last-template");
        const payload = (await res.json()) as { templateId?: string | null };
        if (!res.ok) return;
        if (payload.templateId) {
          setImportTemplateId(payload.templateId);
        }
      } catch (error) {
        console.error("Failed to load import template preference", error);
      } finally {
        setImportTemplatePreferenceLoaded(true);
      }
    };
    void loadTemplatePreference();
  }, []);

  useEffect(() => {
    const loadActiveTemplatePreference = async () => {
      try {
        const res = await fetch("/api/products/imports/base/active-template");
        const payload = (await res.json()) as { templateId?: string | null };
        if (!res.ok) return;
        setImportActiveTemplatePreferenceId(payload.templateId ?? null);
      } catch (error) {
        console.error("Failed to load active import template preference", error);
      } finally {
        setImportActiveTemplatePreferenceLoaded(true);
      }
    };
    void loadActiveTemplatePreference();
  }, []);

  useEffect(() => {
    const loadExportActiveTemplate = async () => {
      try {
        const res = await fetch("/api/products/exports/base/active-template");
        const payload = (await res.json()) as { templateId?: string | null };
        if (!res.ok) return;
        setExportActiveTemplatePreferenceId(payload.templateId ?? null);
      } catch (error) {
        console.error("Failed to load export template preference", error);
      } finally {
        setExportActiveTemplatePreferenceLoaded(true);
      }
    };
    void loadExportActiveTemplate();
  }, []);

  useEffect(() => {
    const loadExportDefaultInventory = async () => {
      try {
        const res = await fetch("/api/products/exports/base/default-inventory");
        const payload = (await res.json()) as { inventoryId?: string | null };
        if (!res.ok) return;
        if (payload.inventoryId) {
          setExportInventoryId(payload.inventoryId);
        }
      } catch (error) {
        console.error("Failed to load export default inventory", error);
      } finally {
        setExportInventoryPreferenceLoaded(true);
      }
    };
    void loadExportDefaultInventory();
  }, []);

  useEffect(() => {
    const loadExportStockFallback = async () => {
      try {
        const res = await fetch("/api/products/exports/base/stock-fallback");
        const payload = (await res.json()) as { enabled?: boolean };
        if (!res.ok) return;
        setExportStockFallbackEnabled(Boolean(payload.enabled));
      } catch (error) {
        console.error("Failed to load export stock fallback setting", error);
      } finally {
        setExportStockFallbackLoaded(true);
      }
    };
    void loadExportStockFallback();
  }, []);

  useEffect(() => {
    const loadImageRetryPresets = async () => {
      try {
        const res = await fetch(
          "/api/products/exports/base/image-retry-presets"
        );
        const payload = (await res.json()) as { presets?: ImageRetryPreset[] };
        if (!res.ok) return;
        if (payload.presets) {
          setImageRetryPresets(normalizeImageRetryPresets(payload.presets));
        }
      } catch (error) {
        console.error("Failed to load image retry presets", error);
      } finally {
        setImageRetryPresetsLoaded(true);
      }
    };
    void loadImageRetryPresets();
  }, []);

  useEffect(() => {
    if (!exportInventoryId) {
      setExportWarehouseId("");
      setExportWarehouseLoaded(true);
      return;
    }
    setExportWarehouseLoaded(false);
    const loadExportWarehouse = async () => {
      try {
        const res = await fetch(
          `/api/products/imports/base/export-warehouse?inventoryId=${encodeURIComponent(
            exportInventoryId
          )}`
        );
        const payload = (await res.json()) as { warehouseId?: string | null };
        if (!res.ok) return;
        setExportWarehouseId(payload.warehouseId ?? "");
      } catch (error) {
        console.error("Failed to load export warehouse preference", error);
      } finally {
        setExportWarehouseLoaded(true);
      }
    };
    void loadExportWarehouse();
  }, [exportInventoryId]);

  useEffect(() => {
    if (!importTemplatePreferenceLoaded) return;
    const saveTemplatePreference = async () => {
      try {
        await fetch("/api/products/imports/base/last-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: importTemplateId || null,
          }),
        });
      } catch (error) {
        console.error("Failed to save import template preference", error);
      }
    };
    void saveTemplatePreference();
  }, [importTemplateId, importTemplatePreferenceLoaded]);

  useEffect(() => {
    if (!importActiveTemplatePreferenceLoaded) return;
    const saveActiveTemplatePreference = async () => {
      try {
        await fetch("/api/products/imports/base/active-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: importActiveTemplateId || null,
          }),
        });
      } catch (error) {
        console.error("Failed to save active import template preference", error);
      }
    };
    void saveActiveTemplatePreference();
  }, [importActiveTemplateId, importActiveTemplatePreferenceLoaded]);

  useEffect(() => {
    if (!exportInventoryPreferenceLoaded) return;
    if (!inventories.length) return;
    if (exportInventoryId && inventories.some((inv) => inv.id === exportInventoryId)) {
      return;
    }
    setExportInventoryId(inventories[0]?.id ?? "");
  }, [exportInventoryPreferenceLoaded, inventories, exportInventoryId]);

  useEffect(() => {
    if (!importTemplatePreferenceLoaded) return;
    if (loadingImportTemplates) return;
    if (!importTemplateId) return;
    const exists = importTemplates.some(
      (template) => template.id === importTemplateId
    );
    if (!exists) {
      setImportTemplateId("");
    }
  }, [
    importTemplateId,
    importTemplates,
    loadingImportTemplates,
    importTemplatePreferenceLoaded,
  ]);

  useEffect(() => {
    if (!importTemplatePreferenceLoaded) return;
    if (loadingImportTemplates) return;
    if (!importTemplateId) return;
    if (importActiveTemplateId) return;
    if (importActiveTemplatePreferenceId) return;
    const preferred = importTemplates.find(
      (template) => template.id === importTemplateId
    );
    if (!preferred) return;
    applyTemplate(preferred, "import");
  }, [
    importTemplatePreferenceLoaded,
    loadingImportTemplates,
    importTemplateId,
    importActiveTemplateId,
    importActiveTemplatePreferenceId,
    importTemplates,
    applyTemplate,
  ]);

  useEffect(() => {
    if (!importActiveTemplatePreferenceLoaded) return;
    if (loadingImportTemplates) return;
    if (importActiveTemplateId) return;
    if (!importActiveTemplatePreferenceId) return;
    const preferred = importTemplates.find(
      (template) => template.id === importActiveTemplatePreferenceId
    );
    if (!preferred) return;
    applyTemplate(preferred, "import");
  }, [
    importActiveTemplatePreferenceLoaded,
    importActiveTemplatePreferenceId,
    loadingImportTemplates,
    importActiveTemplateId,
    importTemplates,
    applyTemplate,
  ]);

  useEffect(() => {
    if (!exportActiveTemplatePreferenceLoaded) return;
    if (loadingExportTemplates) return;
    if (exportActiveTemplateId) return;
    if (!exportActiveTemplatePreferenceId) return;
    const preferred = exportTemplates.find(
      (template) => template.id === exportActiveTemplatePreferenceId
    );
    if (!preferred) return;
    applyTemplate(preferred, "export");
  }, [
    exportActiveTemplatePreferenceLoaded,
    exportActiveTemplatePreferenceId,
    loadingExportTemplates,
    exportActiveTemplateId,
    exportTemplates,
    applyTemplate,
  ]);

  useEffect(() => {
    const loadSampleProduct = async () => {
      try {
        const res = await fetch("/api/products/imports/base/sample-product");
        const payload = (await res.json()) as {
          productId?: string | null;
          inventoryId?: string | null;
        };
        if (!res.ok) return;
        if (payload.productId) {
          setParameterProductId(payload.productId);
        }
        if (payload.inventoryId) {
          setInventoryId(payload.inventoryId);
        }
      } catch (error) {
        console.error("Failed to load sample product ID", error);
      }
    };
    void loadSampleProduct();
  }, []);

  useEffect(() => {
    const loadParameterCache = async () => {
      try {
        const res = await fetch("/api/products/imports/base/parameters");
        const payload = (await res.json()) as {
          keys?: string[];
          values?: Record<string, string>;
          productId?: string | null;
        };
        if (!res.ok) return;
        if (payload.productId) {
          lastParameterProductIdRef.current = payload.productId;
        }
        if (payload.keys && payload.values) {
          setParameterKeys(payload.keys);
          setParameterValues(payload.values);
        }
      } catch (error) {
        console.error("Failed to load cached parameters", error);
      } finally {
        setParameterCacheReady(true);
      }
    };
    void loadParameterCache();
  }, []);

  useEffect(() => {
    if (!parameterCacheReady) return;
    if (lastParameterProductIdRef.current === null) {
      lastParameterProductIdRef.current = parameterProductId;
      return;
    }
    if (lastParameterProductIdRef.current === parameterProductId) return;
    lastParameterProductIdRef.current = parameterProductId;
    if (parameterKeys.length === 0 && Object.keys(parameterValues).length === 0) {
      return;
    }
    setParameterKeys([]);
    setParameterValues({});
    const clearCache = async () => {
      try {
        await fetch("/api/products/imports/base/parameters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryId: "",
            productId: "",
            clearOnly: true,
          }),
        });
      } catch (error) {
        console.error("Failed to clear cached parameters", error);
      }
    };
    void clearCache();
  }, [
    parameterProductId,
    parameterKeys.length,
    parameterValues,
    parameterCacheReady,
  ]);

  useEffect(() => {
    if (!inventoryId) return;
    const savePreference = async () => {
      try {
        await fetch("/api/products/imports/base/sample-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryId,
            productId: parameterProductId.trim() || undefined,
            saveOnly: true,
          }),
        });
      } catch (error) {
        console.error("Failed to save sample inventory", error);
      }
    };
    void savePreference();
  }, [inventoryId, parameterProductId]);

  const handleNewTemplate = () => {
    if (isImportTemplateScope) {
      setImportActiveTemplateId("");
      setImportTemplateName("");
      setImportTemplateDescription("");
      setImportTemplateMappings([{ sourceKey: "", targetField: "" }]);
      return;
    }
    setExportActiveTemplateId("");
    setExportTemplateName("");
    setExportTemplateDescription("");
    setExportTemplateMappings([{ sourceKey: "", targetField: "" }]);
    setExportImagesAsBase64(false);
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplateName.trim()) {
      toast("Template name is required.", { variant: "error" });
      return;
    }

    const incompleteMappings = currentTemplateMappings.some(
      (m) =>
        (m.sourceKey.trim() && !m.targetField.trim()) ||
        (!m.sourceKey.trim() && m.targetField.trim())
    );

    if (incompleteMappings) {
      toast("Please complete all mapping rows or remove empty ones.", {
        variant: "error",
      });
      return;
    }

    const cleanedMappings = currentTemplateMappings
      .map((mapping) => ({
        sourceKey: mapping.sourceKey.trim(),
        targetField: mapping.targetField.trim(),
      }))
      .filter((mapping) => mapping.sourceKey && mapping.targetField);

    const templateEndpoint = isImportTemplateScope
      ? "/api/products/import-templates"
      : "/api/products/export-templates";
    const activeTemplateId = currentActiveTemplateId;

    setSavingTemplate(true);
    try {
      const res = await fetch(
        activeTemplateId ? `${templateEndpoint}/${activeTemplateId}` : templateEndpoint,
        {
          method: activeTemplateId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentTemplateName.trim(),
            description: currentTemplateDescription.trim() || undefined,
            mappings: cleanedMappings,
            ...(isImportTemplateScope ? {} : { exportImagesAsBase64 }),
          }),
        }
      );
      const payload = (await res.json()) as Template & { error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to save template.", {
          variant: "error",
        });
        return;
      }
      if (isImportTemplateScope) {
        setImportTemplates((prev) => {
          const next = prev.filter((item) => item.id !== payload.id);
          return [...next, payload];
        });
      } else {
        setExportTemplates((prev) => {
          const next = prev.filter((item) => item.id !== payload.id);
          return [...next, payload];
        });
      }
      applyTemplate(payload, isImportTemplateScope ? "import" : "export");
      try {
        const refreshRes = await fetch(templateEndpoint);
        if (refreshRes.ok) {
          const refreshed = (await refreshRes.json()) as Template[];
          if (isImportTemplateScope) {
            setImportTemplates(refreshed);
          } else {
            setExportTemplates(refreshed);
          }
        }
      } catch (error) {
        console.error("Failed to refresh templates", error);
      }
      toast("Template saved.", { variant: "success" });
    } catch (_error) {
      toast("Failed to save template.", { variant: "error" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadParameters = async () => {
    if (parameterKeys.length > 0) {
      setParameterKeys([]);
      setParameterValues({});
      try {
        await fetch("/api/products/imports/base/parameters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryId: "",
            productId: "",
            clearOnly: true,
          }),
        });
        toast("Parameters cleared.", { variant: "success" });
      } catch (_error) {
        toast("Failed to clear parameters.", { variant: "error" });
      }
      return;
    }
    if (!inventoryId) {
      toast("Select an inventory first.", { variant: "error" });
      return;
    }
    if (!parameterProductId.trim()) {
      toast("Enter a product ID to load parameters.", { variant: "error" });
      return;
    }
    setLoadingParameters(true);
    try {
      const res = await fetch("/api/products/imports/base/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          productId: parameterProductId.trim(),
        }),
      });
      const payload = (await res.json()) as {
        keys?: string[];
        values?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load parameters.", {
          variant: "error",
        });
        return;
      }
      setParameterKeys(payload.keys ?? []);
      setParameterValues(payload.values ?? {});
      toast(`Loaded ${payload.keys?.length ?? 0} keys.`, {
        variant: "success",
      });
    } catch (_error) {
      toast("Failed to load parameters.", { variant: "error" });
    } finally {
      setLoadingParameters(false);
    }
  };

  const handleClearInventory = async () => {
    setInventoryId("");
    setParameterKeys([]);
    setParameterValues({});
    try {
      await fetch("/api/products/imports/base/sample-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: "",
          saveOnly: true,
        }),
      });
      await fetch("/api/products/imports/base/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: "",
          productId: "",
          clearOnly: true,
        }),
      });
      toast("Inventory cleared.", { variant: "success" });
    } catch (_error) {
      toast("Failed to clear inventory.", { variant: "error" });
    }
  };

  const handleUseExampleProduct = async () => {
    if (!inventoryId) {
      toast("Select an inventory first.", { variant: "error" });
      return;
    }
    setLoadingParameters(true);
    try {
      const res = await fetch("/api/products/imports/base/sample-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId }),
      });
      const payload = (await res.json()) as { productId?: string; error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to load sample product.", {
          variant: "error",
        });
        return;
      }
      if (payload.productId) {
        setParameterProductId(payload.productId);
        toast("Sample product loaded.", { variant: "success" });
      }
    } catch (_error) {
      toast("Failed to load sample product.", { variant: "error" });
    } finally {
      setLoadingParameters(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentActiveTemplateId) return;
    setDeletingTemplate(true);
    try {
      const templateEndpoint = isImportTemplateScope
        ? "/api/products/import-templates"
        : "/api/products/export-templates";
      const res = await fetch(
        `${templateEndpoint}/${currentActiveTemplateId}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to delete template.", {
          variant: "error",
        });
        return;
      }
      if (isImportTemplateScope) {
        setImportTemplates((prev) =>
          prev.filter((item) => item.id !== currentActiveTemplateId)
        );
        if (importTemplateId === currentActiveTemplateId) {
          setImportTemplateId("");
        }
      } else {
        setExportTemplates((prev) =>
          prev.filter((item) => item.id !== currentActiveTemplateId)
        );
      }
      handleNewTemplate();
      toast("Template deleted.", { variant: "success" });
    } catch (_error) {
      toast("Failed to delete template.", { variant: "error" });
    } finally {
      setDeletingTemplate(false);
    }
  };

  const updateTemplateMappings = useCallback(
    (updater: (prev: TemplateMapping[]) => TemplateMapping[]) => {
      if (isImportTemplateScope) {
        setImportTemplateMappings(updater);
      } else {
        setExportTemplateMappings(updater);
      }
    },
    [isImportTemplateScope]
  );

  const updateMapping = (index: number, patch: Partial<TemplateMapping>) => {
    updateTemplateMappings((prev) =>
      prev.map((mapping, i) =>
        i === index ? { ...mapping, ...patch } : mapping
      )
    );
  };

  const addMappingRow = () => {
    updateTemplateMappings((prev) => [
      ...prev,
      { sourceKey: "", targetField: "" },
    ]);
  };

  const removeMappingRow = (index: number) => {
    updateTemplateMappings((prev) =>
      prev.length === 1
        ? [{ sourceKey: "", targetField: "" }]
        : prev.filter((_, i) => i !== index)
    );
  };

  const moveMappingRow = (fromIndex: number, toIndex: number) => {
    updateTemplateMappings((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (moved) {
        next.splice(toIndex, 0, moved);
      }
      return next;
    });
    setOpenKeyIndex(null);
  };

  const handleMappingDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.dataTransfer.setData("mappingIndex", String(index));
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
    setDraggedMappingIndex(index);
    setOpenKeyIndex(null);
    const target = event.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleMappingDragEnd = (event: React.DragEvent<HTMLButtonElement>) => {
    const target = event.currentTarget as HTMLElement;
    target.style.opacity = "1";
    setDraggedMappingIndex(null);
    setDragOverMappingIndex(null);
  };

  const handleMappingDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggedMappingIndex === null || draggedMappingIndex === index) {
      setDragOverMappingIndex(null);
      return;
    }
    setDragOverMappingIndex(index);
  };

  const handleMappingDragLeave = () => {
    setDragOverMappingIndex(null);
  };

  const handleMappingDrop = (
    event: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    event.preventDefault();
    const rawIndex =
      event.dataTransfer.getData("mappingIndex") ||
      event.dataTransfer.getData("text/plain");
    const fromIndex = Number.parseInt(rawIndex, 10);
    const resolvedIndex = Number.isNaN(fromIndex)
      ? draggedMappingIndex
      : fromIndex;
    if (resolvedIndex === null) return;
    moveMappingRow(resolvedIndex, index);
    setDraggedMappingIndex(null);
    setDragOverMappingIndex(null);
  };

  const filterKeys = (query: string) => {
    const combined = currentParameterKeys;
    if (!query) return combined;
    const lowered = query.toLowerCase();
    return combined.filter((key) => key.toLowerCase().includes(lowered));
  };

  const handleLoadInventories = useCallback(async () => {
    if (!isBaseConnected) {
      toast("Please connect Base integration first.", { variant: "error" });
      return;
    }
    setLoadingInventories(true);
    try {
      const body: Record<string, unknown> = { action: "inventories" };
      if (selectedBaseConnectionId) {
        body.connectionId = selectedBaseConnectionId;
      }
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        inventories?: InventoryOption[];
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load inventories.", {
          variant: "error",
        });
        return;
      }
      const nextInventories = payload.inventories ?? [];
      setInventories(nextInventories);
      if (nextInventories.length) {
        const hasCurrent = inventoryId
          ? nextInventories.some((inv) => inv.id === inventoryId)
          : false;
        if (!hasCurrent) {
          setInventoryId(nextInventories[0]?.id ?? "");
        }
        if (exportInventoryPreferenceLoaded) {
          const hasExportCurrent = exportInventoryId
            ? nextInventories.some((inv) => inv.id === exportInventoryId)
            : false;
          if (!hasExportCurrent) {
            setExportInventoryId(nextInventories[0]?.id ?? "");
          }
        }
      }
    } catch (_error) {
      toast("Failed to load inventories.", { variant: "error" });
    } finally {
      setLoadingInventories(false);
    }
  }, [
    exportInventoryId,
    exportInventoryPreferenceLoaded,
    inventoryId,
    isBaseConnected,
    selectedBaseConnectionId,
    toast,
  ]);

  useEffect(() => {
    if (checkingIntegration) return;
    if (!isBaseConnected) return;
    if (autoInventoriesLoadedRef.current) return;
    autoInventoriesLoadedRef.current = true;
    void handleLoadInventories();
  }, [checkingIntegration, handleLoadInventories, isBaseConnected]);

  const handleLoadWarehouses = useCallback(async () => {
    if (!isBaseConnected) {
      toast("Please connect Base integration first.", { variant: "error" });
      return;
    }
    if (!exportInventoryId) {
      toast("Select an inventory before loading warehouses.", { variant: "error" });
      return;
    }
    setLoadingWarehouses(true);
    try {
      const body: Record<string, unknown> = {
        action: "warehouses",
        inventoryId: exportInventoryId,
        includeAllWarehouses,
      };
      if (selectedBaseConnectionId) {
        body.connectionId = selectedBaseConnectionId;
      }
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        warehouses?: WarehouseOption[];
        allWarehouses?: WarehouseOption[];
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load warehouses.", {
          variant: "error",
        });
        return;
      }
      const nextWarehouses = payload.warehouses ?? [];
      const nextAllWarehouses = payload.allWarehouses ?? [];
      setWarehouses(nextWarehouses);
      setAllWarehouses(nextAllWarehouses);
      if (nextAllWarehouses.length === 0) {
        setShowAllWarehouses(false);
      }
      // Keep the saved warehouse selection; do not auto-pick a default.
    } catch (_error) {
      toast("Failed to load warehouses.", { variant: "error" });
    } finally {
      setLoadingWarehouses(false);
    }
  }, [
    includeAllWarehouses,
    isBaseConnected,
    exportInventoryId,
    selectedBaseConnectionId,
    toast,
  ]);

  const handleDebugWarehouses = async () => {
    if (!isBaseConnected) {
      toast("Please connect Base integration first.", { variant: "error" });
      return;
    }
    if (!exportInventoryId) {
      toast("Select an inventory before debugging warehouses.", {
        variant: "error",
      });
      return;
    }
    setLoadingDebugWarehouses(true);
    try {
      const body: Record<string, unknown> = {
        action: "warehouses_debug",
        inventoryId: exportInventoryId,
        includeAllWarehouses,
      };
      if (selectedBaseConnectionId) {
        body.connectionId = selectedBaseConnectionId;
      }
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        warehouses?: WarehouseOption[];
        allWarehouses?: WarehouseOption[];
        inventories?: InventoryOption[];
        raw?: {
          inventory?: WarehouseDebugRaw | null;
          inventories?: InventoryDebugRaw | null;
          all?: WarehouseDebugRaw | null;
        };
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to debug warehouses.", {
          variant: "error",
        });
        return;
      }
      setDebugWarehouses({
        inventory: payload.warehouses ?? [],
        all: payload.allWarehouses ?? [],
        inventories: payload.inventories ?? [],
        inventoryRaw: payload.raw?.inventory ?? null,
        inventoriesRaw: payload.raw?.inventories ?? null,
        allRaw: payload.raw?.all ?? null,
      });
      if (payload.error) {
        toast(payload.error, { variant: "error" });
      }
    } catch (_error) {
      toast("Failed to debug warehouses.", { variant: "error" });
    } finally {
      setLoadingDebugWarehouses(false);
    }
  };

  useEffect(() => {
    if (!isBaseConnected || !exportInventoryId) return;
    if (!exportWarehouseLoaded) return;
    if (lastWarehouseInventoryIdRef.current === exportInventoryId) return;
    lastWarehouseInventoryIdRef.current = exportInventoryId;
    void handleLoadWarehouses();
  }, [exportInventoryId, isBaseConnected, exportWarehouseLoaded, handleLoadWarehouses]);

  useEffect(() => {
    if (includeAllWarehouses) return;
    setShowAllWarehouses(false);
  }, [includeAllWarehouses]);

  const handleSaveExportSettings = async () => {
    setSavingExportSettings(true);
    try {
      const requests: Promise<Response>[] = [
        fetch("/api/products/exports/base/active-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: exportActiveTemplateId || null,
          }),
        }),
        fetch("/api/products/exports/base/default-inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryId: exportInventoryId || null,
          }),
        }),
        fetch("/api/products/exports/base/default-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: selectedBaseConnectionId || null,
          }),
        }),
        fetch("/api/products/exports/base/stock-fallback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: exportStockFallbackEnabled,
          }),
        }),
        fetch("/api/products/exports/base/image-retry-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presets: imageRetryPresets,
          }),
        }),
      ];
      if (exportInventoryId) {
        requests.push(
          fetch("/api/products/imports/base/export-warehouse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              warehouseId: exportWarehouseId || null,
              inventoryId: exportInventoryId,
            }),
          })
        );
      }
      const responses = await Promise.all(requests);
      const failed = responses.find((res) => !res.ok);
      if (failed) {
        toast("Failed to save export settings.", { variant: "error" });
        return;
      }
      toast("Export settings saved.", { variant: "success" });
    } catch (_error) {
      toast("Failed to save export settings.", { variant: "error" });
    } finally {
      setSavingExportSettings(false);
    }
  };

  const handleImport = async () => {
    if (!inventoryId) {
      toast("Select an inventory before importing.", { variant: "error" });
      return;
    }
    if (!catalogId) {
      toast("Select a catalog before importing.", { variant: "error" });
      return;
    }
    if (importList.length > 0 && selectedImportIds.size === 0) {
      toast("Select at least one product to import.", { variant: "error" });
      return;
    }
    const parsedLimit = limit === "all" ? undefined : Number(limit);
    const selectedIds =
      importList.length > 0 ? Array.from(selectedImportIds) : [];
    setImporting(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          inventoryId,
          catalogId,
          templateId: importTemplateId || undefined,
          limit: parsedLimit,
          imageMode,
          uniqueOnly,
          allowDuplicateSku,
          selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
        }),
      });
      const payload = (await res.json()) as ImportResponse & {
        error?: string;
        skipped?: number;
      };
      if (!res.ok) {
        toast(payload.error || "Import failed.", { variant: "error" });
        return;
      }
      setLastResult(payload);
      const skippedMsg = payload.skipped ? `, ${payload.skipped} skipped (duplicate SKU)` : "";
      toast(`Imported ${payload.imported} product(s)${skippedMsg}.`, {
        variant: "success",
      });
    } catch (_error) {
      toast("Import failed.", { variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  const handleLoadImportList = async () => {
    if (!inventoryId) {
      toast("Select an inventory before loading the list.", {
        variant: "error",
      });
      return;
    }
    const parsedLimit = limit === "all" ? undefined : Number(limit);
    setLoadingImportList(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          inventoryId,
          limit: parsedLimit,
          uniqueOnly,
        }),
      });
      const payload = (await res.json()) as {
        products?: ImportListItem[];
        total?: number;
        filtered?: number;
        available?: number;
        existing?: number;
        skuDuplicates?: number;
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load import list.", {
          variant: "error",
        });
        return;
      }
      setImportList(payload.products ?? []);
      setSelectedImportIds(
        new Set(
          (payload.products ?? [])
            .map((item) => item.baseProductId)
            .filter((id): id is string => Boolean(id))
        )
      );
      setImportListStats(
        payload.total !== undefined
          ? {
              total: payload.total ?? 0,
              filtered: payload.filtered ?? 0,
              available: payload.available ?? payload.filtered ?? 0,
              existing: payload.existing ?? 0,
              skuDuplicates: payload.skuDuplicates ?? 0,
            }
          : null
      );
    } catch (_error) {
      toast("Failed to load import list.", { variant: "error" });
    } finally {
      setLoadingImportList(false);
    }
  };

  const normalizedImportQuery = importSearch.trim().toLowerCase();
  const filteredImportList = normalizedImportQuery
    ? importList.filter((item) => {
        const fields = [
          item.baseProductId,
          item.name,
          item.sku ?? "",
          item.description ?? "",
        ];
        return fields.some((field) =>
          field.toLowerCase().includes(normalizedImportQuery)
        );
      })
    : importList;
  const selectedImportCount = selectedImportIds.size;
  const allVisibleSelected =
    filteredImportList.length > 0 &&
    filteredImportList.every((item) => selectedImportIds.has(item.baseProductId));
  const isSomeVisibleSelected =
    filteredImportList.some((item) => selectedImportIds.has(item.baseProductId)) &&
    !allVisibleSelected;

  if (checkingIntegration) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-950 p-6 shadow-lg">
        <p className="text-gray-400">Checking integration status...</p>
      </div>
    );
  }

  if (!isBaseConnected) {
    return (
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-white">Product Import/Export</h1>
        <div className="rounded-md border border-yellow-900/50 bg-yellow-900/20 p-4">
          <h2 className="text-lg font-semibold text-yellow-200">
            Base.com Integration Required
          </h2>
          <p className="mt-2 text-sm text-yellow-100/80">
            To import products, you must first connect the Base.com integration.
          </p>
          <div className="mt-4">
            <Link href="/admin/integrations">
              <Button variant="secondary">Go to Integrations</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Product Import/Export</h1>
          <p className="mt-1 text-sm text-gray-400">
            Import products from Base.com or export your products to Base.com
            using templates for field mapping.
          </p>
        </div>
        <Link
          href="/admin/import"
          className="text-sm font-semibold text-gray-300 hover:text-white"
        >
          CSV Import
        </Link>
      </div>

      <Tabs defaultValue="imports">
        <TabsList className="border border-gray-800 bg-gray-900/70">
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="imports" className="mt-6 space-y-6">
          <ImportTab
            inventories={inventories}
            loadingInventories={loadingInventories}
            inventoryId={inventoryId}
            setInventoryId={setInventoryId}
            handleLoadInventories={handleLoadInventories}
            handleClearInventory={handleClearInventory}
            limit={limit}
            setLimit={setLimit}
            catalogs={catalogs}
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
            importing={importing}
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
            warehouseOptions={warehouseOptions}
            showAllWarehouses={showAllWarehouses}
            setShowAllWarehouses={setShowAllWarehouses}
            inventoryWarehouseIds={inventoryWarehouseIds}
            exportStockFallbackEnabled={exportStockFallbackEnabled}
            setExportStockFallbackEnabled={setExportStockFallbackEnabled}
            exportStockFallbackLoaded={exportStockFallbackLoaded}
            allWarehouses={allWarehouses}
            warehouses={warehouses}
            imageRetryPresets={imageRetryPresets}
            setImageRetryPresets={setImageRetryPresets}
            imageRetryPresetsLoaded={imageRetryPresetsLoaded}
            handleLoadInventories={handleLoadInventories}
            loadingInventories={loadingInventories}
            handleLoadWarehouses={handleLoadWarehouses}
            loadingWarehouses={loadingWarehouses}
            handleDebugWarehouses={handleDebugWarehouses}
            loadingDebugWarehouses={loadingDebugWarehouses}
            includeAllWarehouses={includeAllWarehouses}
            setIncludeAllWarehouses={setIncludeAllWarehouses}
            handleSaveExportSettings={handleSaveExportSettings}
            savingExportSettings={savingExportSettings}
            debugWarehouses={debugWarehouses}
            setDebugWarehouses={setDebugWarehouses}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Template type</Label>
                  <Tabs
                    value={templateScope}
                    onValueChange={(value) =>
                      setTemplateScope(value === "export" ? "export" : "import")
                    }
                  >
                    <TabsList className="border border-gray-800 bg-gray-950/60">
                      <TabsTrigger value="import">Import templates</TabsTrigger>
                      <TabsTrigger value="export">Export templates</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {isImportTemplateScope ? (
                  <div className="grid w-fit gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-400">
                        Sample product ID
                      </Label>
                      <Input
                        className="mt-2 w-full"
                        value={parameterProductId}
                        onChange={(event) =>
                          setParameterProductId(event.target.value)
                        }
                        placeholder="Base product ID to fetch parameters"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Button
                        type="button"
                        onClick={() => { void handleLoadParameters(); }}
                        disabled={loadingParameters}
                      >
                        {loadingParameters
                          ? "Loading..."
                          : parameterKeys.length > 0
                            ? "Unload parameters"
                            : "Load parameters"}
                      </Button>
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            parameterKeys.length > 0
                              ? "bg-emerald-400"
                              : "bg-gray-600"
                          }`}
                        />
                        <span>
                          {parameterKeys.length > 0 ? "Loaded" : "Not loaded"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => { void handleUseExampleProduct(); }}
                        disabled={loadingParameters}
                      >
                        Use example
                      </Button>
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 opacity-0">
                        <span className="h-2 w-2 rounded-full bg-gray-600" />
                        <span>Not loaded</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-blue-900/50 bg-blue-900/20 p-3 text-xs text-blue-200">
                    <p>
                      Export templates use Base.com API documentation for
                      parameter keys and descriptions.
                    </p>
                    <p className="mt-1 text-blue-300/70">
                      Use keys like prices.0, stock.&lt;warehouse_id&gt;, or
                      image slots.
                    </p>
                  </div>
                )}
              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => { void handleNewTemplate(); }}
                                  type="button"
                                >
                                  New template
                                </Button>
                                <Button
                                  onClick={() => { void handleSaveTemplate(); }}
                                  disabled={savingTemplate}
                                >
                                  {savingTemplate ? "Saving..." : "Save template"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => { void handleDeleteTemplate(); }}
                                  disabled={!currentActiveTemplateId || deletingTemplate}
                                >                  {deletingTemplate ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">
                  {isImportTemplateScope ? "Import templates" : "Export templates"}
                </Label>
                <div className="max-h-64 overflow-auto rounded-md border border-gray-800 bg-gray-950/60 p-2">
                  {currentTemplates.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {currentLoadingTemplates
                        ? "Loading templates..."
                        : "No templates yet."}
                    </p>
                  ) : (
                    currentTemplates
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((template) => (
                        <Button
                          key={template.id}
                          type="button"
                                                      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs ${
                                                        currentActiveTemplateId === template.id
                                                          ? "bg-emerald-500/20 text-emerald-100"
                                                          : "text-gray-300 hover:bg-gray-800/60"
                                                      }`}
                                                      onClick={() => { void handleSelectTemplate(template.id); }}
                                                    >                          <span>{template.name}</span>
                        </Button>
                      ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-gray-400">
                      Template name
                    </Label>
                    <Input
                      className="mt-2"
                      value={currentTemplateName}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (isImportTemplateScope) {
                          setImportTemplateName(value);
                        } else {
                          setExportTemplateName(value);
                        }
                      }}
                      placeholder="Base default mapping"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      Description
                    </Label>
                    <Input
                      className="mt-2"
                      value={currentTemplateDescription}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (isImportTemplateScope) {
                          setImportTemplateDescription(value);
                        } else {
                          setExportTemplateDescription(value);
                        }
                      }}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {!isImportTemplateScope && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="exportImagesAsBase64"
                      checked={exportImagesAsBase64} onCheckedChange={(checked) => setExportImagesAsBase64(Boolean(checked))}
                      className="h-4 w-4 rounded border-gray-800 bg-gray-900 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <Label
                      htmlFor="exportImagesAsBase64"
                      className="text-sm text-gray-300 cursor-pointer"
                    >
                      Export images as base64 data blobs
                    </Label>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-400">
                    Parameter mappings
                  </Label>
                  {hasStockMappingMismatch ? (
                    <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <p>
                        Some stock keys do not match the selected inventory
                        warehouses. Base.com will reject stock for these keys.
                      </p>
                      <p className="mt-1 text-amber-300/80">
                        Invalid stock keys: {invalidStockMappingLabels.join(", ")}
                      </p>
                      {stockMappingSuggestions.length > 0 ? (
                        <p className="mt-1 text-amber-300/80">
                          Suggested keys: {stockMappingSuggestions.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2 space-y-2">
                    {currentTemplateMappings.map((mapping, index) => (
                      <div
                        key={index}
                        onDragOver={(event) => handleMappingDragOver(event, index)}
                        onDragLeave={handleMappingDragLeave}
                        onDrop={(event) => handleMappingDrop(event, index)}
                        className={`grid gap-2 rounded-md transition md:grid-cols-[auto_1fr_1fr_auto] ${
                          dragOverMappingIndex === index
                            ? "bg-emerald-500/10 ring-1 ring-emerald-500/60"
                            : ""
                        }`}
                      >
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            draggable
                            onDragStart={(event) =>
                              handleMappingDragStart(event, index)
                            }
                            onDragEnd={handleMappingDragEnd}
                            aria-label="Drag mapping to reorder"
                            className={`text-gray-400 hover:text-white ${
                              draggedMappingIndex === index
                                ? "cursor-grabbing"
                                : "cursor-grab"
                            }`}
                          >
                            <GripVertical className="size-4" />
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            value={mapping.sourceKey}
                            onChange={(event) =>
                              updateMapping(index, {
                                sourceKey: event.target.value,
                              })
                            }
                            onFocus={() => setOpenKeyIndex(index)}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setOpenKeyIndex((current) =>
                                  current === index ? null : current
                                );
                              }, 120);
                            }}
                            placeholder={
                              isImportTemplateScope
                                ? "Base parameter key (e.g. material)"
                                : "Export parameter key (e.g. prices.0)"
                            }
                          />
                          {openKeyIndex === index && (
                            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-800 bg-gray-950 shadow-lg">
                              {filterKeys(mapping.sourceKey).map((key) => (
                                  <Button
                                    key={key}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-800"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      updateMapping(index, { sourceKey: key });
                                      setOpenKeyIndex(null);
                                    }}
                                  >
                                    {key}
                                  </Button>
                                ))}
                              {filterKeys(mapping.sourceKey).length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-500">
                                  No matches
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-500">
                          {mapping.sourceKey &&
                          currentParameterValues[mapping.sourceKey]
                            ? currentParameterValues[mapping.sourceKey]
                            : "—"}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="flex-1 rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                            value={mapping.targetField}
                            onChange={(event) =>
                              updateMapping(index, {
                                targetField: event.target.value,
                              })
                            }
                          >
                            <option value="">Select product field</option>
                            {PRODUCT_FIELDS.map((field) => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMappingRow(index)}
                            aria-label="Remove mapping"
                            className="text-gray-400 hover:text-white"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addMappingRow}
                    >
                      Add mapping
                    </Button>
                  </div>
                  {isImportTemplateScope ? (
                    <p className="mt-3 text-xs text-gray-500">
                      Source keys can be direct Base fields or parameter names.
                      Use dotted paths for nested fields (e.g. parameters.size).
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">
                      Source keys must match Base.com export fields. Use dotted
                      paths for nested fields (e.g. prices.0).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
