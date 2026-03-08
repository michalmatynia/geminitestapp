'use client';

import { useEffect, useState } from 'react';

import {
  InternationalizationSettings,
  InternationalizationProvider,
} from '@/features/internationalization';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { ProductSyncSettings } from '@/features/product-sync';
import { ParametersSettings } from '@/features/products/components/constructor/ParametersSettings';
import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import { CatalogModal } from '@/features/products/components/settings/modals/catalog-modal/CatalogModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/price-group-modal/PriceGroupModal';
import { CountryModal } from '@/features/internationalization';
import { CurrencyModal } from '@/features/internationalization';
import { LanguageModal } from '@/features/internationalization';
import { PriceGroupsSettings } from '@/features/products/components/settings/pricing/PriceGroupsSettings';
import { ProductImageRoutingSettings } from '@/features/products/components/settings/ProductImageRoutingSettings';
import { ProductSettingsProvider } from '@/features/products/components/settings/ProductSettingsContext';
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
  useTags,
  useUpdatePriceGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { Catalog, PriceGroup } from '@/shared/contracts/products';
import { Button, PageLayout, useToast, Card } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { settingSections } from './ProductSettingsConstants';

function InternationalizationModals(): React.JSX.Element | null {
  return (
    <>
      <LanguageModal />
      <CurrencyModal />
      <CountryModal />
    </>
  );
}

export function ProductSettingsPage(): React.JSX.Element {
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>('Categories');

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

  // Queries
  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups();
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs();

  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);
  const [selectedParameterCatalogId, setSelectedParameterCatalogId] = useState<string | null>(null);

  const {
    data: productCategories = [],
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useCategories(selectedCategoryCatalogId);
  const {
    data: productTags = [],
    isLoading: loadingTags,
    refetch: refetchTags,
  } = useTags(selectedTagCatalogId);
  const {
    data: productParameters = [],
    isLoading: loadingParameters,
    refetch: refetchParameters,
  } = useParameters(selectedParameterCatalogId);

  // Mutations
  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();

  const defaultGroupId =
    priceGroups.find((g: import('@/shared/contracts/products').PriceGroup) => g.isDefault)?.id ??
    '';

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
        if (!selectedParameterCatalogId) {
          const def = catalogs.find((c: Catalog) => c.isDefault) || catalogs[0];
          if (def) setSelectedParameterCatalogId(def.id);
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogs, selectedCategoryCatalogId, selectedTagCatalogId, selectedParameterCatalogId]);

  const handleSetDefaultGroup = async (groupId: string): Promise<void> => {
    const group = priceGroups.find((g: PriceGroup) => g.id === groupId);
    if (!group) return;
    try {
      await updatePriceGroupMutation.mutateAsync({ ...group, isDefault: true });
      toast('Default price group updated.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'ProductSettingsPage', action: 'handleSetDefaultGroup', groupId },
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
          logClientError(err, {
            context: {
              source: 'ProductSettingsPage',
              action: 'handleDeleteCatalog',
              catalogId: catalog.id,
            },
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
          logClientError(err, {
            context: {
              source: 'ProductSettingsPage',
              action: 'handleDeleteGroup',
              groupId: group.id,
            },
          });
          toast('Failed to delete price group.', { variant: 'error' });
        }
      },
    });
  };
  const sharedSettingsContextValue = {
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
      <PageLayout title='Product Settings'>
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
        <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
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
              {activeSection === 'Sync Settings' && <ProductSyncSettings />}
              {activeSection === 'Images & Studio' && <ProductImageRoutingSettings />}
              {activeSection === 'Validator' && (
                <ValidatorDocsTooltipsProvider>
                  <div className='space-y-5'>
                    <ValidatorDefaultPanel />
                    <ValidatorSettings />
                  </div>
                </ValidatorDocsTooltipsProvider>
              )}
              {activeSection === 'Internationalization' && <InternationalizationSettings />}
            </Card>
          </ProductSettingsProvider>
        </div>

        {/* Modals */}
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

        <PriceGroupModal
          isOpen={showPriceGroupModal}
          onClose={() => setShowPriceGroupModal(false)}
          onSuccess={(): void => {
            setShowPriceGroupModal(false);
          }}
          item={editingPriceGroup}
          items={priceGroups}
        />

        <InternationalizationModals />

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
      </PageLayout>
    </InternationalizationProvider>
  );
}
