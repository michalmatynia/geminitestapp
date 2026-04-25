'use client';
// ProductSettingsPage: admin hub for product configuration (categories, pricing,
// validators, image studio). Wraps providers and lazy-loads heavy panels to keep
// initial admin load focused.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  type ComponentProps,
  type ComponentType,
  type JSX,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import { CustomFieldsSettings } from '@/features/products/components/settings/CustomFieldsSettings';
import { CatalogModal } from '@/features/products/components/settings/modals/catalog-modal/CatalogModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/price-group-modal/PriceGroupModal';
import { ParametersSettings } from '@/features/products/components/settings/parameters/ParametersSettings';
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
  useCustomFields,
  useDeleteCatalogMutation,
  useDeletePriceGroupMutation,
  useParameters,
  usePriceGroups,
  useShippingGroups,
  useTags,
  useUpdatePriceGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { settingSections } from './ProductSettingsConstants';
import { ProductDefaultsForm } from './product-settings/ProductDefaultsForm';
import { ProductLabelingSettings } from './product-settings/ProductLabelingSettings';
import { TaxationSettingsPanel } from './product-settings/TaxationSettingsPanel';
import { useProductSettingsController } from './product-settings/useProductSettingsController';

export type ProductSettingsPageProps = {
  internationalizationSettingsSlot?: ReactNode;
  internationalizationProvider?: ComponentType<{ children: ReactNode }>;
  internationalizationModalsSlot?: ReactNode;
  productSyncSettingsSlot?: ReactNode;
};

const PassthroughProvider = ({ children }: { children: ReactNode }): JSX.Element => <>{children}</>;

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

const ProductDefaultsSettingsSection = (): JSX.Element => {
  const ctrl = useProductSettingsController();

  return (
    <div className='space-y-6'>
      <ProductDefaultsForm
        settings={ctrl.settings}
        onUpdate={ctrl.handleUpdate}
        onSave={ctrl.saveSettings}
        isSaving={ctrl.isSaving}
      />
      <ProductLabelingSettings settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
      <TaxationSettingsPanel settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
    </div>
  );
};

export function ProductSettingsPage({
  internationalizationSettingsSlot,
  internationalizationProvider: InternationalizationProvider = PassthroughProvider,
  internationalizationModalsSlot,
  productSyncSettingsSlot,
}: ProductSettingsPageProps = {}): JSX.Element {
  const searchParams = useSearchParams();
  const requestedSection = resolveSettingSectionFromParam(searchParams?.get('section'));
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>(requestedSection ?? 'Categories');

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
  const isCustomFieldsSectionActive = activeSection === 'Custom Fields';
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

  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups({
    enabled: shouldLoadPriceGroups,
  });
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs({
    enabled: shouldLoadCatalogs,
  });

  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedShippingGroupCatalogId, setSelectedShippingGroupCatalogId] = useState<
    string | null
  >(null);
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
    data: productCustomFields = [],
    isLoading: loadingCustomFields,
    refetch: refetchCustomFields,
  } = useCustomFields({ enabled: isCustomFieldsSectionActive });
  const {
    data: productParameters = [],
    isLoading: loadingParameters,
    refetch: refetchParameters,
  } = useParameters(selectedParameterCatalogId, { enabled: isParametersSectionActive });

  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();

  const defaultGroupId = priceGroups.find((group: PriceGroup) => group.isDefault)?.id ?? '';

  useEffect(() => {
    if (!requestedSection || requestedSection === activeSection) return;
    setActiveSection(requestedSection);
  }, [activeSection, requestedSection]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (catalogs.length > 0 && shouldLoadCatalogs) {
      timer = setTimeout(() => {
        const defaultCatalog = catalogs.find((catalog: Catalog) => catalog.isDefault) ?? catalogs[0];
        if (!defaultCatalog) return;

        if (isCategoriesSectionActive && !selectedCategoryCatalogId) {
          setSelectedCategoryCatalogId(defaultCatalog.id);
        }
        if (isShippingGroupsSectionActive && !selectedShippingGroupCatalogId) {
          setSelectedShippingGroupCatalogId(defaultCatalog.id);
        }
        if (isTagsSectionActive && !selectedTagCatalogId) {
          setSelectedTagCatalogId(defaultCatalog.id);
        }
        if (isParametersSectionActive && !selectedParameterCatalogId) {
          setSelectedParameterCatalogId(defaultCatalog.id);
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [
    catalogs,
    isCategoriesSectionActive,
    isParametersSectionActive,
    isShippingGroupsSectionActive,
    isTagsSectionActive,
    selectedCategoryCatalogId,
    selectedParameterCatalogId,
    selectedShippingGroupCatalogId,
    selectedTagCatalogId,
    shouldLoadCatalogs,
  ]);

  const handleSetDefaultGroup = async (groupId: string): Promise<void> => {
    const group = priceGroups.find((candidate: PriceGroup) => candidate.id === groupId);
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

  const sharedSettingsContextValue: ComponentProps<typeof ProductSettingsProvider>['value'] = {
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
        <Card variant='subtle-compact' padding='sm' className='mb-4 border-border/60 bg-card/30'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-medium text-gray-100'>Structured Product Name Terms</p>
              <p className='text-xs text-gray-400'>
                Manage catalog-specific size, material, and theme lists used by the English product
                name composer.
              </p>
            </div>
            <Button size='xs' type='button' variant='outline' asChild>
              <Link href='/admin/products/title-terms'>Open Title Terms</Link>
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
                  onClick={(): void => setActiveSection(section)}
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
              {activeSection === 'Custom Fields' && (
                <CustomFieldsSettings
                  loading={loadingCustomFields}
                  customFields={productCustomFields}
                  onRefresh={(): void => {
                    void refetchCustomFields();
                  }}
                />
              )}
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
              {activeSection === 'Defaults' && <ProductDefaultsSettingsSection />}
              {activeSection === 'Sync Settings' &&
                (productSyncSettingsSlot ?? <div>Product Sync Settings is not available.</div>)}
              {activeSection === 'Images & Studio' && <ProductImageRoutingSettings />}
              {activeSection === 'Validator' && (
                <ValidatorDocsTooltipsProvider>
                  <div className='space-y-5'>
                    <ValidatorDefaultPanel />
                    <ValidatorSettings />
                  </div>
                </ValidatorDocsTooltipsProvider>
              )}
              {activeSection === 'Internationalization' &&
                (internationalizationSettingsSlot ?? (
                  <div>Internationalization Settings is not available.</div>
                ))}
            </Card>
          </ProductSettingsProvider>
        </div>

        {showCatalogModal && (
          <CatalogModal
            isOpen={showCatalogModal}
            onClose={(): void => setShowCatalogModal(false)}
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
            onClose={(): void => setShowPriceGroupModal(false)}
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
          onClose={(): void => setConfirmation(null)}
          title={confirmation?.title ?? ''}
          message={confirmation?.message ?? ''}
          confirmText={confirmation?.confirmText ?? 'Confirm'}
          isDangerous={confirmation?.isDangerous ?? false}
          onConfirm={async (): Promise<void> => {
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

export default ProductSettingsPage;
