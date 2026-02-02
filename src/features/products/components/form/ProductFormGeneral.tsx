"use client";

import { Button, Input, Label, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from "@/shared/ui";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";

import { logger } from "@/shared/utils/logger";
import { cn } from "@/shared/utils";
import { ProductFormData } from "@/features/products/types";
import { useDescriptionGeneration } from "@/features/products/hooks/useDescriptionGeneration";

export default function ProductFormGeneral(): React.JSX.Element {
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

  const [translating, setTranslating] = useState<boolean>(false);
  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">("ean");
  const allValues = watch();
  const hasCatalogs = selectedCatalogIds.length > 0;
  const languagesReady = filteredLanguages.length > 0;

  const { generate, generating } = useDescriptionGeneration({
    ...(product?.id ? { productId: product.id } : {}),
    onSuccess: (description: string) => {
      setValue("description_en", description);
    },
    onError: (error: string) => {
      setGenerationError(error);
    },
  });

  useEffect((): void => {
    const vals = getValues();
    if (vals.asin) {
      setIdentifierType("asin");
    } else if (vals.gtin) {
      setIdentifierType("gtin");
    }
  }, [getValues]);

  const handleGenerateDescription = async (): Promise<void> => {
    logger.log("Generating description...");
    setGenerationError(null);
    const productData = getValues();
    await generate(productData, imageSlots);
  };

  const handleTranslate = async (): Promise<void> => {
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
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
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
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName];
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-name`}>
                  <Label htmlFor={fieldName}>{language.name} Name</Label>
                  <Input
                    id={fieldName}
                    {...register(fieldName)}
                    aria-invalid={error ? "true" : "false"}
                  />
                  {error && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {error.message}
                    </p>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-description` : "english-description"} className="mb-4">
            <TabsList>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
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
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName];
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-description`}>
                  <Label htmlFor={fieldName}>{language.name} Description</Label>
                  <Textarea
                    id={fieldName}
                    {...register(fieldName)}
                    aria-invalid={error ? "true" : "false"}
                  />
                  {error && (
                    <p className="text-red-500 text-sm mt-1" role="alert">
                      {error.message}
                    </p>
                  )}
                  {language.code === "EN" && (
                    <>
                      {generationError && (
                        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                          {generationError}
                          <Button
                            onClick={(): void => setGenerationError(null)}
                            className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
	                      <div className="flex gap-2 mt-2">
	                        <Button
	                          type="button"
	                          onClick={(): void => {
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
	                          variant="outline"
	                          onClick={(): void => {
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
              onValueChange={(value: string): void =>
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
