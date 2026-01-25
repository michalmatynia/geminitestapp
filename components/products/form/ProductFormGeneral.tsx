"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { ProductFormData } from "@/types";
import { useToast } from "@/components/ui/toast";
import type { ProductAiJob } from "@/types/product-jobs";
import type {
  AiNode,
  PathConfig,
  PathMeta,
} from "@/app/(admin)/admin/products/settings/components/ai-paths/types";
import { evaluateGraph } from "@/app/(admin)/admin/products/settings/components/ai-paths/runtime";
import {
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
  createDefaultPathConfig,
  normalizeNodes,
  sanitizeEdges,
} from "@/app/(admin)/admin/products/settings/components/ai-paths/helpers";

export default function ProductFormGeneral() {
  const safeJsonStringify = (value: unknown) => {
    const seen = new WeakSet();
    const replacer = (_key: string, val: unknown) => {
      if (typeof val === "bigint") return val.toString();
      if (val instanceof Date) return val.toISOString();
      if (val instanceof Set) return Array.from(val.values()) as unknown[];
      if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
      if (typeof val === "function" || typeof val === "symbol") return undefined;
      if (val && typeof val === "object") {
        if (seen.has(val)) return undefined;
        seen.add(val);
      }
      return val;
    };
    try {
      return JSON.stringify(value, replacer);
    } catch {
      return "";
    }
  };
  const {
    filteredLanguages,
    errors,
    generationError,
    setGenerationError,
    product,
    imageSlots,
    selectedCatalogIds,
  } = useProductFormContext();

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  const { toast } = useToast();

  const [generating, setGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">("ean");
  const allValues = watch();
  const hasCatalogs = selectedCatalogIds.length > 0;
  const languagesReady = filteredLanguages.length > 0;

  useEffect(() => {
    const vals = getValues();
    if (vals.asin) {
      setIdentifierType("asin");
    } else if (vals.gtin) {
      setIdentifierType("gtin");
    }
  }, [getValues]);

  const handleGenerateDescription = async () => {
    logger.log("Generating description...");
    setGenerating(true);
    setGenerationError(null);
    const productData = getValues();
    const imageUrls = imageSlots
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => slot.previewUrl);

    try {
      if (product?.id) {
        const enqueueRes = await fetch("/api/products/ai-jobs/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            type: "description_generation",
            payload: {} 
          }),
        });

        const enqueueData = (await enqueueRes.json()) as { error?: string; jobId?: string };
        if (!enqueueRes.ok) throw new Error(enqueueData.error || "Failed to enqueue generation job.");
        const jobId = enqueueData.jobId;

        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
          if (!statusRes.ok) break;
          const { job } = (await statusRes.json()) as { job: ProductAiJob };

          if (job.status === "completed") {
            const description = job.result?.description;
            if (typeof description === "string") {
              setValue("description_en", description);
            }
            completed = true;
          } else if (job.status === "failed") {
            throw new Error(job.errorMessage || "Generation failed.");
          }
          attempts++;
        }
        if (!completed) throw new Error("Generation is taking longer than expected. Check the AI Jobs page.");
      } else {
        const res = await fetch("/api/generate-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productData, imageUrls }),
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          throw new Error(payload?.error || "Failed to generate description");
        }
        const { description } = (await res.json()) as { description: string };
        setValue("description_en", description);
      }
    } catch (error) {
      logger.error("Failed to generate description:", error);
      setGenerationError(error instanceof Error ? error.message : "Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  const buildTriggerContext = (
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent<HTMLButtonElement>,
    pathInfo?: { id?: string; name?: string }
  ) => {
    const timestamp = new Date().toISOString();
    const nativeEvent = event?.nativeEvent;
    const pointer = nativeEvent
      ? {
          clientX: nativeEvent.clientX,
          clientY: nativeEvent.clientY,
          pageX: nativeEvent.pageX,
          pageY: nativeEvent.pageY,
          screenX: nativeEvent.screenX,
          screenY: nativeEvent.screenY,
          offsetX: "offsetX" in nativeEvent ? nativeEvent.offsetX : undefined,
          offsetY: "offsetY" in nativeEvent ? nativeEvent.offsetY : undefined,
          button: nativeEvent.button,
          buttons: nativeEvent.buttons,
          altKey: nativeEvent.altKey,
          ctrlKey: nativeEvent.ctrlKey,
          shiftKey: nativeEvent.shiftKey,
          metaKey: nativeEvent.metaKey,
        }
      : undefined;
    const location =
      typeof window !== "undefined"
        ? {
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            referrer: document.referrer || undefined,
          }
        : {};
    const ui =
      typeof window !== "undefined"
        ? {
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
            },
            screen: {
              width: window.screen?.width,
              height: window.screen?.height,
              availWidth: window.screen?.availWidth,
              availHeight: window.screen?.availHeight,
            },
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            documentTitle: document.title,
            visibilityState: document.visibilityState,
            scroll: {
              x: window.scrollX,
              y: window.scrollY,
            },
          }
        : {};
    return {
      timestamp,
      location,
      ui,
      user: null,
      event: {
        id: triggerEvent,
        nodeId: triggerNode.id,
        nodeTitle: triggerNode.title,
        type: event?.type,
        pointer,
      },
      source: {
        pathId: pathInfo?.id,
        pathName: pathInfo?.name ?? "Product Panel",
        tab: "product",
      },
      extras: {
        triggerLabel: "Path Generate Description",
      },
      entityId: product?.id,
      productId: product?.id,
      entityType: "product",
    };
  };

  const handlePathGenerateDescription = async (
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!product?.id) {
      toast("Save the product before running a path trigger.", {
        variant: "error",
      });
      return;
    }
    try {
      const prefsRes = await fetch("/api/user/preferences", { cache: "no-store" });
      if (!prefsRes.ok) {
        throw new Error("Failed to load AI Paths preferences.");
      }
      const prefs = (await prefsRes.json()) as {
        aiPathsPathConfigs?: Record<string, PathConfig> | string | null;
        aiPathsPathIndex?: Array<{ id?: string }> | null;
      };
      let configs: Record<string, PathConfig> = {};
      let settingsPathOrder: string[] = [];
      if (typeof prefs.aiPathsPathConfigs === "string") {
        try {
          const parsed = JSON.parse(prefs.aiPathsPathConfigs) as Record<string, PathConfig>;
          configs = parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          configs = {};
        }
      } else if (prefs.aiPathsPathConfigs && typeof prefs.aiPathsPathConfigs === "object") {
        configs = prefs.aiPathsPathConfigs;
      }
      if (!configs || Object.keys(configs).length === 0) {
        try {
          const settingsRes = await fetch("/api/settings", { cache: "no-store" });
          if (settingsRes.ok) {
            const data = (await settingsRes.json()) as Array<{ key: string; value: string }>;
            const map = new Map(data.map((item) => [item.key, item.value]));
            const indexRaw = map.get(PATH_INDEX_KEY);
            if (indexRaw) {
              try {
                const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
                if (Array.isArray(parsedIndex)) {
                  settingsPathOrder = parsedIndex
                    .map((meta) => meta?.id)
                    .filter((id): id is string => typeof id === "string" && id.length > 0);
                  parsedIndex.forEach((meta) => {
                    if (!meta?.id) return;
                    const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
                    if (!configRaw) {
                      configs[meta.id] = createDefaultPathConfig(meta.id);
                      return;
                    }
                    try {
                      const parsedConfig = JSON.parse(configRaw) as PathConfig;
                      configs[meta.id] = {
                        ...createDefaultPathConfig(meta.id),
                        ...parsedConfig,
                        id: meta.id,
                        name: parsedConfig?.name || meta.name || `Path ${meta.id}`,
                      };
                    } catch {
                      configs[meta.id] = createDefaultPathConfig(meta.id);
                    }
                  });
                }
              } catch {
                settingsPathOrder = [];
              }
            }
            if (Object.keys(configs).length === 0) {
              const legacyRaw =
                map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get("ai_paths_config");
              if (legacyRaw) {
                try {
                  const parsedConfig = JSON.parse(legacyRaw) as PathConfig;
                  const fallback = createDefaultPathConfig(parsedConfig.id ?? "default");
                  configs[fallback.id] = {
                    ...fallback,
                    ...parsedConfig,
                    id: parsedConfig.id ?? fallback.id,
                    name: parsedConfig.name || fallback.name,
                  };
                } catch {
                  const fallback = createDefaultPathConfig("default");
                  configs[fallback.id] = fallback;
                }
              }
            }
          }
        } catch {
          // If settings fallback fails, keep configs empty.
        }
      }
      const configsList = Object.values(configs);
      const pathOrder = Array.isArray(prefs.aiPathsPathIndex)
        ? prefs.aiPathsPathIndex
            .map((item) => item?.id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        : settingsPathOrder;
      const orderedConfigs = pathOrder.length
        ? pathOrder
            .map((id) => configs[id])
            .filter((config): config is PathConfig => Boolean(config))
        : configsList;
      const triggerEvent = TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
      const triggerCandidates = orderedConfigs.filter((config) =>
        Array.isArray(config?.nodes)
          ? config.nodes.some(
              (node) =>
                node.type === "trigger" &&
                (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
            )
          : false
      );
      const selectedConfig = triggerCandidates[0] ?? orderedConfigs[0];
      if (!selectedConfig) {
        toast(
          "No AI Path found. Configure a path with the Path Generate Description trigger.",
          { variant: "error" }
        );
        return;
      }
      toast(`Running AI Path: ${selectedConfig.name}`, { variant: "success" });
      const nodes = normalizeNodes(
        Array.isArray(selectedConfig.nodes) ? selectedConfig.nodes : []
      );
      const edges = sanitizeEdges(
        nodes,
        Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []
      );
      const triggerNodes = nodes.filter(
        (node) =>
          node.type === "trigger" &&
          (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
      );
      const triggerNode =
        triggerNodes.find((node) => edges.some((edge) => edge.from === node.id)) ??
        triggerNodes.find((node) =>
          edges.some((edge) => edge.from === node.id || edge.to === node.id)
        ) ??
        triggerNodes[0] ??
        nodes.find((node) => node.type === "trigger");
      if (!triggerNode) {
        toast("No trigger node found in the selected path.", { variant: "error" });
        return;
      }
      const triggerContext = buildTriggerContext(triggerNode, triggerEvent, event, {
        id: selectedConfig.id,
        name: selectedConfig.name,
      });
      const runAt = new Date().toISOString();
      const runtimeState = await evaluateGraph({
        nodes,
        edges,
        activePathId: selectedConfig.id ?? "path",
        triggerNodeId: triggerNode.id,
        triggerEvent,
        triggerContext,
        deferPoll: false,
        fetchEntityByType: async (entityType: string, entityId: string) => {
          if (entityType !== "product") return null;
          const res = await fetch(`/api/products/${encodeURIComponent(entityId)}`, {
            cache: "no-store",
          });
          if (!res.ok) return null;
          return (await res.json()) as Record<string, unknown>;
        },
        reportAiPathsError: (error, meta, summary) => {
          logger.error(summary ?? "AI Paths trigger failed", error, meta);
        },
        toast,
      });
      try {
        const updatedConfig: PathConfig = {
          ...selectedConfig,
          nodes,
          edges,
          runtimeState,
          lastRunAt: runAt,
          updatedAt: runAt,
        };
        configs[updatedConfig.id] = updatedConfig;
        const orderedIds = pathOrder.length
          ? pathOrder
          : orderedConfigs.map((config) => config.id);
        const safeConfigs = safeJsonStringify(configs);
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiPathsPathConfigs: safeConfigs || configs,
            aiPathsActivePathId: updatedConfig.id,
            ...(orderedIds.length > 0 && {
              aiPathsPathIndex: orderedIds.map((id) => ({ id })),
            }),
          }),
        });
      } catch (error) {
        logger.error("Failed to persist AI Paths runtime state", error);
      }
    } catch (error) {
      logger.error("Failed to run AI Path trigger", error);
      toast("Failed to run AI Path trigger.", { variant: "error" });
    }
  };

  const handleTranslate = async () => {
    logger.log("Translating product...");
    setTranslating(true);

    try {
      if (!product?.id) {
        throw new Error("Product must be saved before translating.");
      }

      const enqueueRes = await fetch("/api/products/ai-jobs/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          type: "translation",
          payload: {}
        }),
      });

      const enqueueData = (await enqueueRes.json()) as { error?: string; jobId?: string };
      if (!enqueueRes.ok) throw new Error(enqueueData.error || "Failed to enqueue translation job.");

      logger.log(`Translation job ${enqueueData.jobId} created successfully.`);

      // Show success message - user can check Jobs page for progress
      toast("Translation job created successfully. Check the AI Jobs page for progress.", {
        variant: "success"
      });

    } catch (error) {
      logger.error("Failed to translate:", error);
      toast(
        error instanceof Error ? error.message : "Failed to create translation job.",
        { variant: "error" }
      );
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasCatalogs && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Select a catalog to edit product titles and descriptions. Language fields are based on catalog settings.
        </div>
      )}

      {hasCatalogs && !languagesReady && (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-500/20" />
          </div>
          <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
            <div className="mb-3 flex gap-2">
              <div className="h-7 w-24 animate-pulse rounded bg-slate-500/20" />
              <div className="h-7 w-24 animate-pulse rounded bg-slate-500/20" />
              <div className="h-7 w-24 animate-pulse rounded bg-slate-500/20" />
            </div>
            <div className="h-10 w-full animate-pulse rounded bg-slate-500/20" />
          </div>
          <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
            <div className="mb-3 flex gap-2">
              <div className="h-7 w-28 animate-pulse rounded bg-slate-500/20" />
              <div className="h-7 w-28 animate-pulse rounded bg-slate-500/20" />
              <div className="h-7 w-28 animate-pulse rounded bg-slate-500/20" />
            </div>
            <div className="h-24 w-full animate-pulse rounded bg-slate-500/20" />
          </div>
        </div>
      )}

      {hasCatalogs && languagesReady && (
        <>
          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-name` : "english-name"} className="mb-4">
            <TabsList>
              {filteredLanguages.map((language) => {
                const fieldName = `name_${language.code.toLowerCase()}` as "name_en" | "name_pl" | "name_de";
                const fieldValue = allValues[fieldName];
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-name`}
                    className={cn(
                      !fieldValue?.trim()
                        ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                        : "text-foreground data-[state=inactive]:text-foreground font-medium"
                    )}
                  >
                    {language.name} Name
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language) => {
              const fieldName = `name_${language.code.toLowerCase()}` as "name_en" | "name_pl" | "name_de";
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-name`}>
                  <Label htmlFor={fieldName}>{language.name} Name</Label>
                  <Input
                    id={fieldName}
                    {...register(fieldName)}
                    aria-invalid={errors[fieldName] ? "true" : "false"}
                  />
                  {errors[fieldName] && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {errors[fieldName]?.message}
                    </p>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-description` : "english-description"} className="mb-4">
            <TabsList>
              {filteredLanguages.map((language) => {
                const fieldName = `description_${language.code.toLowerCase()}` as "description_en" | "description_pl" | "description_de";
                const fieldValue = allValues[fieldName];
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-description`}
                    className={cn(
                      !fieldValue?.trim()
                        ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                        : "text-foreground data-[state=inactive]:text-foreground font-medium"
                    )}
                  >
                    {language.name} Description
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language) => {
              const fieldName = `description_${language.code.toLowerCase()}` as "description_en" | "description_pl" | "description_de";
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-description`}>
                  <Label htmlFor={fieldName}>{language.name} Description</Label>
                  <Textarea
                    id={fieldName}
                    {...register(fieldName)}
                    aria-invalid={errors[fieldName] ? "true" : "false"}
                  />
                  {errors[fieldName] && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {errors[fieldName]?.message}
                    </p>
                  )}
                  {language.code === "EN" && (
                    <>
                      {generationError && (
                        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                          {generationError}
                          <Button
                            onClick={() => setGenerationError(null)}
                            className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          onClick={() => {
                            void handleGenerateDescription();
                          }}
                          disabled={generating}
                          aria-label="Generate product description"
                          aria-disabled={generating}
                          className="border border-white/20 hover:border-white/40"
                        >
                          {generating ? "Generating..." : "Generate Description"}
                        </Button>
                        <Button
                          type="button"
                          onClick={(event) => {
                            void handlePathGenerateDescription(event);
                          }}
                          aria-label="Generate description via AI Path"
                          className="border border-white/20 hover:border-white/40"
                        >
                          Path Generate Description
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            void handleTranslate();
                          }}
                          disabled={translating || !product?.id}
                          aria-label="Translate product names and descriptions"
                          aria-disabled={translating || !product?.id}
                          title={!product?.id ? "Save product before translating" : "Translate to other languages"}
                        >
                          {translating ? "Translating..." : "Translate"}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}

      <div className="mb-4 flex flex-col gap-4 md:flex-row">
        <div className="w-full md:w-1/3">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            {...register("sku")}
            aria-invalid={errors.sku ? "true" : "false"}
            aria-required="true"
          />
          {errors.sku && (
            <p className="text-red-500 text-sm mt-1" role="alert">
              {errors.sku.message}
            </p>
          )}
        </div>
        <div className="flex-1">
          <Label>Product Identifier</Label>
          <div className="flex gap-2">
            <Select
              value={identifierType}
              onValueChange={(value) =>
                setIdentifierType(value as "ean" | "gtin" | "asin")
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ean">EAN</SelectItem>
                <SelectItem value="gtin">GTIN</SelectItem>
                <SelectItem value="asin">ASIN</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id={identifierType}
              {...register(identifierType)}
              placeholder={`Enter ${identifierType.toUpperCase()}`}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="weight">Weight</Label>
          <div className="relative max-w-[160px]">
            <Input
              id="weight"
              type="number"
              className="pr-10"
              {...register("weight", { valueAsNumber: true })}
              aria-invalid={errors.weight ? "true" : "false"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              kg
            </span>
          </div>
          {errors.weight && (
            <p className="text-red-500 text-sm" role="alert">
              {errors.weight.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="sizeLength">Length</Label>
          <div className="relative max-w-[160px]">
            <Input
              id="sizeLength"
              type="number"
              className="pr-10"
              {...register("sizeLength", { valueAsNumber: true })}
              aria-invalid={errors.sizeLength ? "true" : "false"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              cm
            </span>
          </div>
          {errors.sizeLength && (
            <p className="text-red-500 text-sm" role="alert">
              {errors.sizeLength.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="sizeWidth">Width</Label>
          <div className="relative max-w-[160px]">
            <Input
              id="sizeWidth"
              type="number"
              className="pr-10"
              {...register("sizeWidth", { valueAsNumber: true })}
              aria-invalid={errors.sizeWidth ? "true" : "false"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              cm
            </span>
          </div>
          {errors.sizeWidth && (
            <p className="text-red-500 text-sm" role="alert">
              {errors.sizeWidth.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="length">Height</Label>
          <div className="relative max-w-[160px]">
            <Input
              id="length"
              type="number"
              className="pr-10"
              {...register("length", { valueAsNumber: true })}
              aria-invalid={errors.length ? "true" : "false"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              cm
            </span>
          </div>
          {errors.length && (
            <p className="text-red-500 text-sm" role="alert">
              {errors.length.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
