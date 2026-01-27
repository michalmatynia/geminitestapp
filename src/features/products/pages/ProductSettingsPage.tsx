"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useToast } from "@/shared/ui/toast";

import {
  settingSections,
} from "./ProductSettingsConstants"; // TODO: This is a bit awkward, maybe move constants to feature too
import {
  PriceGroup,
  Catalog,
  ProductCategoryWithChildren,
  ProductTag,
  PriceGroupType,
} from "@/features/products/types";
import type { CurrencyOption, CountryOption, Language } from "@/shared/types/internationalization";

interface ApiPriceGroup extends Omit<PriceGroup, "currencyCode" | "groupType"> {
  currency: { code: string };
  type: PriceGroupType;
}

interface ApiCatalog extends Omit<Catalog, "description" | "priceGroupIds" | "defaultPriceGroupId"> {
  description: string | null;
  priceGroupIds: string[] | null;
  defaultPriceGroupId: string | null;
}

import { PriceGroupsSettings } from "@/features/products/components/settings/pricing/PriceGroupsSettings";
import { CatalogsSettings } from "@/features/products/components/settings/catalogs/CatalogsSettings";
import { CategoriesSettings } from "@/features/products/components/settings/CategoriesSettings";
import { TagsSettings } from "@/features/products/components/settings/TagsSettings";
import { InternationalizationSettings } from "@/features/internationalization/components/InternationalizationSettings";
import { AiDescriptionSettings } from "@/features/products/components/settings/ai/AiDescriptionSettings";
import { AiTranslationSettings } from "@/features/products/components/settings/ai/AiTranslationSettings";
import { Button } from "@/shared/ui/button";

// New Modals
import { CatalogModal } from "@/features/products/components/settings/modals/CatalogModal";
import { LanguageModal } from "@/features/products/components/settings/modals/LanguageModal";
import { PriceGroupModal } from "@/features/products/components/settings/modals/PriceGroupModal";
import { CurrencyModal } from "@/features/products/components/settings/modals/CurrencyModal";
import { CountryModal } from "@/features/products/components/settings/modals/CountryModal";

