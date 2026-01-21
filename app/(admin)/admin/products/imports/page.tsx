"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { IntegrationWithConnections } from "@/types";

type InventoryOption = {
  id: string;
  name: string;
};

type WarehouseOption = {
  id: string;
  name: string;
};

type CatalogOption = {
  id: string;
  name: string;
  isDefault?: boolean;
};

type ImportResponse = {
  imported: number;
  failed: number;
  total: number;
  errors?: string[];
};

type ImportListItem = {
  baseProductId: string;
  name: string;
  sku: string | null;
  exists: boolean;
  skuExists?: boolean; // SKU already exists in local database
  description?: string;
  price?: number;
  stock?: number;
  image?: string | null;
};

type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

type Template = {
  id: string;
  name: string;
  description?: string | null;
  mappings: TemplateMapping[];
};

const PRODUCT_FIELDS = [
  { value: "sku", label: "SKU" },
  { value: "baseProductId", label: "Base Product ID" },
  { value: "ean", label: "EAN" },
  { value: "gtin", label: "GTIN" },
  { value: "asin", label: "ASIN" },
  { value: "name_en", label: "Name (EN)" },
  { value: "name_pl", label: "Name (PL)" },
  { value: "name_de", label: "Name (DE)" },
  { value: "description_en", label: "Description (EN)" },
  { value: "description_pl", label: "Description (PL)" },
  { value: "description_de", label: "Description (DE)" },
  { value: "supplierName", label: "Supplier Name" },
  { value: "supplierLink", label: "Supplier Link" },
  { value: "price", label: "Price" },
  { value: "priceComment", label: "Price Comment" },
  { value: "stock", label: "Stock" },
  { value: "sizeLength", label: "Size Length" },
  { value: "sizeWidth", label: "Size Width" },
  { value: "weight", label: "Weight" },
  { value: "length", label: "Length" },
  { value: "image_1", label: "Image Link 1" },
  { value: "image_2", label: "Image Link 2" },
  { value: "image_3", label: "Image Link 3" },
  { value: "image_4", label: "Image Link 4" },
  { value: "image_5", label: "Image Link 5" },
  { value: "image_6", label: "Image Link 6" },
  { value: "image_7", label: "Image Link 7" },
  { value: "image_8", label: "Image Link 8" },
  { value: "image_9", label: "Image Link 9" },
  { value: "image_10", label: "Image Link 10" },
  { value: "image_slot_1", label: "Image Slot 1" },
  { value: "image_slot_2", label: "Image Slot 2" },
  { value: "image_slot_3", label: "Image Slot 3" },
  { value: "image_slot_4", label: "Image Slot 4" },
  { value: "image_slot_5", label: "Image Slot 5" },
  { value: "image_slot_6", label: "Image Slot 6" },
  { value: "image_slot_7", label: "Image Slot 7" },
  { value: "image_slot_8", label: "Image Slot 8" },
  { value: "image_slot_9", label: "Image Slot 9" },
  { value: "image_slot_10", label: "Image Slot 10" },
  { value: "image_slot_11", label: "Image Slot 11" },
  { value: "image_slot_12", label: "Image Slot 12" },
  { value: "image_slot_13", label: "Image Slot 13" },
  { value: "image_slot_14", label: "Image Slot 14" },
  { value: "image_slot_15", label: "Image Slot 15" },
  { value: "image_all", label: "Image Slots (All, legacy key)" },
  { value: "image_slots_all", label: "Image Slots (All)" },
  { value: "image_links_all", label: "Image Links (All)" },
  { value: "images_all", label: "Images (All: slots + links)" },
] as const;

const IMAGE_SLOT_KEYS = Array.from({ length: 15 }, (_, index) => `image_slot_${index + 1}`);
const ALL_IMAGE_KEYS = [
  ...IMAGE_SLOT_KEYS,
  "image_all",
  "image_slots_all",
  "image_links_all",
  "images_all",
];

