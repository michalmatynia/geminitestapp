'use client';

import {
  useEffect,
  useState,
} from 'react';



import { InternationalizationSettings } from '@/features/internationalization';
import {
  useDeleteCurrencyMutation,
  useDeleteCountryMutation,
  useDeleteLanguageMutation
} from '@/features/internationalization/hooks/useInternationalizationMutations';
import {
  useCurrencies,
  useCountries,
  useLanguages,
} from '@/features/internationalization/hooks/useInternationalizationQueries';
import { logClientError } from '@/features/observability';
import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';

// New Modals
import { CatalogModal } from '@/features/products/components/settings/modals/CatalogModal';
import { CountryModal } from '@/features/products/components/settings/modals/CountryModal';
import { CurrencyModal } from '@/features/products/components/settings/modals/CurrencyModal';
import { LanguageModal } from '@/features/products/components/settings/modals/LanguageModal';
import { PriceGroupModal } from '@/features/products/components/settings/modals/PriceGroupModal';
import { PriceGroupsSettings } from '@/features/products/components/settings/pricing/PriceGroupsSettings';
import { TagsSettings } from '@/features/products/components/settings/TagsSettings';
import { 
  usePriceGroups, 
  useCatalogs, 
  useCategories, 
  useTags,
  useUpdatePriceGroupMutation,
  useDeletePriceGroupMutation,
  useDeleteCatalogMutation
} from '@/features/products/hooks/useProductSettingsQueries';
import {
  PriceGroup,
  Catalog,
} from '@/features/products/types';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/internationalization';
import { useToast, Button, SectionHeader, SectionPanel } from '@/shared/ui';

import {
  settingSections,
} from './ProductSettingsConstants'; // TODO: This is a bit awkward, maybe move constants to feature too


export function ProductSettingsPage(): React.JSX.Element {
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>('Categories');
  
  // Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showPriceGroupModal, setShowPriceGroupModal] = useState(false);
  const [editingPriceGroup, setEditingPriceGroup] = useState<PriceGroup | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryOption | null>(null);

  const { toast } = useToast();

  // Queries
  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups();
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs();
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const { data: languages = [], isLoading: languagesLoading, error: languagesError } = useLanguages();

  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);

  const { data: productCategories = [], isLoading: loadingCategories, refetch: refetchCategories } = useCategories(selectedCategoryCatalogId);
  const { data: productTags = [], isLoading: loadingTags, refetch: refetchTags } = useTags(selectedTagCatalogId);

  // Mutations
  const updatePriceGroupMutation = useUpdatePriceGroupMutation();
  const deletePriceGroupMutation = useDeletePriceGroupMutation();
  const deleteCatalogMutation = useDeleteCatalogMutation();
  const deleteCurrencyMutation = useDeleteCurrencyMutation();
  const deleteCountryMutation = useDeleteCountryMutation();
  const deleteLanguageMutation = useDeleteLanguageMutation();

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
    <SectionPanel className="p-6">
      <SectionHeader
        title="Product Settings"
        className="mb-6"
      />
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <SectionPanel className="p-4">
          <div className="flex flex-col gap-2">
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
        <SectionPanel className="p-6">
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
              languages={languages}
              handleOpenCatalogModal={(): void => { setEditingCatalog(null); setShowCatalogModal(true); }}
              handleEditCatalog={(c: Catalog): void => { setEditingCatalog(c); setShowCatalogModal(true); }}
              handleDeleteCatalog={(c: Catalog): void => { void handleDeleteCatalog(c); }}
            />
          )}
          {activeSection === 'Internationalization' && (
            <InternationalizationSettings
              loadingCurrencies={loadingCurrencies}
              currencyOptions={currencies}
              handleOpenCurrencyModal={(c: CurrencyOption | undefined): void => { setEditingCurrency(c ?? null); setShowCurrencyModal(true); }}
              handleDeleteCurrency={(c: CurrencyOption): void => { 
                void (async (): Promise<void> => {
                  if (confirm(`Delete ${c.code}?`)) {
                    await deleteCurrencyMutation.mutateAsync(c.id);
                  }
                })();
              }}
              loadingCountries={loadingCountries}
              filteredCountries={countries}
              countrySearch=""
              setCountrySearch={() => {}}
              handleOpenCountryModal={(c: CountryOption | undefined): void => { setEditingCountry(c ?? null); setShowCountryModal(true); }}
              handleDeleteCountry={(c: CountryOption): void => {
                void (async (): Promise<void> => {
                  if (confirm(`Delete ${c.name}?`)) {
                    await deleteCountryMutation.mutateAsync(c.id);
                  }
                })();
              }}
              languagesLoading={languagesLoading}
              languagesError={languagesError instanceof Error ? languagesError.message : (languagesError || null)}
              languages={languages}
              handleOpenNewLanguageModal={(): void => { setEditingLanguage(null); setShowLanguageModal(true); }}
              handleOpenLanguageModal={(l: Language): void => { setEditingLanguage(l); setShowLanguageModal(true); }}
              handleDeleteLanguage={(l: Language): void => {
                void (async (): Promise<void> => {
                  if (confirm(`Delete ${l.name}?`)) {
                    await deleteLanguageMutation.mutateAsync(l.id);
                  }
                })();
              }}
            />
          )}
        </SectionPanel>
      </div>

      {/* Modals */}
      <CatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onSuccess={(): void => { setShowCatalogModal(false); }}
        catalog={editingCatalog}
        languages={languages}
        languagesLoading={languagesLoading}
        languagesError={languagesError instanceof Error ? languagesError.message : (languagesError || null)}
        priceGroups={priceGroups}
        loadingGroups={loadingGroups}
        defaultGroupId={defaultGroupId}
      />

      <LanguageModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onSuccess={(): void => { setShowLanguageModal(false); }}
        language={editingLanguage}
        countries={countries}
      />

      <PriceGroupModal
        isOpen={showPriceGroupModal}
        onClose={() => setShowPriceGroupModal(false)}
        onSuccess={(): void => { setShowPriceGroupModal(false); }}
        priceGroup={editingPriceGroup}
        currencyOptions={currencies}
        loadingCurrencies={loadingCurrencies}
        priceGroups={priceGroups}
      />

      <CurrencyModal
        isOpen={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        onSuccess={(): void => { setShowCurrencyModal(false); }}
        currency={editingCurrency}
      />

      <CountryModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSuccess={(): void => { setShowCountryModal(false); }}
        country={editingCountry}
        currencyOptions={currencies}
        loadingCurrencies={loadingCurrencies}
      />
    </SectionPanel>
  );
}
