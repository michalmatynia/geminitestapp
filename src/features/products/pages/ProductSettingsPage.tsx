'use client';

import { useEffect, useState } from 'react';

import { InternationalizationSettings, InternationalizationProvider } from '@/features/internationalization';
import { logClientError } from '@/features/observability';
import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import { CatalogModal } from '@/features/products/components/settings/modals/CatalogModal';
import { CountryModal } from '@/features/products/components/settings/modals/CountryModal';
import { CurrencyModal } from '@/features/products/components/settings/modals/CurrencyModal';
import { LanguageModal } from '@/features/products/components/settings/modals/LanguageModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/PriceGroupModal';
import { PriceGroupsSettings } from '@/features/products/components/settings/pricing/PriceGroupsSettings';
import { ProductImageRoutingSettings } from '@/features/products/components/settings/ProductImageRoutingSettings';
import { TagsSettings } from '@/features/products/components/settings/TagsSettings';
import { ValidatorSettings } from '@/features/products/components/settings/ValidatorSettings';
import { useCatalogs, useCategories, usePriceGroups, useTags, useDeleteCatalogMutation, useDeletePriceGroupMutation, useUpdatePriceGroupMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { Catalog, PriceGroup } from '@/features/products/types';
import { Button, SectionHeader, SectionPanel, useToast } from '@/shared/ui';

import {
  settingSections,
} from './ProductSettingsConstants';

export function ProductSettingsPage(): React.JSX.Element {
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>('Categories');
  
  // Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [showPriceGroupModal, setShowPriceGroupModal] = useState(false);
  const [editingPriceGroup, setEditingPriceGroup] = useState<PriceGroup | null>(null);

  const { toast } = useToast();

  // Queries
  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups();
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs();

  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);

  const { data: productCategories = [], isLoading: loadingCategories, refetch: refetchCategories } = useCategories(selectedCategoryCatalogId);
  const { data: productTags = [], isLoading: loadingTags, refetch: refetchTags } = useTags(selectedTagCatalogId);

  // Mutations
  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();

  const defaultGroupId = priceGroups.find((g: import('@/features/products/types').PriceGroup) => g.isDefault)?.id ?? '';

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (catalogs.length > 0) {
      timer = setTimeout(() => {
        if (!selectedCategoryCatalogId) {
          const def = catalogs.find((c: Catalog) => c.isDefault) || catalogs[0];
          if (def) setSelectedCategoryCatalogId(def.id);
        }
        if (!selectedTagCatalogId) {
          const def = catalogs.find((c: Catalog) => c.isDefault) || catalogs[0];
          if (def) setSelectedTagCatalogId(def.id);
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogs, selectedCategoryCatalogId, selectedTagCatalogId]);

  const handleSetDefaultGroup = async (groupId: string): Promise<void> => {
    const group = priceGroups.find((g: PriceGroup) => g.id === groupId);
    if (!group) return;
    try {
      await updatePriceGroupMutation.mutateAsync({ ...group, isDefault: true });
      toast('Default price group updated.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'ProductSettingsPage', action: 'handleSetDefaultGroup', groupId } });
    }
  };

  const handleDeleteCatalog = async (catalog: Catalog): Promise<void> => {
    if (!confirm(`Delete catalog "${catalog.name}"?`)) return;
    try {
      await deleteCatalogMutation.mutateAsync(catalog.id);
    } catch (err) {
      logClientError(err, { context: { source: 'ProductSettingsPage', action: 'handleDeleteCatalog', catalogId: catalog.id } });
    }
  };

  const handleDeleteGroup = async (group: PriceGroup): Promise<void> => {
    if (priceGroups.length <= 1) {
      toast('At least one price group is required.', { variant: 'error' });
      return;
    }
    if (!confirm(`Delete price group "${group.name}"?`)) return;
    try {
      await deletePriceGroupMutation.mutateAsync(group.id);
    } catch (err) {
      logClientError(err, { context: { source: 'ProductSettingsPage', action: 'handleDeleteGroup', groupId: group.id } });
    }
  };

  return (
    <InternationalizationProvider>
      <SectionPanel className='p-6'>
        <SectionHeader
          title='Product Settings'
          className='mb-6'
        />
        <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
          <SectionPanel className='p-4'>
            <div className='flex flex-col gap-2'>
              {settingSections.map((section: typeof settingSections[number]) => (
                <Button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`justify-start rounded px-3 py-2 text-left text-sm transition ${
                    activeSection === section
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-muted/50/60'
                  }`}
                >
                  {section}
                </Button>
              ))}
            </div>
          </SectionPanel>
          <SectionPanel className='p-6'>
            {activeSection === 'Categories' && (
              <CategoriesSettings
                loading={loadingCategories}
                categories={productCategories}
                catalogs={catalogs}
                selectedCatalogId={selectedCategoryCatalogId}
                onCatalogChange={(id: string | null): void => { setSelectedCategoryCatalogId(id); }}
                onRefresh={() => void refetchCategories()}
              />
            )}
            {activeSection === 'Tags' && (
              <TagsSettings
                loading={loadingTags}
                tags={productTags}
                catalogs={catalogs}
                selectedCatalogId={selectedTagCatalogId}
                onCatalogChange={(id: string | null): void => { setSelectedTagCatalogId(id); }}
                onRefresh={() => void refetchTags()}
              />
            )}
            {activeSection === 'Price Groups' && (
              <PriceGroupsSettings
                loadingGroups={loadingGroups}
                priceGroups={priceGroups}
                defaultGroupId={defaultGroupId}
                onDefaultGroupChange={(id: string): void => { void handleSetDefaultGroup(id); }}
                defaultGroupSaving={updatePriceGroupMutation.isPending}
                handleOpenCreate={(): void => { setEditingPriceGroup(null); setShowPriceGroupModal(true); }}
                handleEditGroup={(g: PriceGroup): void => { setEditingPriceGroup(g); setShowPriceGroupModal(true); }}
                handleDeleteGroup={(g: PriceGroup): void => { void handleDeleteGroup(g); }}
              />
            )}
            {activeSection === 'Catalogs' && (
              <CatalogsSettings
                loadingCatalogs={loadingCatalogs}
                catalogs={catalogs}
                handleOpenCatalogModal={(): void => { setEditingCatalog(null); setShowCatalogModal(true); }}
                handleEditCatalog={(c: Catalog): void => { setEditingCatalog(c); setShowCatalogModal(true); }}
                handleDeleteCatalog={(c: Catalog): void => { void handleDeleteCatalog(c); }}
              />
            )}
            {activeSection === 'Images' && (
              <ProductImageRoutingSettings />
            )}
            {activeSection === 'Validator' && (
              <ValidatorSettings />
            )}
            {activeSection === 'Internationalization' && (
              <InternationalizationSettings />
            )}
          </SectionPanel>
        </div>

        {/* Modals */}
        <CatalogModal
          isOpen={showCatalogModal}
          onClose={() => setShowCatalogModal(false)}
          onSuccess={(): void => { setShowCatalogModal(false); }}
          catalog={editingCatalog}
          priceGroups={priceGroups}
          loadingGroups={loadingGroups}
          defaultGroupId={defaultGroupId}
        />

        <LanguageModal />

        <PriceGroupModal
          isOpen={showPriceGroupModal}
          onClose={() => setShowPriceGroupModal(false)}
          onSuccess={(): void => { setShowPriceGroupModal(false); }}
          priceGroup={editingPriceGroup}
          priceGroups={priceGroups}
        />

        <CurrencyModal />

        <CountryModal />
      </SectionPanel>
    </InternationalizationProvider>
  );
}
