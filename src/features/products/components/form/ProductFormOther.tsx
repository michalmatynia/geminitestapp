'use client';

import { useFormContext } from 'react-hook-form';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { ProductFormData, CatalogRecord, ProductCategory, ProductTag, PriceGroupWithDetails, Producer } from '@/features/products/types';
import { Input, UnifiedSelect, FormSection, FormField, MultiSelect } from '@/shared/ui';

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

  const basePrice = watch('price') || 0;
  const selectedDefaultPriceGroupId = watch('defaultPriceGroupId');
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
        sourceGroupName: undefined,
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
        sourceGroupName: undefined,
      };
    }

    // If the source group is the selected default, use the base price
    const sourcePrice = sourceGroup.id === selectedDefaultPriceGroupId ? basePrice : null;
    const calculatedPrice = sourcePrice ? sourcePrice * group.priceMultiplier : null;

    return {
      ...group,
      calculatedPrice,
      isCalculated: true,
      sourceGroupName: sourceGroup.name,
    };
  });

  return (
    <div className="space-y-6">
      {!hasCatalogs && (
        <FormSection variant="subtle-compact" className="border-amber-500/40 bg-amber-500/10 text-amber-100">
          <p className="text-sm">Select a catalog to set pricing and price groups.</p>
        </FormSection>
      )}

      {hasCatalogs && (
        <FormSection title="Pricing" gridClassName="md:grid-cols-2">
          <FormField label="Base Price" error={errors.price?.message} id="price">
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </FormField>

          <FormField 
            label="Default Price Group" 
            id="defaultPriceGroupId"
            description={isPriceGroupAutoAssigned ? 'Auto-assigned from catalog' : undefined}
          >
            <UnifiedSelect
              onValueChange={(value: string) => setValue('defaultPriceGroupId', value)}
              value={selectedDefaultPriceGroupId || ''}
              disabled={isPriceGroupAutoAssigned}
              options={filteredPriceGroups.map((group: PriceGroupWithDetails) => ({
                value: group.id,
                label: `${group.name}${group.isDefault ? ' (Default)' : ''} (${group.currency?.code ?? group.currencyCode})`
              }))}
              placeholder="Select default price group"
              triggerClassName={isPriceGroupAutoAssigned ? 'cursor-not-allowed opacity-60' : ''}
            />
          </FormField>

          {selectedDefaultPriceGroupId && filteredPriceGroups.length > 0 && (
            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Price Groups Overview</label>
              <div className="rounded-md border border-border bg-card/40 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-400">Price Group</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-400">Currency</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-400">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceGroupPrices.map((group: PriceGroupWithCalculatedPrice) => (
                      <tr key={group.id} className="border-b last:border-0 border-border/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={group.id === selectedDefaultPriceGroupId ? 'font-semibold text-white' : 'text-gray-300'}>
                              {group.name}
                            </span>
                            {group.id === selectedDefaultPriceGroupId && (
                              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-tighter">Selected</span>
                            )}
                            {group.isCalculated && group.sourceGroupName && (
                              <span className="text-[10px] text-gray-500 italic">
                                ({group.sourceGroupName} × {group.priceMultiplier})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{group.currency?.code ?? group.currencyCode}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {group.calculatedPrice !== null ? (
                            <span className={group.isCalculated ? 'text-blue-400' : 'text-white'}>
                              {group.calculatedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500 italic">
                Blue prices are automatically calculated based on the default group.
              </p>
            </div>
          )}
        </FormSection>
      )}

      <FormSection title="Organization" gridClassName="md:grid-cols-2">
        <FormField label="Supplier Name" error={errors.supplierName?.message} id="supplierName">
          <Input id="supplierName" {...register('supplierName')} placeholder="e.g. Acme Corp" />
        </FormField>

        <FormField label="Supplier Link" error={errors.supplierLink?.message} id="supplierLink">
          <Input id="supplierLink" {...register('supplierLink')} placeholder="https://..." />
        </FormField>

        <FormField label="Price Comment" error={errors.priceComment?.message} id="priceComment">
          <Input id="priceComment" {...register('priceComment')} placeholder="Internal notes about pricing" />
        </FormField>

        <FormField label="Stock" error={errors.stock?.message} id="stock">
          <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} placeholder="0" />
        </FormField>
      </FormSection>

      <FormSection title="Relationships" gridClassName="md:grid-cols-2">
        <div className="space-y-4 md:col-span-2">
          <MultiSelect
            label="Catalogs"
            options={catalogs.map((c: CatalogRecord) => ({ value: c.id, label: c.name }))}
            selected={selectedCatalogIds}
            onChange={(values: string[]) => {
              const added = values.find((id: string) => !selectedCatalogIds.includes(id));
              const removed = selectedCatalogIds.find((id: string) => !values.includes(id));
              if (added) toggleCatalog(added);
              if (removed) toggleCatalog(removed);
            }}
            loading={catalogsLoading}
            emptyMessage={catalogsError || 'No catalogs found'}
            placeholder="Select catalogs"
            searchPlaceholder="Search catalogs..."
          />

          <MultiSelect
            label="Categories"
            options={categories.map((c: ProductCategory) => ({ value: c.id, label: c.name }))}
            selected={selectedCategoryId ? [selectedCategoryId] : []}
            onChange={(values: string[]) => {
              setCategoryId(values[0] || null);
            }}
            loading={categoriesLoading}
            disabled={!hasCatalogs}
            placeholder={hasCatalogs ? 'Select category' : 'Select a catalog first'}
            searchPlaceholder="Search categories..."
            single
          />

          <MultiSelect
            label="Tags"
            options={tags.map((t: ProductTag) => ({ value: t.id, label: t.name }))}
            selected={selectedTagIds}
            onChange={(values: string[]) => {
              const added = values.find((id: string) => !selectedTagIds.includes(id));
              const removed = selectedTagIds.find((id: string) => !values.includes(id));
              if (added) toggleTag(added);
              if (removed) toggleTag(removed);
            }}
            loading={tagsLoading}
            disabled={!hasCatalogs}
            placeholder={hasCatalogs ? 'Select tags' : 'Select a catalog first'}
            searchPlaceholder="Search tags..."
          />

          <MultiSelect
            label="Producers"
            options={producers.map((p: Producer) => ({ value: p.id, label: p.name }))}
            selected={selectedProducerIds}
            onChange={(values: string[]) => {
              const added = values.find((id: string) => !selectedProducerIds.includes(id));
              const removed = selectedProducerIds.find((id: string) => !values.includes(id));
              if (added) toggleProducer(added);
              if (removed) toggleProducer(removed);
            }}
            loading={producersLoading}
            placeholder="Select producers"
            searchPlaceholder="Search producers..."
          />
        </div>
      </FormSection>
    </div>
  );
}