export function ProductSettingsPage() {
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>("Categories");
  
  // Data State
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryCatalogId, setSelectedCategoryCatalogId] = useState<string | null>(null);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagCatalogId, setSelectedTagCatalogId] = useState<string | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState("");
  const [defaultGroupSaving, setDefaultGroupSaving] = useState(false);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState<string | null>(null);

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

  const refreshPriceGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch("/api/price-groups");
      if (!res.ok) throw new Error("Failed to fetch price groups.");
      const data = (await res.json()) as ApiPriceGroup[];
      setPriceGroups(
        data.map((group: ApiPriceGroup) => ({
          ...group,
          currencyCode: group.currency.code,
          groupType: group.type,
        }))
      );
      const defaultGroup = data.find((group: ApiPriceGroup) => group.isDefault);
      setDefaultGroupId(defaultGroup?.id ?? "");
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const refreshCurrencies = useCallback(async () => {
    try {
      setLoadingCurrencies(true);
      const res = await fetch("/api/currencies");
      if (!res.ok) throw new Error("Failed to fetch currencies.");
      setCurrencyOptions((await res.json()) as CurrencyOption[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  const refreshCountries = useCallback(async () => {
    try {
      setLoadingCountries(true);
      const res = await fetch("/api/countries");
      if (!res.ok) throw new Error("Failed to fetch countries.");
      setCountries((await res.json()) as CountryOption[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const refreshCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to fetch catalogs.");
      const data = (await res.json()) as ApiCatalog[];
      setCatalogs(
        data.map((catalog: ApiCatalog) => ({
          ...catalog,
          description: catalog.description ?? "",
          priceGroupIds: catalog.priceGroupIds ?? [],
          defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
        }))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  const refreshCategories = useCallback(async (catalogId: string | null) => {
    if (!catalogId) {
      setProductCategories([]);
      return;
    }
    try {
      setLoadingCategories(true);
      const res = await fetch(`/api/products/categories/tree?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to fetch product categories.");
      setProductCategories((await res.json()) as ProductCategoryWithChildren[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const refreshTags = useCallback(async (catalogId: string | null) => {
    if (!catalogId) {
      setProductTags([]);
      return;
    }
    try {
      setLoadingTags(true);
      const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to fetch product tags.");
      setProductTags((await res.json()) as ProductTag[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  const refreshLanguages = useCallback(async () => {
    try {
      setLanguagesLoading(true);
      const res = await fetch("/api/languages");
      if (!res.ok) throw new Error("Failed to fetch languages.");
      setLanguages((await res.json()) as Language[]);
    } catch (error) {
      console.error(error);
      setLanguagesError(error instanceof Error ? error.message : "Failed to fetch languages.");
    } finally {
      setLanguagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCurrencies();
    void refreshCountries();
    void refreshPriceGroups();
    void refreshCatalogs();
    void refreshLanguages();
  }, [refreshCurrencies, refreshCountries, refreshPriceGroups, refreshCatalogs, refreshLanguages]);

  useEffect(() => {
    if (catalogs.length > 0 && !selectedCategoryCatalogId) {
      const def = catalogs.find((c) => c.isDefault) || catalogs[0];
      if (def) {
        setSelectedCategoryCatalogId(def.id);
        void refreshCategories(def.id);
      }
    }
  }, [catalogs, selectedCategoryCatalogId, refreshCategories]);

  useEffect(() => {
    if (catalogs.length > 0 && !selectedTagCatalogId) {
      const def = catalogs.find((c) => c.isDefault) || catalogs[0];
      if (def) {
        setSelectedTagCatalogId(def.id);
        void refreshTags(def.id);
      }
    }
  }, [catalogs, selectedTagCatalogId, refreshTags]);

  const handleSetDefaultGroup = async (groupId: string) => {
    const group = priceGroups.find((g) => g.id === groupId);
    if (!group) return;
    setDefaultGroupSaving(true);
    try {
      const res = await fetch(`/api/price-groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...group, isDefault: true, type: group.groupType }),
      });
      if (res.ok) {
        await refreshPriceGroups();
        toast("Default price group updated.", { variant: "success" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDefaultGroupSaving(false);
    }
  };

  const handleDeleteCatalog = async (catalog: Catalog) => {
    if (!confirm(`Delete catalog "${catalog.name}"?`)) return;
    try {
      const res = await fetch(`/api/catalogs/${catalog.id}`, { method: "DELETE" });
      if (res.ok) await refreshCatalogs();
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async (group: PriceGroup) => {
    if (priceGroups.length <= 1) {
      toast("At least one price group is required.", { variant: "error" });
      return;
    }
    if (!confirm(`Delete price group "${group.name}"?`)) return;
    try {
      const res = await fetch(`/api/price-groups/${group.id}`, { method: "DELETE" });
      if (res.ok) await refreshPriceGroups();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <h1 className="mb-6 text-3xl font-bold text-white">Product Settings</h1>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="flex flex-col gap-2">
            {settingSections.map((section) => (
              <Button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`justify-start rounded px-3 py-2 text-left text-sm transition ${
                  activeSection === section
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800/60"
                }`}
              >
                {section}
              </Button>
            ))}
          </div>
        </aside>
        <section className="rounded-md border border-gray-800 bg-gray-900 p-6">
          {activeSection === "Categories" && (
            <CategoriesSettings
              loading={loadingCategories}
              categories={productCategories}
              catalogs={catalogs}
              selectedCatalogId={selectedCategoryCatalogId}
              onCatalogChange={(id) => { setSelectedCategoryCatalogId(id); void refreshCategories(id); }}
              onRefresh={() => void refreshCategories(selectedCategoryCatalogId)}
            />
          )}
          {activeSection === "Tags" && (
            <TagsSettings
              loading={loadingTags}
              tags={productTags}
              catalogs={catalogs}
              selectedCatalogId={selectedTagCatalogId}
              onCatalogChange={(id) => { setSelectedTagCatalogId(id); void refreshTags(id); }}
              onRefresh={() => void refreshTags(selectedTagCatalogId)}
            />
          )}
          {activeSection === "Price Groups" && (
            <PriceGroupsSettings
              loadingGroups={loadingGroups}
              priceGroups={priceGroups}
              defaultGroupId={defaultGroupId}
              onDefaultGroupChange={(id) => { void handleSetDefaultGroup(id); }}
              defaultGroupSaving={defaultGroupSaving}
              handleOpenCreate={() => { setEditingPriceGroup(null); setShowPriceGroupModal(true); }}
              handleEditGroup={(g) => { setEditingPriceGroup(g); setShowPriceGroupModal(true); }}
              handleDeleteGroup={(g) => { void handleDeleteGroup(g); }}
            />
          )}
          {activeSection === "Catalogs" && (
            <CatalogsSettings
              loadingCatalogs={loadingCatalogs}
              catalogs={catalogs}
              languages={languages}
              handleOpenCatalogModal={() => { setEditingCatalog(null); setShowCatalogModal(true); }}
              handleEditCatalog={(c) => { setEditingCatalog(c); setShowCatalogModal(true); }}
              handleDeleteCatalog={(c) => { void handleDeleteCatalog(c); }}
            />
          )}
          {activeSection === "Internationalization" && (
            <InternationalizationSettings
              loadingCurrencies={loadingCurrencies}
              currencyOptions={currencyOptions}
              handleOpenCurrencyModal={(c) => { setEditingCurrency(c ?? null); setShowCurrencyModal(true); }}
              handleDeleteCurrency={(c) => { 
                void (async () => {
                  if (confirm(`Delete ${c.code}?`)) {
                    await fetch(`/api/currencies/${c.id}`, { method: "DELETE" });
                    await refreshCurrencies();
                  }
                })();
              }}
              loadingCountries={loadingCountries}
              filteredCountries={countries}
              countrySearch=""
              setCountrySearch={() => {}}
              handleOpenCountryModal={(c) => { setEditingCountry(c ?? null); setShowCountryModal(true); }}
              handleDeleteCountry={(c) => {
                void (async () => {
                  if (confirm(`Delete ${c.name}?`)) {
                    await fetch(`/api/countries/${c.id}`, { method: "DELETE" });
                    await refreshCountries();
                  }
                })();
              }}
              languagesLoading={languagesLoading}
              languagesError={languagesError}
              languages={languages}
              handleOpenNewLanguageModal={() => { setEditingLanguage(null); setShowLanguageModal(true); }}
              handleOpenLanguageModal={(l) => { setEditingLanguage(l); setShowLanguageModal(true); }}
              handleDeleteLanguage={(l) => {
                void (async () => {
                  if (confirm(`Delete ${l.name}?`)) {
                    await fetch(`/api/languages/${l.id}`, { method: "DELETE" });
                    await refreshLanguages();
                  }
                })();
              }}
            />
          )}
          {activeSection === "AI Description" && <AiDescriptionSettings />}
          {activeSection === "AI Translation" && <AiTranslationSettings />}
        </section>
      </div>

      {/* Modals */}
      <CatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onSuccess={() => { void (async () => { setShowCatalogModal(false); await refreshCatalogs(); })(); }}
        catalog={editingCatalog}
        languages={languages}
        languagesLoading={languagesLoading}
        languagesError={languagesError}
        priceGroups={priceGroups}
        loadingGroups={loadingGroups}
        defaultGroupId={defaultGroupId}
      />

      <LanguageModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onSuccess={() => { void (async () => { setShowLanguageModal(false); await refreshLanguages(); })(); }}
        language={editingLanguage}
        countries={countries}
      />

      <PriceGroupModal
        isOpen={showPriceGroupModal}
        onClose={() => setShowPriceGroupModal(false)}
        onSuccess={() => { void (async () => { setShowPriceGroupModal(false); await refreshPriceGroups(); })(); }}
        priceGroup={editingPriceGroup}
        currencyOptions={currencyOptions}
        loadingCurrencies={loadingCurrencies}
        priceGroups={priceGroups}
      />

      <CurrencyModal
        isOpen={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        onSuccess={() => { void (async () => { setShowCurrencyModal(false); await refreshCurrencies(); })(); }}
        currency={editingCurrency}
      />

      <CountryModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSuccess={() => { void (async () => { setShowCountryModal(false); await refreshCountries(); })(); }}
        country={editingCountry}
        currencyOptions={currencyOptions}
        loadingCurrencies={loadingCurrencies}
      />
    </div>
  );
}
