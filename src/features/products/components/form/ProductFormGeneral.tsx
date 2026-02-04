"use client";

import { Input, Label, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, UnifiedSelect, SectionPanel } from "@/shared/ui";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";

import { cn } from "@/shared/utils";
import { ProductFormData } from "@/features/products/types";

export default function ProductFormGeneral(): React.JSX.Element {
  const {
    filteredLanguages,
    errors,
  } = useProductFormContext();

  const { register, getValues, watch } = useFormContext<ProductFormData>();

  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">((): "ean" | "gtin" | "asin" => {
    const vals = getValues();
    if (vals.asin) return "asin";
    if (vals.gtin) return "gtin";
    return "ean";
  });
  const allValues = watch();
  const hasCatalogs = (filteredLanguages ?? []).length > 0;
  const languagesReady = (filteredLanguages ?? []).length > 0;

  return (
    <div className="space-y-4">
      {!hasCatalogs && (
        <SectionPanel variant="subtle-compact" className="border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Select a catalog to edit product titles and descriptions. Language fields are based on catalog settings.
        </SectionPanel>
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
            <UnifiedSelect
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as "ean" | "gtin" | "asin")
              }
              options={[
                { value: "ean", label: "EAN" },
                { value: "gtin", label: "GTIN" },
                { value: "asin", label: "ASIN" },
              ]}
              className="w-[100px]"
            />
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
