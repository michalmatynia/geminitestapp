'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { ParametersSettings } from '@/features/products/components/constructor/ParametersSettings';
import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import { CatalogModal } from '@/features/products/components/settings/modals/catalog-modal/CatalogModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/price-group-modal/PriceGroupModal';
import { PriceGroupsSettings } from '@/features/products/components/settings/pricing/PriceGroupsSettings';
import { ProductImageRoutingSettings } from '@/features/products/components/settings/ProductImageRoutingSettings';
import { ProductSettingsProvider } from '@/features/products/components/settings/ProductSettingsContext';
import { ShippingGroupsSettings } from '@/features/products/components/settings/ShippingGroupsSettings';
import { TagsSettings } from '@/features/products/components/settings/TagsSettings';
import { ValidatorDefaultPanel } from '@/features/products/components/settings/validator-settings/ValidatorDefaultPanel';
import { ValidatorDocsTooltipsProvider } from '@/features/products/components/settings/validator-settings/ValidatorDocsTooltips';
import { ValidatorSettings } from '@/features/products/components/settings/ValidatorSettings';
import {
  useCatalogs,
  useCategories,
  useDeleteCatalogMutation,
  useDeletePriceGroupMutation,
  useParameters,
  usePriceGroups,
  useShippingGroups,
  useTags,
  useUpdatePriceGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { settingSections } from './ProductSettingsConstants';

export type ProductSettingsPageProps = {
  internationalizationSettingsSlot?: React.ReactNode;
  internationalizationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  internationalizationModalsSlot?: React.ReactNode;
  productSyncSettingsSlot?: React.ReactNode;
};

const toSettingSectionSlug = (section: (typeof settingSections)[number]): string =>
  section
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveSettingSectionFromParam = (
  value: string | null | undefined
): (typeof settingSections)[number] | null => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return settingSections.find((section) => toSettingSectionSlug(section) === normalized) ?? null;
};

