"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useSearchParams } from "next/navigation";

import ProductImageManager from "./ProductImageManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import { ProductFormData } from "@/lib/types";
import { logger } from "@/lib/logger";
import DebugPanel from "@/components/DebugPanel";
import { cn } from "@/lib/utils";

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
}

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText,
  skuRequired = false,
}: ProductFormProps) {
  const {
    handleSubmit,
    errors,
    setShowFileManager,
    uploading,
    uploadError,
    uploadSuccess,
    imageSlots, // Use imageSlots from context
    handleMultiImageChange,
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    filteredLanguages,
    generationError,
    setGenerationError,
  } = useProductFormContext();
  const [generating, setGenerating] = useState(false);
  const { register, getValues, setValue, watch } =
    useFormContext<ProductFormData>();
  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const nameEn = watch("name_en");
  const namePl = watch("name_pl");
  const nameDe = watch("name_de");
  const descriptionEn = watch("description_en");
  const descriptionPl = watch("description_pl");
  const descriptionDe = watch("description_de");

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

  /**
   * Calls the API to generate a product description based on the current form data.
   */
  const handleGenerateDescription = async () => {
    logger.log("Generating description...");
    setGenerating(true);
    setGenerationError(null);
    const productData = getValues();
    // Derive imageUrls from imageSlots
    const imageUrls = imageSlots
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => slot.previewUrl);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productData, imageUrls }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string; errorId?: string };
        const message = payload?.error || "Failed to generate description";
        const errorIdSuffix = payload?.errorId ? ` (Error ID: ${payload.errorId})` : "";
        throw new Error(`${message}${errorIdSuffix}`);
      }
      const { description } = (await res.json()) as { description: string };
      setValue("description_en", description);
    } catch (error) {
      logger.error("Failed to generate description:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate description.";
      setGenerationError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {isDebugOpen && <DebugPanel />}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <div className="mb-4">
            <Label htmlFor="sku">
              SKU{skuRequired ? " *" : ""}
            </Label>
            <Input
              id="sku"
              {...register("sku")}
              aria-invalid={errors.sku ? "true" : "false"}
              aria-required={skuRequired ? "true" : "false"}
            />
            {errors.sku && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.sku.message}
              </p>
            )}
          </div>

          <Tabs defaultValue="english-name" className="mb-4">
            <TabsList>
              {filteredLanguages.some((language) => language.code === "EN") && (
                <TabsTrigger
                  value="english-name"
                  className={cn(
                    !nameEn?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  English Name
                </TabsTrigger>
              )}
              {filteredLanguages.some((language) => language.code === "PL") && (
                <TabsTrigger
                  value="polish-name"
                  className={cn(
                    !namePl?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  Polish Name
                </TabsTrigger>
              )}
              {filteredLanguages.some((language) => language.code === "DE") && (
                <TabsTrigger
                  value="german-name"
                  className={cn(
                    !nameDe?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  German Name
                </TabsTrigger>
              )}
            </TabsList>
            {filteredLanguages.some((language) => language.code === "EN") && (
              <TabsContent value="english-name">
              <Label htmlFor="name_en">English Name</Label>
              <Input
                id="name_en"
                {...register("name_en")}
                aria-invalid={errors.name_en ? "true" : "false"}
              />
              {errors.name_en && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.name_en.message}
                </p>
              )}
              </TabsContent>
            )}
            {filteredLanguages.some((language) => language.code === "PL") && (
              <TabsContent value="polish-name">
              <Label htmlFor="name_pl">Polish Name</Label>
              <Input
                id="name_pl"
                {...register("name_pl")}
                aria-invalid={errors.name_pl ? "true" : "false"}
              />
              {errors.name_pl && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.name_pl.message}
                </p>
              )}
              </TabsContent>
            )}
            {filteredLanguages.some((language) => language.code === "DE") && (
              <TabsContent value="german-name">
              <Label htmlFor="name_de">German Name</Label>
              <Input
                id="name_de"
                {...register("name_de")}
                aria-invalid={errors.name_de ? "true" : "false"}
              />
              {errors.name_de && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.name_de.message}
                </p>
              )}
              </TabsContent>
            )}
          </Tabs>

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
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <div className="mb-4">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              {...register("price", { valueAsNumber: true })}
              aria-invalid={errors.price ? "true" : "false"}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.price.message}
              </p>
            )}
          </div>
          <Tabs defaultValue="english-description" className="mb-4">
            <TabsList>
              {filteredLanguages.some((language) => language.code === "EN") && (
                <TabsTrigger
                  value="english-description"
                  className={cn(
                    !descriptionEn?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  English Description
                </TabsTrigger>
              )}
              {filteredLanguages.some((language) => language.code === "PL") && (
                <TabsTrigger
                  value="polish-description"
                  className={cn(
                    !descriptionPl?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  Polish Description
                </TabsTrigger>
              )}
              {filteredLanguages.some((language) => language.code === "DE") && (
                <TabsTrigger
                  value="german-description"
                  className={cn(
                    !descriptionDe?.trim()
                      ? "text-muted-foreground/90 data-[state=active]:text-muted-foreground/90"
                      : "text-foreground data-[state=inactive]:text-foreground font-medium"
                  )}
                >
                  German Description
                </TabsTrigger>
              )}
            </TabsList>
            {filteredLanguages.some((language) => language.code === "EN") && (
              <TabsContent value="english-description">
              <Label htmlFor="description_en">English Description</Label>
              <Textarea
                id="description_en"
                {...register("description_en")}
                aria-invalid={errors.description_en ? "true" : "false"}
              />
              {errors.description_en && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.description_en.message}
                </p>
              )}
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
              </TabsContent>
            )}
            {filteredLanguages.some((language) => language.code === "PL") && (
              <TabsContent value="polish-description">
              <Label htmlFor="description_pl">Polish Description</Label>
              <Textarea
                id="description_pl"
                {...register("description_pl")}
                aria-invalid={errors.description_pl ? "true" : "false"}
              />
              {errors.description_pl && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.description_pl.message}
                </p>
              )}
              </TabsContent>
            )}
            {filteredLanguages.some((language) => language.code === "DE") && (
              <TabsContent value="german-description">
              <Label htmlFor="description_de">German Description</Label>
              <Textarea
                id="description_de"
                {...register("description_de")}
                aria-invalid={errors.description_de ? "true" : "false"}
              />
              {errors.description_de && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {errors.description_de.message}
                </p>
              )}
              </TabsContent>
            )}
          </Tabs>
          <div className="mb-4">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              {...register("supplierName")}
              aria-invalid={errors.supplierName ? "true" : "false"}
            />
            {errors.supplierName && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.supplierName.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <Label htmlFor="supplierLink">Supplier Link</Label>
            <Input
              id="supplierLink"
              {...register("supplierLink")}
              aria-invalid={errors.supplierLink ? "true" : "false"}
            />
            {errors.supplierLink && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.supplierLink.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <Label htmlFor="priceComment">Price Comment</Label>
            <Input
              id="priceComment"
              {...register("priceComment")}
              aria-invalid={errors.priceComment ? "true" : "false"}
            />
            {errors.priceComment && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.priceComment.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              {...register("stock", { valueAsNumber: true })}
              aria-invalid={errors.stock ? "true" : "false"}
            />
            {errors.stock && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.stock.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <Label>Catalogs</Label>
            {catalogsLoading ? (
              <p className="mt-2 text-sm text-gray-400">Loading catalogs...</p>
            ) : catalogsError ? (
              <p className="mt-2 text-sm text-red-400">{catalogsError}</p>
            ) : catalogs.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">
                No catalogs yet. Create one in Product Settings.
              </p>
            ) : (
              <div className="mt-2 space-y-2 rounded-md border border-gray-800 bg-gray-950/40 p-3">
                {catalogs.map((catalog) => (
                  <label
                    key={catalog.id}
                    className="flex items-start gap-2 text-sm text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCatalogIds.includes(catalog.id)}
                      onChange={() => toggleCatalog(catalog.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-white">
                        {catalog.name}
                      </span>
                      {catalog.description ? (
                        <span className="block text-xs text-gray-400">
                          {catalog.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          <div className="mb-4">
            <Label htmlFor="multi-image-upload">Upload Multiple Images</Label>
            <div className="mt-2 flex space-x-4">
              <Button
                type="button"
                onClick={() => document.getElementById("multi-image-upload")?.click()}
                aria-label="Upload multiple new images for the product"
              >
                Upload from Drive
              </Button>
              <Button
                type="button"
                onClick={() => setShowFileManager(true)}
                aria-label="Choose multiple existing images for the product"
              >
                Choose from File Manager
              </Button>
            </div>
            <Input
              type="file"
              id="multi-image-upload"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  // Convert FileList to an array before passing
                  handleMultiImageChange(Array.from(e.target.files));
                  e.target.value = ''; // Clear the input after selection
                }
              }}
              className="hidden"
              aria-label="Multiple product image upload"
              multiple
            />
          </div>
          <ProductImageManager />
        </TabsContent>
      </Tabs>
      <div className="mt-4">
        <Button type="submit" disabled={uploading} aria-disabled={uploading}>
          {uploading ? "Saving..." : submitButtonText}
        </Button>
      </div>
      {(uploadSuccess || uploadError) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-md px-4 py-3 text-sm shadow-lg ${
              uploadError
                ? "bg-red-500 text-white"
                : "bg-emerald-500 text-white"
            }`}
            role={uploadError ? "alert" : "status"}
          >
            {uploadError ? uploadError : "Saved."}
          </div>
        </div>
      )}
    </form>
  );
}
