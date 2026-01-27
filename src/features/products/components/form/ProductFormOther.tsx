"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ProductFormData } from "@/features/products/types";

export default function ProductFormOther() {
  const {
    errors,
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryIds,
    toggleCategory,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    filteredPriceGroups,
    product,
  } = useProductFormContext();

  const { register, setValue, getValues, watch } = useFormContext<ProductFormData>();

  const basePrice = watch("price") || 0;
  const selectedDefaultPriceGroupId = watch("defaultPriceGroupId");
  const hasCatalogs = selectedCatalogIds.length > 0;
  const selectedCatalogLabels = catalogs
    .filter((catalog) => selectedCatalogIds.includes(catalog.id))
    .map((catalog) => catalog.name);
  const selectedCatalogSummary = selectedCatalogLabels.length
    ? selectedCatalogLabels.join(", ")
    : "Select catalogs";

  // Check if price group is auto-assigned from catalog (for new products only)
  const isNewProduct = !product;
  const selectedCatalog = catalogs.find((c) => selectedCatalogIds.includes(c.id));
  const isPriceGroupAutoAssigned = !!(isNewProduct && selectedCatalog?.defaultPriceGroupId);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const filteredCategories = useMemo(() => {
    const normalized = categoryQuery.trim().toLowerCase();
    if (!normalized) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalized)
    );
  }, [categories, categoryQuery]);
  const filteredTags = useMemo(() => {
    const normalized = tagQuery.trim().toLowerCase();
    if (!normalized) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalized));
  }, [tags, tagQuery]);

  // Calculate prices for all price groups
  const priceGroupPrices = filteredPriceGroups.map((group) => {
    if (!group.sourceGroupId || !group.priceMultiplier) {
      // This is a base price group (not dependent)
      return {
        ...group,
        calculatedPrice: group.id === selectedDefaultPriceGroupId ? basePrice : null,
        isCalculated: false,
        sourceGroupName: undefined as string | undefined,
      };
    }

    // This is a dependent price group
    // Find the source group's price
    const sourceGroup = filteredPriceGroups.find((g) => g.id === group.sourceGroupId);
    if (!sourceGroup) {
      return {
        ...group,
        calculatedPrice: null,
        isCalculated: true,
        sourceGroupName: undefined as string | undefined,
      };
    }

    // If the source group is the selected default, use the base price
    const sourcePrice = sourceGroup.id === selectedDefaultPriceGroupId ? basePrice : null;
    const calculatedPrice = sourcePrice ? sourcePrice * group.priceMultiplier : null;

    return {
      ...group,
      calculatedPrice,
      isCalculated: true,
      sourceGroupName: sourceGroup.name as string | undefined,
    };
  });

  return (
    <div className="space-y-4">
      {!hasCatalogs && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Select a catalog to set pricing and price groups.
        </div>
      )}
      {hasCatalogs && (
        <>
          <div className="mb-4">
            <Label htmlFor="price">Base Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register("price", { valueAsNumber: true })}
              aria-invalid={errors.price ? "true" : "false"}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {errors.price.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <Label htmlFor="defaultPriceGroupId">
              Default Price Group
              {isPriceGroupAutoAssigned && (
                <span className="ml-2 text-xs text-muted-foreground">(Auto-assigned from catalog)</span>
              )}
            </Label>
            <Select
              onValueChange={(value) => setValue("defaultPriceGroupId", value)}
              value={getValues("defaultPriceGroupId") || ""}
              disabled={isPriceGroupAutoAssigned}
            >
              <SelectTrigger className={isPriceGroupAutoAssigned ? "cursor-not-allowed opacity-60" : ""}>
                <SelectValue placeholder="Select default price group" />
              </SelectTrigger>
              <SelectContent>
                {filteredPriceGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} {group.isDefault ? "(Default)" : ""}{" "}
                    ({group.currency?.code ?? group.currencyCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDefaultPriceGroupId && filteredPriceGroups.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">Price Groups Overview</Label>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Price Group</th>
                      <th className="px-3 py-2 text-left font-medium">Currency</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceGroupPrices.map((group) => (
                      <tr key={group.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={group.id === selectedDefaultPriceGroupId ? "font-semibold" : ""}>
                              {group.name}
                            </span>
                            {group.id === selectedDefaultPriceGroupId && (
                              <span className="text-xs text-muted-foreground">(Selected)</span>
                            )}
                            {group.isCalculated && group.sourceGroupName && (
                              <span className="text-xs text-muted-foreground">
                                (from {group.sourceGroupName} × {group.priceMultiplier})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">{group.currency?.code ?? group.currencyCode}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {group.calculatedPrice !== null ? (
                            <span className={group.isCalculated ? "text-blue-600" : ""}>
                              {group.calculatedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Blue prices are calculated based on the selected default price group and multipliers.
              </p>
            </div>
          )}
        </>
      )}
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
        <Label className="mb-2 block">Catalogs</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedCatalogIds.length > 0
                ? selectedCatalogSummary
                : "Select catalogs"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {catalogsLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : catalogsError ? (
              <div className="p-2 text-sm text-red-500">{catalogsError}</div>
            ) : catalogs.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No catalogs found</div>
            ) : (
              catalogs.map((catalog) => (
                <DropdownMenuCheckboxItem
                  key={catalog.id}
                  checked={selectedCatalogIds.includes(catalog.id)}
                  onCheckedChange={() => toggleCatalog(catalog.id)}
                >
                  {catalog.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mb-4">
        <Label className="mb-2 block">Categories</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={selectedCatalogIds.length === 0}>
              {selectedCategoryIds.length > 0
                ? `${selectedCategoryIds.length} categor${selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected`
                : selectedCatalogIds.length === 0
                ? "Select a catalog first"
                : "Select categories"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {categoriesLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No categories found</div>
            ) : (
              <>
                <div className="p-2">
                  <div className="relative">
                    <Input
                      value={categoryQuery}
                      onChange={(event) => setCategoryQuery(event.target.value)}
                      placeholder="Search categories..."
                      className="h-8 pr-8"
                    />
                    {categoryQuery && (
                      <Button
                        type="button"
                        onClick={() => setCategoryQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        aria-label="Clear category search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {filteredCategories.length === 0 ? (
                  <div className="px-2 pb-2 text-sm text-muted-foreground">No matching categories</div>
                ) : (
                  filteredCategories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category.id}
                      checked={selectedCategoryIds.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    >
                      {category.name}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mb-4">
        <Label className="mb-2 block">Tags</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={selectedCatalogIds.length === 0}>
              {selectedTagIds.length > 0
                ? `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'} selected`
                : selectedCatalogIds.length === 0
                ? "Select a catalog first"
                : "Select tags"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {tagsLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : tags.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No tags found</div>
            ) : (
              <>
                <div className="p-2">
                  <div className="relative">
                    <Input
                      value={tagQuery}
                      onChange={(event) => setTagQuery(event.target.value)}
                      placeholder="Search tags..."
                      className="h-8 pr-8"
                    />
                    {tagQuery && (
                      <Button
                        type="button"
                        onClick={() => setTagQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        aria-label="Clear tag search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {filteredTags.length === 0 ? (
                  <div className="px-2 pb-2 text-sm text-muted-foreground">No matching tags</div>
                ) : (
                  filteredTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
