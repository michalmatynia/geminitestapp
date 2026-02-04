import { Button, Input, Label, UnifiedSelect, SectionPanel, MultiSelect } from "@/shared/ui";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";

import { ProductFormData, CatalogRecord, ProductCategory, ProductTag, PriceGroupWithDetails, Producer } from "@/features/products/types";

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

export default function ProductFormOther(): React.JSX.Element {
  const {
    errors,
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryId,
    setCategoryId,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    producers,
    producersLoading,
    selectedProducerIds,
    toggleProducer,
    filteredPriceGroups,
    product,
  } = useProductFormContext();

  const { register, setValue, watch } = useFormContext<ProductFormData>();

  const basePrice = watch("price") || 0;
  const selectedDefaultPriceGroupId = watch("defaultPriceGroupId");
  const hasCatalogs = selectedCatalogIds.length > 0;

  // Check if price group is auto-assigned from catalog (for new products only)
  const isNewProduct = !product;
  const selectedCatalog = catalogs.find((c: CatalogRecord) => selectedCatalogIds.includes(c.id));
  const isPriceGroupAutoAssigned = !!(isNewProduct && selectedCatalog?.defaultPriceGroupId);

  // Calculate prices for all price groups
  const priceGroupPrices = filteredPriceGroups.map((group: PriceGroupWithDetails) => {
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
    const sourceGroup = filteredPriceGroups.find((g: PriceGroupWithDetails) => g.id === group.sourceGroupId);
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
        <SectionPanel variant="subtle-compact" className="border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Select a catalog to set pricing and price groups.
        </SectionPanel>
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
            <UnifiedSelect
              onValueChange={(value: string) => setValue("defaultPriceGroupId", value)}
              value={selectedDefaultPriceGroupId || ""}
              disabled={isPriceGroupAutoAssigned}
              options={filteredPriceGroups.map((group: PriceGroupWithDetails) => ({
                value: group.id,
                label: `${group.name}${group.isDefault ? " (Default)" : ""} (${group.currency?.code ?? group.currencyCode})`
              }))}
              placeholder="Select default price group"
              triggerClassName={isPriceGroupAutoAssigned ? "cursor-not-allowed opacity-60" : ""}
            />
          </div>
          {selectedDefaultPriceGroupId && filteredPriceGroups.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">Price Groups Overview</Label>
              <SectionPanel variant="subtle" className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Price Group</th>
                      <th className="px-3 py-2 text-left font-medium">Currency</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceGroupPrices.map((group: PriceGroupWithCalculatedPrice) => (
                      <tr key={group.id} className="border-b last:border-0 border-border/50">
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
                        <td className="px-3 py-2 text-gray-400">{group.currency?.code ?? group.currencyCode}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {group.calculatedPrice !== null ? (
                            <span className={group.isCalculated ? "text-blue-400" : "text-white"}>
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
              </SectionPanel>
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
        <MultiSelect
          label="Catalogs"
          options={catalogs.map((c: CatalogRecord) => ({ value: c.id, label: c.name }))}
          selected={selectedCatalogIds}
          onChange={(values: string[]) => {
            // Find which one changed
            const added = values.find(id => !selectedCatalogIds.includes(id));
            const removed = selectedCatalogIds.find(id => !values.includes(id));
            if (added) toggleCatalog(added);
            if (removed) toggleCatalog(removed);
          }}
          loading={catalogsLoading}
          emptyMessage={catalogsError || "No catalogs found"}
          placeholder="Select catalogs"
          searchPlaceholder="Search catalogs..."
        />
      </div>

      <div className="mb-4">
        <MultiSelect
          label="Categories"
          options={categories.map((c: ProductCategory) => ({ value: c.id, label: c.name }))}
          selected={selectedCategoryId ? [selectedCategoryId] : []}
          onChange={(values: string[]) => {
            setCategoryId(values[0] || null);
          }}
          loading={categoriesLoading}
          disabled={!hasCatalogs}
          placeholder={hasCatalogs ? "Select category" : "Select a catalog first"}
          searchPlaceholder="Search categories..."
          single
        />
      </div>

      <div className="mb-4">
        <MultiSelect
          label="Tags"
          options={tags.map((t: ProductTag) => ({ value: t.id, label: t.name }))}
          selected={selectedTagIds}
          onChange={(values: string[]) => {
            const added = values.find(id => !selectedTagIds.includes(id));
            const removed = selectedTagIds.find(id => !values.includes(id));
            if (added) toggleTag(added);
            if (removed) toggleTag(removed);
          }}
          loading={tagsLoading}
          disabled={!hasCatalogs}
          placeholder={hasCatalogs ? "Select tags" : "Select a catalog first"}
          searchPlaceholder="Search tags..."
        />
      </div>

      <div className="mb-4">
        <MultiSelect
          label="Producers"
          options={producers.map((p: Producer) => ({ value: p.id, label: p.name }))}
          selected={selectedProducerIds}
          onChange={(values: string[]) => {
            const added = values.find(id => !selectedProducerIds.includes(id));
            const removed = selectedProducerIds.find(id => !values.includes(id));
            if (added) toggleProducer(added);
            if (removed) toggleProducer(removed);
          }}
          loading={producersLoading}
          placeholder="Select producers"
          searchPlaceholder="Search producers..."
        />
      </div>
    </div>
  );
}