export function ProductSettingsPage({
  internationalizationSettingsSlot,
  internationalizationProvider: InternationalizationProvider = ({ children }) => <>{children}</>,
  internationalizationModalsSlot,
  productSyncSettingsSlot,
}: ProductSettingsPageProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedSection = resolveSettingSectionFromParam(searchParams?.get('section'));
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>(requestedSection ?? 'Categories');

  // Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [showPriceGroupModal, setShowPriceGroupModal] = useState(false);
  const [editingPriceGroup, setEditingPriceGroup] = useState<PriceGroup | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
      } | null>(null);

  const { toast } = useToast();
  const isCategoriesSectionActive = activeSection === 'Categories';
  const isShippingGroupsSectionActive = activeSection === 'Shipping Groups';
  const isTagsSectionActive = activeSection === 'Tags';
  const isParametersSectionActive = activeSection === 'Parameters';
  const isPriceGroupsSectionActive = activeSection === 'Price Groups';
  const isCatalogsSectionActive = activeSection === 'Catalogs';
  const shouldLoadCatalogs =
    isCategoriesSectionActive ||
    isShippingGroupsSectionActive ||
    isTagsSectionActive ||
    isParametersSectionActive ||
    isCatalogsSectionActive;
  const shouldLoadPriceGroups =
    isPriceGroupsSectionActive || showCatalogModal || showPriceGroupModal;

  // Queries
  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups({
    enabled: shouldLoadPriceGroups,
  });
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs({
    enabled: shouldLoadCatalogs,
  });

  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedShippingGroupCatalogId, setSelectedShippingGroupCatalogId] = useState<string | null>(
    null
  );
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);
  const [selectedParameterCatalogId, setSelectedParameterCatalogId] = useState<string | null>(null);

  const {
    data: productCategories = [],
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useCategories(selectedCategoryCatalogId, { enabled: isCategoriesSectionActive });
  const {
    data: shippingGroups = [],
    isLoading: loadingShippingGroups,
    refetch: refetchShippingGroups,
  } = useShippingGroups(selectedShippingGroupCatalogId, {
    enabled: isShippingGroupsSectionActive,
  });
  const {
    data: productTags = [],
    isLoading: loadingTags,
    refetch: refetchTags,
  } = useTags(selectedTagCatalogId, { enabled: isTagsSectionActive });
  const {
    data: productParameters = [],
    isLoading: loadingParameters,
    refetch: refetchParameters,
  } = useParameters(selectedParameterCatalogId, { enabled: isParametersSectionActive });

  // Mutations
  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();

  const defaultGroupId =
    priceGroups.find((g: import('@/shared/contracts/products').PriceGroup) => g.isDefault)?.id ??
    '';

  useEffect(() => {
    if (!requestedSection || requestedSection === activeSection) return;
    setActiveSection(requestedSection);
  }, [activeSection, requestedSection]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (catalogs.length > 0 && shouldLoadCatalogs) {
      timer = setTimeout(() => {
        const def = catalogs.find((c: Catalog) => c.isDefault) || catalogs[0];
        if (!def) return;

        if (isCategoriesSectionActive && !selectedCategoryCatalogId) {
          setSelectedCategoryCatalogId(def.id);
        }
        if (isShippingGroupsSectionActive && !selectedShippingGroupCatalogId) {
          setSelectedShippingGroupCatalogId(def.id);
        }
        if (isTagsSectionActive && !selectedTagCatalogId) {
          setSelectedTagCatalogId(def.id);
        }
        if (isParametersSectionActive && !selectedParameterCatalogId) {
          setSelectedParameterCatalogId(def.id);
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [
    catalogs,
    isCategoriesSectionActive,
    isShippingGroupsSectionActive,
    isParametersSectionActive,
    isTagsSectionActive,
    selectedCategoryCatalogId,
    selectedShippingGroupCatalogId,
    selectedParameterCatalogId,
    selectedTagCatalogId,
    shouldLoadCatalogs,
  ]);

  const handleSetDefaultGroup = async (groupId: string): Promise<void> => {
    const group = priceGroups.find((g: PriceGroup) => g.id === groupId);
    if (!group) return;
    try {
      await updatePriceGroupMutation.mutateAsync({ ...group, isDefault: true });
      toast('Default price group updated.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductSettingsPage',
        action: 'handleSetDefaultGroup',
        groupId,
      });
    }
  };

  const handleDeleteCatalog = async (catalog: Catalog): Promise<void> => {
    setConfirmation({
      title: 'Delete Catalog?',
      message: `Delete catalog "${catalog.name}"? This action cannot be undone and will affect all products in this catalog.`,
      confirmText: 'Delete Catalog',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteCatalogMutation.mutateAsync(catalog.id);
          toast('Catalog deleted.', { variant: 'success' });
        } catch (err) {
          logClientCatch(err, {
            source: 'ProductSettingsPage',
            action: 'handleDeleteCatalog',
            catalogId: catalog.id,
          });
          toast('Failed to delete catalog.', { variant: 'error' });
        }
      },
    });
  };

  const handleDeleteGroup = async (group: PriceGroup): Promise<void> => {
    if (priceGroups.length <= 1) {
      toast('At least one price group is required.', { variant: 'error' });
      return;
    }
    setConfirmation({
      title: 'Delete Price Group?',
      message: `Delete price group "${group.name}"? This will remove all associated price records.`,
      confirmText: 'Delete Group',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deletePriceGroupMutation.mutateAsync(group.id);
          toast('Price group deleted.', { variant: 'success' });
        } catch (err) {
          logClientCatch(err, {
            source: 'ProductSettingsPage',
            action: 'handleDeleteGroup',
            groupId: group.id,
          });
          toast('Failed to delete price group.', { variant: 'error' });
        }
      },
    });
  };
  const sharedSettingsContextValue: React.ComponentProps<
    typeof ProductSettingsProvider
  >['value'] = {
    loadingCatalogs,
    catalogs,
    onOpenCatalogModal: (): void => {
      setEditingCatalog(null);
      setShowCatalogModal(true);
    },
    onEditCatalog: (catalog: Catalog): void => {
      setEditingCatalog(catalog);
      setShowCatalogModal(true);
    },
    onDeleteCatalog: (catalog: Catalog): void => {
      void handleDeleteCatalog(catalog);
    },
    loadingGroups,
    priceGroups,
    defaultGroupId,
    onDefaultGroupChange: (id: string): void => {
      void handleSetDefaultGroup(id);
    },
    defaultGroupSaving: updatePriceGroupMutation.isPending,
    onOpenPriceGroupCreate: (): void => {
      setEditingPriceGroup(null);
      setShowPriceGroupModal(true);
    },
    onEditPriceGroup: (group: PriceGroup): void => {
      setEditingPriceGroup(group);
      setShowPriceGroupModal(true);
    },
    onDeletePriceGroup: (group: PriceGroup): void => {
      void handleDeleteGroup(group);
    },
    loadingCategories,
    categories: productCategories,
    selectedCategoryCatalogId,
    onCategoryCatalogChange: (id: string | null): void => {
      setSelectedCategoryCatalogId(id);
    },
    onRefreshCategories: (): void => {
      void refetchCategories();
    },
    loadingShippingGroups,
    shippingGroups,
    selectedShippingGroupCatalogId,
    onShippingGroupCatalogChange: (id: string | null): void => {
      setSelectedShippingGroupCatalogId(id);
    },
    onRefreshShippingGroups: (): void => {
      void refetchShippingGroups();
    },
    loadingTags,
    tags: productTags,
    selectedTagCatalogId,
    onTagCatalogChange: (id: string | null): void => {
      setSelectedTagCatalogId(id);
    },
    onRefreshTags: (): void => {
      void refetchTags();
    },
    loadingParameters,
    parameters: productParameters,
    selectedParameterCatalogId,
    onParameterCatalogChange: (id: string | null): void => {
      setSelectedParameterCatalogId(id);
    },
    onRefreshParameters: (): void => {
      void refetchParameters();
    },
  };

  return (
    <InternationalizationProvider>
      <AdminProductsPageLayout title='Product Settings' current='Settings'>
        <Card variant='subtle-compact' padding='sm' className='mb-4 border-border/60 bg-card/30'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-medium text-gray-100'>Image Studio Integration</p>
              <p className='text-xs text-gray-400'>
                Configure default Studio project binding and start Product to Image Studio
                connection.
              </p>
            </div>
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={(): void => setActiveSection('Images & Studio')}
            >
              Open Integration Settings
            </Button>
          </div>
        </Card>
        <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-[240px_1fr]`}>
          <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
            <div className='flex flex-col gap-2'>
              {settingSections.map((section: (typeof settingSections)[number]) => (
                <Button
                  size='xs'
                  key={section}
                  variant={activeSection === section ? 'secondary' : 'ghost'}
                  onClick={() => setActiveSection(section)}
                  className='justify-start px-3 py-2 text-left text-sm'
                >
                  {section}
                </Button>
              ))}
            </div>
          </Card>
          <ProductSettingsProvider value={sharedSettingsContextValue}>
            <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
              {activeSection === 'Categories' && <CategoriesSettings />}
              {activeSection === 'Shipping Groups' && <ShippingGroupsSettings />}
              {activeSection === 'Tags' && <TagsSettings />}
              {activeSection === 'Parameters' && (
                <ParametersSettings
                  loading={loadingParameters}
                  parameters={productParameters}
                  catalogs={catalogs}
                  selectedCatalogId={selectedParameterCatalogId}
                  onCatalogChange={(catalogId: string): void =>
                    setSelectedParameterCatalogId(catalogId)
                  }
                  onRefresh={(): void => {
                    void refetchParameters();
                  }}
                />
              )}
              {activeSection === 'Price Groups' && <PriceGroupsSettings />}
              {activeSection === 'Catalogs' && <CatalogsSettings />}
              {activeSection === 'Sync Settings' && (productSyncSettingsSlot ?? <div>Product Sync Settings is not available.</div>)}
              {activeSection === 'Images & Studio' && <ProductImageRoutingSettings />}
              {activeSection === 'Validator' && (
                <ValidatorDocsTooltipsProvider>
                  <div className='space-y-5'>
                    <ValidatorDefaultPanel />
                    <ValidatorSettings />
                  </div>
                </ValidatorDocsTooltipsProvider>
              )}
              {activeSection === 'Internationalization' && (internationalizationSettingsSlot ?? <div>Internationalization Settings is not available.</div>)}
            </Card>
          </ProductSettingsProvider>
        </div>

        {/* Modals */}
        {showCatalogModal && (
          <CatalogModal
            isOpen={showCatalogModal}
            onClose={() => setShowCatalogModal(false)}
            onSuccess={(): void => {
              setShowCatalogModal(false);
            }}
            item={editingCatalog}
            items={priceGroups}
            loading={loadingGroups}
            defaultId={defaultGroupId}
          />
        )}

        {showPriceGroupModal && (
          <PriceGroupModal
            isOpen={showPriceGroupModal}
            onClose={() => setShowPriceGroupModal(false)}
            onSuccess={(): void => {
              setShowPriceGroupModal(false);
            }}
            item={editingPriceGroup}
            items={priceGroups}
          />
        )}

        {internationalizationModalsSlot}

        <ConfirmModal
          isOpen={Boolean(confirmation)}
          onClose={() => setConfirmation(null)}
          title={confirmation?.title ?? ''}
          message={confirmation?.message ?? ''}
          confirmText={confirmation?.confirmText ?? 'Confirm'}
          isDangerous={confirmation?.isDangerous ?? false}
          onConfirm={async () => {
            if (confirmation?.onConfirm) {
              await confirmation.onConfirm();
            }
            setConfirmation(null);
          }}
        />
      </AdminProductsPageLayout>
    </InternationalizationProvider>
  );
}
