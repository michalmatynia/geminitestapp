"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { IntegrationWithConnections } from "@/types";

type InventoryOption = {
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

type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

type ImportTemplate = {
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
] as const;

export default function ProductImportsPage() {
  const { toast } = useToast();
  // Token is now handled by the backend via integration
  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [limit, setLimit] = useState("all");
  const [imageMode, setImageMode] = useState<"links" | "download">("links");
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateMappings, setTemplateMappings] = useState<TemplateMapping[]>([
    { sourceKey: "", targetField: "" },
  ]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [parameterKeys, setParameterKeys] = useState<string[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [parameterProductId, setParameterProductId] = useState("");
  const [openKeyIndex, setOpenKeyIndex] = useState<number | null>(null);

  const [checkingIntegration, setCheckingIntegration] = useState(true);
  const [isBaseConnected, setIsBaseConnected] = useState(false);

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
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/products/import-templates");
        const payload = (await res.json()) as ImportTemplate[];
        if (!res.ok) return;
        setTemplates(payload);
      } catch (error) {
        console.error("Failed to load import templates", error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    void loadTemplates();
  }, []);

  useEffect(() => {
    const loadSampleProduct = async () => {
      try {
        const res = await fetch("/api/products/imports/base/sample-product");
        const payload = (await res.json()) as { productId?: string | null };
        if (!res.ok) return;
        if (payload.productId) {
          setParameterProductId(payload.productId);
        }
      } catch (error) {
        console.error("Failed to load sample product ID", error);
      }
    };
    void loadSampleProduct();
  }, []);

  const handleSelectTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setActiveTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description ?? "");
    setTemplateMappings(
      template.mappings.length > 0
        ? template.mappings
        : [{ sourceKey: "", targetField: "" }]
    );
  };

  const handleNewTemplate = () => {
    setActiveTemplateId("");
    setTemplateName("");
    setTemplateDescription("");
    setTemplateMappings([{ sourceKey: "", targetField: "" }]);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast("Template name is required.", { variant: "error" });
      return;
    }
    const cleanedMappings = templateMappings
      .map((mapping) => ({
        sourceKey: mapping.sourceKey.trim(),
        targetField: mapping.targetField.trim(),
      }))
      .filter((mapping) => mapping.sourceKey && mapping.targetField);
    setSavingTemplate(true);
    try {
      const res = await fetch(
        activeTemplateId
          ? `/api/products/import-templates/${activeTemplateId}`
          : "/api/products/import-templates",
        {
          method: activeTemplateId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            description: templateDescription.trim() || undefined,
            mappings: cleanedMappings,
          }),
        }
      );
      const payload = (await res.json()) as ImportTemplate & { error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to save template.", {
          variant: "error",
        });
        return;
      }
      setTemplates((prev) => {
        const next = prev.filter((item) => item.id !== payload.id);
        return [...next, payload];
      });
      setActiveTemplateId(payload.id);
      toast("Template saved.", { variant: "success" });
    } catch (error) {
      toast("Failed to save template.", { variant: "error" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadParameters = async () => {
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
      const payload = (await res.json()) as { keys?: string[]; error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to load parameters.", {
          variant: "error",
        });
        return;
      }
      setParameterKeys(payload.keys ?? []);
      toast(`Loaded ${payload.keys?.length ?? 0} keys.`, {
        variant: "success",
      });
    } catch (error) {
      toast("Failed to load parameters.", { variant: "error" });
    } finally {
      setLoadingParameters(false);
    }
  };

  const handleSaveSampleProduct = async () => {
    if (!inventoryId) {
      toast("Select an inventory first.", { variant: "error" });
      return;
    }
    if (!parameterProductId.trim()) {
      toast("Enter a product ID to save.", { variant: "error" });
      return;
    }
    setLoadingParameters(true);
    try {
      const res = await fetch("/api/products/imports/base/sample-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          productId: parameterProductId.trim(),
        }),
      });
      const payload = (await res.json()) as { productId?: string; error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to save sample product.", {
          variant: "error",
        });
        return;
      }
      setParameterProductId(payload.productId ?? parameterProductId.trim());
      toast("Sample product saved.", { variant: "success" });
    } catch (error) {
      toast("Failed to save sample product.", { variant: "error" });
    } finally {
      setLoadingParameters(false);
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
    if (!activeTemplateId) return;
    setDeletingTemplate(true);
    try {
      const res = await fetch(
        `/api/products/import-templates/${activeTemplateId}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(payload.error || "Failed to delete template.", {
          variant: "error",
        });
        return;
      }
      setTemplates((prev) =>
        prev.filter((item) => item.id !== activeTemplateId)
      );
      if (templateId === activeTemplateId) {
        setTemplateId("");
      }
      handleNewTemplate();
      toast("Template deleted.", { variant: "success" });
    } catch (error) {
      toast("Failed to delete template.", { variant: "error" });
    } finally {
      setDeletingTemplate(false);
    }
  };

  const updateMapping = (
    index: number,
    patch: Partial<TemplateMapping>
  ) => {
    setTemplateMappings((prev) =>
      prev.map((mapping, i) =>
        i === index ? { ...mapping, ...patch } : mapping
      )
    );
  };

  const addMappingRow = () => {
    setTemplateMappings((prev) => [
      ...prev,
      { sourceKey: "", targetField: "" },
    ]);
  };

  const removeMappingRow = (index: number) => {
    setTemplateMappings((prev) =>
      prev.length === 1
        ? [{ sourceKey: "", targetField: "" }]
        : prev.filter((_, i) => i !== index)
    );
  };

  const filterKeys = (query: string) => {
    if (!query) return parameterKeys;
    const lowered = query.toLowerCase();
    return parameterKeys.filter((key) => key.toLowerCase().includes(lowered));
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
      setInventories(payload.inventories ?? []);
      if (payload.inventories?.length) {
        setInventoryId(payload.inventories[0].id);
      }
    } catch (error) {
      toast("Failed to load inventories.", { variant: "error" });
    } finally {
      setLoadingInventories(false);
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
    const parsedLimit = limit === "all" ? undefined : Number(limit);
    setImporting(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          inventoryId,
          catalogId,
          templateId: templateId || undefined,
          limit: parsedLimit,
          imageMode,
        }),
      });
      const payload = (await res.json()) as ImportResponse & {
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Import failed.", { variant: "error" });
        return;
      }
      setLastResult(payload);
      toast(`Imported ${payload.imported} product(s).`, {
        variant: "success",
      });
    } catch (error) {
      toast("Import failed.", { variant: "error" });
    } finally {
      setImporting(false);
    }
  };

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
        <h1 className="mb-4 text-3xl font-bold text-white">Product Imports</h1>
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
          <h1 className="text-3xl font-bold text-white">Product Imports</h1>
          <p className="mt-1 text-sm text-gray-400">
            Import products from Base.com and assign them to your selected
            catalog and price group.
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
          <TabsTrigger value="templates">Import Templates</TabsTrigger>
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
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleLoadInventories}
                  disabled={loadingInventories}
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
                <div className="w-40">
                  <label className="text-xs text-gray-400">Limit</label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  >
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
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    disabled={loadingTemplates || templates.length === 0}
                  >
                    <option value="">No template</option>
                    {templates.map((template) => (
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

        <TabsContent value="templates" className="mt-6 space-y-6">
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Import templates
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Map Base.com product parameters into product fields.
                </p>
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
                  disabled={!activeTemplateId || deletingTemplate}
                >
                  {deletingTemplate ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <label className="text-xs text-gray-400">
                  Sample product ID
                </label>
                <Input
                  className="mt-2"
                  value={parameterProductId}
                  onChange={(event) => setParameterProductId(event.target.value)}
                  placeholder="Base product ID to fetch parameters"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={handleLoadParameters}
                  disabled={loadingParameters}
                >
                  {loadingParameters ? "Loading..." : "Load parameters"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveSampleProduct}
                  disabled={loadingParameters}
                >
                  Save ID
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUseExampleProduct}
                  disabled={loadingParameters}
                >
                  Use example
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Templates</label>
                <div className="max-h-64 overflow-auto rounded-md border border-gray-800 bg-gray-950/60 p-2">
                  {templates.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {loadingTemplates
                        ? "Loading templates..."
                        : "No templates yet."}
                    </p>
                  ) : (
                    templates
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs ${
                            activeTemplateId === template.id
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
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="Base default mapping"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">
                      Description
                    </label>
                    <Input
                      className="mt-2"
                      value={templateDescription}
                      onChange={(event) =>
                        setTemplateDescription(event.target.value)
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">
                    Parameter mappings
                  </label>
                  <div className="mt-2 space-y-2">
                    {templateMappings.map((mapping, index) => (
                      <div
                        key={`${mapping.sourceKey}-${index}`}
                        className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                      >
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
                            placeholder="Base parameter key (e.g. material)"
                          />
                          {openKeyIndex === index && parameterKeys.length > 0 && (
                            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-800 bg-gray-950 shadow-lg">
                              {filterKeys(mapping.sourceKey)
                                .slice(0, 60)
                                .map((key) => (
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
                        <select
                          className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
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
                          variant="secondary"
                          onClick={() => removeMappingRow(index)}
                        >
                          Remove
                        </Button>
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
                  <p className="mt-3 text-xs text-gray-500">
                    Source keys can be direct Base fields or parameter names.
                    Use dotted paths for nested fields (e.g. parameters.size).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
