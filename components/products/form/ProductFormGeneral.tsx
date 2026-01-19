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

export default function ProductFormGeneral() {
  const {
    filteredLanguages,
    errors,
    generationError,
    setGenerationError,
    product,
    imageSlots,
  } = useProductFormContext();

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  
  const [generating, setGenerating] = useState(false);
  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">("ean");
  const allValues = watch();

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

        const enqueueData = await enqueueRes.json();
        if (!enqueueRes.ok) throw new Error(enqueueData.error || "Failed to enqueue generation job.");
        const jobId = enqueueData.jobId;

        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
          if (!statusRes.ok) break;
          const { job } = await statusRes.json();

          if (job.status === "completed") {
            const { description } = job.result;
            setValue("description_en", description);
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

  return (
    <div className="space-y-4">
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
                  <Button
                    type="button"
                    onClick={() => {
                      void handleGenerateDescription();
                    }}
                    disabled={generating}
                    className="mt-2"
                    aria-label="Generate product description"
                    aria-disabled={generating}
                  >
                    {generating ? "Generating..." : "Generate Description"}
                  </Button>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

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