const EXPORT_PARAMETER_DOCS = [
  { key: "sku", description: "Unique product SKU/code." },
  { key: "ean", description: "EAN barcode." },
  { key: "weight", description: "Weight (kg)." },
  { key: "name", description: "Product name (default language)." },
  { key: "name|en", description: "Product name (English)." },
  { key: "description", description: "Product description (default language)." },
  { key: "description|en", description: "Product description (English)." },
  { key: "text_fields.name", description: "Name inside text_fields object." },
  { key: "text_fields.description", description: "Description inside text_fields object." },
  { key: "text_fields.name|en", description: "English name inside text_fields." },
  { key: "text_fields.description|en", description: "English description inside text_fields." },
  { key: "prices.0", description: "Price for price group 0." },
  { key: "prices.<price_group_id>", description: "Price for a specific price group." },
  { key: "stock", description: "Inventory-level stock (no warehouse)." },
  { key: "stock.<warehouse_id>", description: "Stock for a specific warehouse." },
  { key: "stock.bl_<warehouse_id>", description: "Baselinker stock key format." },
  { key: "images", description: "All product image URLs." },
  { key: "image", description: "Single product image URL." },
  { key: "image_links_all", description: "All image links." },
  { key: "image_slots_all", description: "All image slots." },
  { key: "images_all", description: "All images (slots + links)." },
  ...IMAGE_SLOT_KEYS.map((key, index) => ({
    key,
    description: `Image slot ${index + 1}.`,
  })),
];

const EXPORT_PARAMETER_KEYS = Array.from(
  new Set(EXPORT_PARAMETER_DOCS.map((entry) => entry.key))
);

export default function ProductImportsPage() {
  const { toast } = useToast();
  // Token is now handled by the backend via integration
  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [exportWarehouseId, setExportWarehouseId] = useState("");
  const [exportWarehouseLoaded, setExportWarehouseLoaded] = useState(false);
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
  const [parameterCacheReady, setParameterCacheReady] = useState(false);

  const [checkingIntegration, setCheckingIntegration] = useState(true);
  const [isBaseConnected, setIsBaseConnected] = useState(false);

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

  const applyTemplate = useCallback((template: Template, scope: "import" | "export") => {
    const nextMappings =
      template.mappings.length > 0
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
          if (
            baseIntegration &&
            baseIntegration.connections &&
            baseIntegration.connections.length > 0
          ) {
            setIsBaseConnected(true);
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
    if (!inventoryId) {
      setExportWarehouseId("");
      setExportWarehouseLoaded(true);
      return;
    }
    setExportWarehouseLoaded(false);
    const loadExportWarehouse = async () => {
      try {
        const res = await fetch(
          `/api/products/imports/base/export-warehouse?inventoryId=${encodeURIComponent(
            inventoryId
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
  }, [inventoryId]);

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
    if (!exportActiveTemplatePreferenceLoaded) return;
    const saveExportTemplatePreference = async () => {
      try {
        await fetch("/api/products/exports/base/active-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: exportActiveTemplateId || null,
          }),
        });
      } catch (error) {
        console.error("Failed to save export template preference", error);
      }
    };
    void saveExportTemplatePreference();
  }, [exportActiveTemplateId, exportActiveTemplatePreferenceLoaded]);

  useEffect(() => {
    if (!exportWarehouseLoaded) return;
    if (!inventoryId) return;
    const saveExportWarehouse = async () => {
      try {
        await fetch("/api/products/imports/base/export-warehouse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId: exportWarehouseId || null,
            inventoryId,
          }),
        });
      } catch (error) {
        console.error("Failed to save export warehouse preference", error);
      }
    };
    void saveExportWarehouse();
  }, [exportWarehouseId, exportWarehouseLoaded, inventoryId]);

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
    } catch (error) {
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
      } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

  const handleLoadInventories = async () => {
    if (!isBaseConnected) {
      toast("Please connect Base integration first.", { variant: "error" });
      return;
    }
    setLoadingInventories(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inventories" }),
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
      }
    } catch (error) {
      toast("Failed to load inventories.", { variant: "error" });
    } finally {
      setLoadingInventories(false);
    }
  };

  const handleLoadWarehouses = async () => {
    if (!isBaseConnected) {
      toast("Please connect Base integration first.", { variant: "error" });
      return;
    }
    if (!inventoryId) {
      toast("Select an inventory before loading warehouses.", { variant: "error" });
      return;
    }
    setLoadingWarehouses(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "warehouses", inventoryId }),
      });
      const payload = (await res.json()) as {
        warehouses?: WarehouseOption[];
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load warehouses.", {
          variant: "error",
        });
        return;
      }
      const nextWarehouses = payload.warehouses ?? [];
      setWarehouses(nextWarehouses);
      if (nextWarehouses.length) {
        const hasCurrent = exportWarehouseId
          ? nextWarehouses.some((warehouse) => warehouse.id === exportWarehouseId)
          : false;
        if (!hasCurrent) {
          setExportWarehouseId(nextWarehouses[0]?.id ?? "");
        }
      }
    } catch (error) {
      toast("Failed to load warehouses.", { variant: "error" });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  useEffect(() => {
    if (!isBaseConnected || !inventoryId) return;
    if (!exportWarehouseLoaded) return;
    if (lastWarehouseInventoryIdRef.current === inventoryId) return;
    lastWarehouseInventoryIdRef.current = inventoryId;
    void handleLoadWarehouses();
  }, [inventoryId, isBaseConnected, exportWarehouseLoaded]);

  const handleSaveExportSettings = async () => {
    setSavingExportSettings(true);
    try {
      const responses = await Promise.all([
        fetch("/api/products/exports/base/active-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: exportActiveTemplateId || null,
          }),
        }),
        fetch("/api/products/imports/base/export-warehouse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId: exportWarehouseId || null,
            inventoryId,
          }),
        }),
      ]);
      const failed = responses.find((res) => !res.ok);
      if (failed) {
        toast("Failed to save export settings.", { variant: "error" });
        return;
      }
      toast("Export settings saved.", { variant: "success" });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Base.com</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Connected via Integrations. Load inventories to start importing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <Button
                  onClick={handleLoadInventories}
                  disabled={loadingInventories}
                  className="mt-6"
                >
                  {loadingInventories ? "Loading..." : "Load inventories"}
                </Button>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-400">Inventory</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={inventoryId}
                    onChange={(event) => setInventoryId(event.target.value)}
                    disabled={inventories.length === 0}
                  >
                    {inventories.length === 0 ? (
                      <option value="">Load inventories first</option>
                    ) : (
                      inventories.map((inventory) => (
                        <option key={inventory.id} value={inventory.id}>
                          {inventory.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearInventory}
                  disabled={!inventoryId}
                  className="mt-6"
                >
                  Clear inventory
                </Button>
                <div className="w-40">
                  <label className="text-xs text-gray-400">Limit</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  >
                    <option value="1">1</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-400">Catalog</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={catalogId}
                    onChange={(event) => setCatalogId(event.target.value)}
                    disabled={loadingCatalogs || catalogs.length === 0}
                  >
                    {catalogs.length === 0 ? (
                      <option value="">
                        {loadingCatalogs ? "Loading catalogs..." : "No catalogs"}
                      </option>
                    ) : (
                      catalogs.map((catalog) => (
                        <option key={catalog.id} value={catalog.id}>
                          {catalog.name}
                          {catalog.isDefault ? " (Default)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Import template</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={importTemplateId}
                    onChange={(event) => setImportTemplateId(event.target.value)}
                    disabled={loadingImportTemplates || importTemplates.length === 0}
                  >
                    <option value="">No template</option>
                    {importTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-400">Images</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={imageMode}
                    onChange={(event) =>
                      setImageMode(
                        event.target.value === "download" ? "download" : "links"
                      )
                    }
                  >
                    <option value="links">Import image links</option>
                    <option value="download">Download product images</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Image links keep Base.com URLs. Download stores images in your
                    uploads folder.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">SKU Handling</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowDuplicateSku"
                      checked={allowDuplicateSku}
                      onChange={(e) => setAllowDuplicateSku(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500"
                    />
                    <label htmlFor="allowDuplicateSku" className="text-sm text-white">
                      Allow duplicate SKUs
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    When unchecked, products with existing SKUs will be skipped.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  Default catalog and price group must be configured before
                  import.
                </p>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : "Import products"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Import list preview
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Compare Base products with existing records by Base ID.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={importSearch}
                  onChange={(event) => setImportSearch(event.target.value)}
                  placeholder="Search products..."
                  className="h-8 w-48 border-gray-800 bg-gray-900 text-xs text-white placeholder:text-gray-500"
                />
                <select
                  className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white"
                  value={uniqueOnly ? "unique" : "all"}
                  onChange={(event) =>
                    setUniqueOnly(event.target.value === "unique")
                  }
                >
                  <option value="unique">Unique only</option>
                  <option value="all">All products</option>
                </select>
                <Button
                  onClick={handleLoadImportList}
                  disabled={loadingImportList}
                >
                  {loadingImportList ? "Loading..." : "Load import list"}
                </Button>
              </div>
            </div>

            {importListStats ? (
              <div className="mt-3 text-xs text-gray-400">
                Total: {importListStats.total} · Existing:{" "}
                {importListStats.existing} · Available: {importListStats.available ?? importListStats.filtered}
                {" "}· Showing: {importListStats.filtered} · Selected:{" "}
                {selectedImportCount}
                {importListStats.skuDuplicates ? (
                  <span className="text-yellow-400"> · SKU duplicates: {importListStats.skuDuplicates}</span>
                ) : null}
              </div>
            ) : null}

            {filteredImportList.length > 0 ? (
              <div className="mt-3 max-h-96 overflow-auto rounded-md border border-gray-800 bg-gray-950/70">
                <div className="grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-gray-800 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 sticky top-0 bg-gray-950 z-10">
                  <span className="flex items-center">
                    <input
                      type="checkbox"
                      aria-label="Select all visible products"
                      checked={allVisibleSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedImportIds((prev) => {
                            const next = new Set(prev);
                            filteredImportList.forEach((item) => {
                              if (item.baseProductId) next.add(item.baseProductId);
                            });
                            return next;
                          });
                        } else {
                          setSelectedImportIds((prev) => {
                            const next = new Set(prev);
                            filteredImportList.forEach((item) => {
                              if (item.baseProductId) next.delete(item.baseProductId);
                            });
                            return next;
                          });
                        }
                      }}
                      ref={(element) => {
                        if (element) element.indeterminate = isSomeVisibleSelected;
                      }}
                      className="h-3 w-3 rounded border-gray-700 bg-gray-900 text-emerald-500"
                    />
                  </span>
                  <span>Img</span>
                  <span>Base ID</span>
                  <span>Product</span>
                  <span>SKU</span>
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Status</span>
                </div>
                {filteredImportList.map((item) => (
                  <div
                    key={item.baseProductId}
                    className={`grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-gray-900/70 px-3 py-2 text-xs text-gray-300 last:border-b-0 items-center transition-colors ${
                      selectedImportIds.has(item.baseProductId)
                        ? "bg-emerald-500/5"
                        : "hover:bg-gray-900/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedImportIds.has(item.baseProductId)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedImportIds((prev) => {
                          const next = new Set(prev);
                          if (checked) {
                            next.add(item.baseProductId);
                          } else {
                            next.delete(item.baseProductId);
                          }
                          return next;
                        });
                      }}
                      className="h-3 w-3 rounded border-gray-700 bg-gray-900 text-emerald-500"
                      aria-label={`Select ${item.name}`}
                    />
                    <div className="h-10 w-10 overflow-hidden rounded bg-gray-900">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-600">
                          No img
                        </div>
                      )}
                    </div>
                    <span className="truncate text-gray-400 font-mono text-[11px]">
                      {item.baseProductId}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-200">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="truncate text-[11px] text-gray-500">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <span className={`truncate font-mono text-[11px] ${item.skuExists ? "text-yellow-400" : "text-gray-400"}`}>
                      {item.sku ?? "—"}
                      {item.skuExists && <span className="ml-1" title="SKU already exists">⚠</span>}
                    </span>
                    <span className="truncate">{item.price ?? 0}</span>
                    <span className="truncate">{item.stock ?? 0}</span>
                    <span
                      className={`text-[11px] font-medium ${
                        item.exists ? "text-amber-400" : item.skuExists ? "text-yellow-400" : "text-emerald-400"
                      }`}
                    >
                      {item.exists ? "Exists" : item.skuExists ? "SKU dup" : "New"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                {importList.length > 0
                  ? "No matches for this search."
                  : "No items loaded yet."}
              </p>
            )}
          </div>

          {lastResult ? (
            <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-white">
                Last import summary
              </h3>
              <p className="mt-2 text-sm text-gray-300">
                Imported {lastResult.imported} of {lastResult.total} product(s).
              </p>
              {lastResult.failed > 0 ? (
                <p className="mt-1 text-sm text-red-300">
                  {lastResult.failed} failed.
                </p>
              ) : null}
              {lastResult.errors?.length ? (
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  {lastResult.errors.map((error, index) => (
                    <p key={`${error}-${index}`}>• {error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="exports" className="mt-6 space-y-6">
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Base.com Export Settings
                  </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Configure default export settings for Base.com product listings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>

              <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">
                    Default Inventory
                  </label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={inventoryId}
                    onChange={(event) => setInventoryId(event.target.value)}
                    disabled={inventories.length === 0}
                  >
                    {inventories.length === 0 ? (
                      <option value="">No inventories loaded</option>
                    ) : (
                      <>
                        <option value="">Select default inventory...</option>
                        {inventories.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Default inventory for product exports
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-400">
                    Default Export Template
                  </label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={exportActiveTemplateId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const selected = exportTemplates.find(
                        (template) => template.id === nextId
                      );
                      if (selected) {
                        applyTemplate(selected, "export");
                      } else {
                        setExportActiveTemplateId(nextId);
                      }
                    }}
                    disabled={loadingExportTemplates || exportTemplates.length === 0}
                  >
                    <option value="">No template (use defaults)</option>
                    {exportTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Template for field mapping on export
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">
                  Default Warehouse ID
                </label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={exportWarehouseId}
                  onChange={(event) => setExportWarehouseId(event.target.value)}
                  disabled={warehouses.length === 0}
                >
                  {warehouses.length === 0 ? (
                    <option value="">Load warehouses first</option>
                  ) : (
                    <>
                      <option value="">Skip stock export</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Used for exporting stock quantities to Base.com. Leave blank to skip stock.
                </p>
              </div>

              <div className="rounded-md border border-blue-900/50 bg-blue-900/20 p-4">
                <h3 className="text-sm font-semibold text-blue-200">
                  Export Guidelines
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-blue-300/70">
                  <li>• Exports use templates to map internal product fields to Base.com API parameters</li>
                  <li>• Without a template, default field mappings are used (SKU, Name, Price, Stock, etc.)</li>
                  <li>• Import and export templates are managed separately in the Templates tab</li>
                  <li>• Export to Base.com from Product List → Integrations → List Products → Select Base.com</li>
                  <li>• Track export jobs in the <Link href="/admin/products/jobs?tab=export" className="text-blue-400 underline">Export Jobs</Link> tab</li>
                </ul>
              </div>

              <div className="rounded-md border border-gray-800 bg-gray-950 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleLoadInventories}
                    disabled={loadingInventories}
                    variant="outline"
                    size="sm"
                    className="border-gray-700"
                  >
                    {loadingInventories ? "Loading..." : "Load Inventories"}
                  </Button>
                  <Button
                    onClick={handleLoadWarehouses}
                    disabled={loadingWarehouses}
                    variant="outline"
                    size="sm"
                    className="border-gray-700"
                  >
                    {loadingWarehouses ? "Loading..." : "Load Warehouses"}
                  </Button>
                  <Button
                    onClick={handleSaveExportSettings}
                    disabled={savingExportSettings}
                    size="sm"
                  >
                    {savingExportSettings ? "Saving..." : "Save Export Settings"}
                  </Button>
                  <Link href="/admin/products/jobs?tab=export">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700"
                    >
                      View Listing Jobs
                    </Button>
                  </Link>
                  <Link href="/admin/products">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700"
                    >
                      Go to Products
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Template type</label>
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
                      <label className="text-xs text-gray-400">
                        Sample product ID
                      </label>
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
                        onClick={handleLoadParameters}
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
                        onClick={handleUseExampleProduct}
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
                  onClick={handleNewTemplate}
                  type="button"
                >
                  New template
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? "Saving..." : "Save template"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTemplate}
                  disabled={!currentActiveTemplateId || deletingTemplate}
                >
                  {deletingTemplate ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">
                  {isImportTemplateScope ? "Import templates" : "Export templates"}
                </label>
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
                        <button
                          key={template.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs ${
                            currentActiveTemplateId === template.id
                              ? "bg-emerald-500/20 text-emerald-100"
                              : "text-gray-300 hover:bg-gray-800/60"
                          }`}
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          <span>{template.name}</span>
                        </button>
                      ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-400">
                      Template name
                    </label>
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
                    <label className="text-xs text-gray-400">
                      Description
                    </label>
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

                <div>
                  <label className="text-xs text-gray-400">
                    Parameter mappings
                  </label>
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
                                  <button
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
                                  </button>
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
