"use client";

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";

import {
  settingSections,
  countryCodeOptions,
} from "./constants";
import {
  PriceGroup,
  PriceGroupType,
  CurrencyOption,
  CountryOption,
  Catalog,
  ProductDbProvider,
  ProductMigrationDirection,
  Language,
} from "./types";
import { PriceGroupsSettings } from "./components/PriceGroupsSettings";
import { DataSourceSettings } from "./components/DataSourceSettings";
import { CatalogsSettings } from "./components/CatalogsSettings";
import { InternationalizationSettings } from "./components/InternationalizationSettings";

export default function ProductSettingsPage() {
  const [activeSection, setActiveSection] =
    useState<(typeof settingSections)[number]>("Price Groups");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
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
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(
    null
  );
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [languageForm, setLanguageForm] = useState({
    code: "",
    name: "",
    nativeName: "",
  });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(
    null
  );
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [selectedCurrencyIds, setSelectedCurrencyIds] = useState<string[]>([]);
  const [currencyForm, setCurrencyForm] = useState({
    code: "PLN",
    name: "",
    symbol: "",
  });
  const [countryForm, setCountryForm] = useState({
    code: "",
    name: "",
  });
  const [catalogForm, setCatalogForm] = useState({
    name: "",
    description: "",
    isDefault: false,
  });
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [catalogLanguageQuery, setCatalogLanguageQuery] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [productDbProvider, setProductDbProvider] =
    useState<ProductDbProvider>("prisma");
  const [productDbLoading, setProductDbLoading] = useState(true);
  const [productDbSaving, setProductDbSaving] = useState(false);
  const [productDbDirty, setProductDbDirty] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationTotal, setMigrationTotal] = useState(0);
  const [migrationProcessed, setMigrationProcessed] = useState(0);
  const [migrationDirection, setMigrationDirection] =
    useState<ProductMigrationDirection | null>(null);
  const [missingImageIds, setMissingImageIds] = useState<string[]>([]);
  const [missingCatalogIds, setMissingCatalogIds] = useState<string[]>([]);
  const [formState, setFormState] = useState({
    isDefault: false,
    groupId: "",
    name: "",
    description: "",
    currencyId: "",
    groupType: "standard" as PriceGroupType,
    basePriceField: "price",
    sourceGroupId: "",
    priceMultiplier: 1,
    addToPrice: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load product settings.");
        }
        const data = (await res.json()) as { key: string; value: string }[];
        if (!mounted) return;
        const settingsMap = new Map(data.map((item) => [item.key, item.value]));
        const provider =
          settingsMap.get("product_db_provider") === "mongodb"
            ? "mongodb"
            : "prisma";
        setProductDbProvider(provider);
        setProductDbDirty(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load product settings.";
        toast(message, { variant: "error" });
      } finally {
        if (mounted) {
          setProductDbLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleSaveProductDbProvider = async () => {
    try {
      setProductDbSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "product_db_provider",
          value: productDbProvider,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save product data source.");
      }
      setProductDbDirty(false);
      toast("Product data source saved.", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save product data source.";
      toast(message, { variant: "error" });
    } finally {
      setProductDbSaving(false);
    }
  };

  const runProductMigration = async (direction: ProductMigrationDirection) => {
    const confirmed = window.confirm(
      "This will overwrite product data in the target database. Continue?"
    );
    if (!confirmed) return;
    try {
      setMigrationRunning(true);
      setMigrationDirection(direction);
      setMigrationProcessed(0);
      setMigrationTotal(0);
      setMissingImageIds([]);
      setMissingCatalogIds([]);

      const totalsRes = await fetch(
        `/api/products/migrate?direction=${direction}`,
        { cache: "no-store" }
      );
      if (!totalsRes.ok) {
        throw new Error("Failed to load migration totals.");
      }
      const totals = (await totalsRes.json()) as { total: number };
      setMigrationTotal(totals.total);

      let cursor: string | null = null;
      let processed = 0;
      const missingImageSet = new Set<string>();
      const missingCatalogSet = new Set<string>();
      const batchSize = 25;
      if (totals.total === 0) {
        toast("No products to migrate.", { variant: "success" });
        return;
      }
      while (true) {
        const res = await fetch("/api/products/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, cursor, batchSize }),
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error || "Migration failed.");
        }
        const data = (await res.json()) as {
          result: {
            productsProcessed: number;
            nextCursor: string | null;
            missingImageFileIds: string[];
            missingCatalogIds: string[];
          };
        };
        processed += data.result.productsProcessed;
        cursor = data.result.nextCursor;
        setMigrationProcessed(processed);
        if (data.result.missingImageFileIds.length > 0) {
          data.result.missingImageFileIds.forEach((id) =>
            missingImageSet.add(id)
          );
          setMissingImageIds(Array.from(missingImageSet));
        }
        if (data.result.missingCatalogIds.length > 0) {
          data.result.missingCatalogIds.forEach((id) =>
            missingCatalogSet.add(id)
          );
          setMissingCatalogIds(Array.from(missingCatalogSet));
        }
        if (!cursor) break;
      }

      const missingImages =
        direction === "mongo-to-prisma" ? missingImageSet.size : 0;
      const missingCatalogs =
        direction === "mongo-to-prisma" ? missingCatalogSet.size : 0;
      toast(
        `Migration completed: ${processed} products. Missing images: ${missingImages}, catalogs: ${missingCatalogs}.`,
        { variant: "success" }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Migration failed.";
      toast(message, { variant: "error" });
    } finally {
      setMigrationRunning(false);
      setMigrationDirection(null);
    }
  };

  const refreshPriceGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch("/api/price-groups");
      if (!res.ok) {
        throw new Error("Failed to fetch price groups.");
      }
      const data = (await res.json()) as {
        id: string;
        groupId: string;
        name: string;
        description: string | null;
        currencyId: string;
        currency: { code: string };
        isDefault: boolean;
        type: PriceGroupType;
        basePriceField: string;
        sourceGroupId: string | null;
        priceMultiplier: number;
        addToPrice: number;
      }[];
      setPriceGroups(
        data.map((group) => ({
          id: group.id,
          groupId: group.groupId,
          name: group.name,
          description: group.description ?? "",
          currencyId: group.currencyId,
          currencyCode: group.currency.code,
          isDefault: group.isDefault,
          groupType: group.type,
          basePriceField: group.basePriceField,
          sourceGroupId: group.sourceGroupId,
          priceMultiplier: group.priceMultiplier,
          addToPrice: group.addToPrice,
        }))
      );
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
      if (!res.ok) {
        throw new Error("Failed to fetch currencies.");
      }
      const data = (await res.json()) as CurrencyOption[];
      setCurrencyOptions(data);
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
      if (!res.ok) {
        throw new Error("Failed to fetch countries.");
      }
      const data = (await res.json()) as CountryOption[];
      setCountries(data);
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
      if (!res.ok) {
        throw new Error("Failed to fetch catalogs.");
      }
      const data = (await res.json()) as Catalog[];
      setCatalogs(
        data.map((catalog) => ({
          ...catalog,
          description: catalog.description ?? "",
        }))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  const refreshLanguages = useCallback(async () => {
    try {
      setLanguagesLoading(true);
      const res = await fetch("/api/languages");
      if (!res.ok) {
        const payload = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = payload?.error || "Failed to fetch languages.";
        const suffix = payload?.errorId
          ? ` (Error ID: ${payload.errorId})`
          : "";
        throw new Error(`${message}${suffix}`);
      }
      const data = (await res.json()) as Language[];
      setLanguages(data);
    } catch (error) {
      console.error(error);
      setLanguagesError(
        error instanceof Error ? error.message : "Failed to fetch languages."
      );
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
  }, [
    refreshCurrencies,
    refreshCountries,
    refreshPriceGroups,
    refreshCatalogs,
    refreshLanguages,
  ]);

  useEffect(() => {
    if (formState.currencyId) return;
    const plnCurrency = currencyOptions.find((option) => option.code === "PLN");
    if (plnCurrency) {
      setFormState((prev) => ({ ...prev, currencyId: plnCurrency.id }));
    }
  }, [currencyOptions, formState.currencyId]);

  const selectedCurrency = useMemo(
    () => currencyOptions.find((option) => option.id === formState.currencyId),
    [currencyOptions, formState.currencyId]
  );

  const handleOpenCreate = () => {
    setFormState({
      isDefault: false,
      groupId: "",
      name: "",
      description: "",
      currencyId: selectedCurrency?.id || "",
      groupType: "standard",
      basePriceField: "price",
      sourceGroupId: "",
      priceMultiplier: 1,
      addToPrice: 0,
    });
    setEditingGroupId(null);
    setShowCreateModal(true);
  };

  const handleSaveGroup = async () => {
    if (!formState.groupId.trim()) {
      toast("Price group ID is required.", { variant: "error" });
      return;
    }
    if (!formState.name.trim()) {
      toast("Price group name is required.", { variant: "error" });
      return;
    }
    if (!formState.currencyId) {
      toast("Currency is required.", { variant: "error" });
      return;
    }
    if (
      formState.groupType === "dependent" &&
      !formState.sourceGroupId.trim()
    ) {
      toast("Source price group is required for dependent groups.", {
        variant: "error",
      });
      return;
    }

    const payload = {
      groupId: formState.groupId.trim(),
      isDefault: formState.isDefault,
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      currencyId: formState.currencyId,
      type: formState.groupType,
      basePriceField: formState.basePriceField,
      sourceGroupId: formState.sourceGroupId.trim() || undefined,
      priceMultiplier: formState.priceMultiplier,
      addToPrice: formState.addToPrice,
    };

    const res = await fetch(
      editingGroupId
        ? `/api/price-groups/${editingGroupId}`
        : "/api/price-groups",
      {
        method: editingGroupId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to save price group.", { variant: "error" });
      return;
    }
    await refreshPriceGroups();
    setShowCreateModal(false);
    setEditingGroupId(null);
  };

  const handleEditGroup = (group: PriceGroup) => {
    setFormState({
      isDefault: group.isDefault,
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      currencyId: group.currencyId,
      groupType: group.groupType,
      basePriceField: group.basePriceField,
      sourceGroupId: group.sourceGroupId ?? "",
      priceMultiplier: group.priceMultiplier,
      addToPrice: group.addToPrice,
    });
    setEditingGroupId(group.id);
    setShowCreateModal(true);
  };

  const handleDeleteGroup = async (group: PriceGroup) => {
    const confirmed = window.confirm(`Delete price group "${group.name}"?`);
    if (!confirmed) return;
    const res = await fetch(`/api/price-groups/${group.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to delete price group.", {
        variant: "error",
      });
      return;
    }
    await refreshPriceGroups();
  };

  const handleOpenCurrencyModal = (currency?: CurrencyOption) => {
    if (currency) {
      setCurrencyForm({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol ?? "",
      });
      setEditingCurrencyId(currency.id);
    } else {
      setCurrencyForm({ code: "PLN", name: "", symbol: "" });
      setEditingCurrencyId(null);
    }
    setShowCurrencyModal(true);
  };

  const handleSaveCurrency = async () => {
    if (!currencyForm.code.trim() || !currencyForm.name.trim()) {
      toast("Currency code and name are required.", { variant: "error" });
      return;
    }
    const res = await fetch(
      editingCurrencyId
        ? `/api/currencies/${editingCurrencyId}`
        : "/api/currencies",
      {
        method: editingCurrencyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currencyForm.code.trim().toUpperCase(),
          name: currencyForm.name.trim(),
          symbol: currencyForm.symbol.trim() || undefined,
        }),
      }
    );
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to save currency.", { variant: "error" });
      return;
    }
    await refreshCurrencies();
    setShowCurrencyModal(false);
    setEditingCurrencyId(null);
  };

  const handleDeleteCurrency = async (currency: CurrencyOption) => {
    const confirmed = window.confirm(`Delete currency "${currency.code}"?`);
    if (!confirmed) return;
    const res = await fetch(`/api/currencies/${currency.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to delete currency.", { variant: "error" });
      return;
    }
    await refreshCurrencies();
  };

  const handleOpenCountryModal = (country?: CountryOption) => {
    if (country) {
      setCountryForm({ code: country.code, name: country.name });
      setEditingCountryId(country.id);
      setSelectedCurrencyIds(
        country.currencies?.map((entry) => entry.currencyId) ?? []
      );
    } else {
      const defaultCountry = countryCodeOptions[0];
      setCountryForm({ code: defaultCountry.code, name: defaultCountry.name });
      setEditingCountryId(null);
      setSelectedCurrencyIds([]);
    }
    setShowCountryModal(true);
  };

  const handleSaveCountry = async () => {
    if (!countryForm.code.trim() || !countryForm.name.trim()) {
      toast("Country code and name are required.", { variant: "error" });
      return;
    }
    const res = await fetch(
      editingCountryId
        ? `/api/countries/${editingCountryId}`
        : "/api/countries",
      {
        method: editingCountryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: countryForm.code.trim().toUpperCase(),
          name: countryForm.name.trim(),
          currencyIds: selectedCurrencyIds,
        }),
      }
    );
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to save country.", { variant: "error" });
      return;
    }
    await refreshCountries();
    setShowCountryModal(false);
    setEditingCountryId(null);
  };

  const handleDeleteCountry = async (country: CountryOption) => {
    const confirmed = window.confirm(`Delete country "${country.name}"?`);
    if (!confirmed) return;
    const res = await fetch(`/api/countries/${country.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to delete country.", { variant: "error" });
      return;
    }
    await refreshCountries();
  };

  const toggleCountryCurrency = (currencyId: string) => {
    setSelectedCurrencyIds((prev) =>
      prev.includes(currencyId)
        ? prev.filter((id) => id !== currencyId)
        : [...prev, currencyId]
    );
  };

  const filteredCountries = countries.filter((country) => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      country.code.toLowerCase().includes(query) ||
      country.name.toLowerCase().includes(query)
    );
  });

  const handleOpenCatalogModal = (catalog?: Catalog) => {
    if (catalog) {
      setEditingCatalogId(catalog.id);
      setCatalogForm({
        name: catalog.name,
        description: catalog.description ?? "",
        isDefault: catalog.isDefault,
      });
      setSelectedLanguageIds(
        catalog.languageIds ?? []
      );
    } else {
      setEditingCatalogId(null);
      setCatalogForm({
        name: "",
        description: "",
        isDefault: catalogs.length === 0,
      });
      setSelectedLanguageIds([]);
    }
    setCatalogError(null);
    setCatalogLanguageQuery("");
    setShowCatalogModal(true);
  };

  const handleDeleteCatalog = (catalog: Catalog) => {
    const deleteCatalog = async () => {
      const confirmed = window.confirm(
        `Delete catalog "${catalog.name}"? This cannot be undone.`
      );
      if (!confirmed) {
        return;
      }

      const res = await fetch(`/api/catalogs/${catalog.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = error.error || "Failed to delete catalog.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }

      await refreshCatalogs();
    };

    void deleteCatalog();
  };

  const handleSubmitCatalog = () => {
    const submitCatalog = async () => {
      if (catalogSaving) {
        return;
      }
      const name = catalogForm.name.trim();
      const description = catalogForm.description.trim();
      if (!name) {
        toast("Catalog name is required.", { variant: "error" });
        return;
      }
      setCatalogSaving(true);
      try {
        const endpoint = editingCatalogId
          ? `/api/catalogs/${editingCatalogId}`
          : "/api/catalogs";
        const res = await fetch(endpoint, {
          method: editingCatalogId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            languageIds: selectedLanguageIds,
            isDefault: catalogForm.isDefault,
          }),
        });
        if (!res.ok) {
          const error = (await res.json()) as {
            error?: string;
            errorId?: string;
          };
          const message = error.error || "Failed to save catalog.";
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          setCatalogError(`${message}${suffix}`);
          return;
        }
        setCatalogError(null);
        toast("Catalog saved.", { variant: "success" });
        setShowCatalogModal(false);
        setEditingCatalogId(null);
        setCatalogForm({ name: "", description: "", isDefault: false });
        setSelectedLanguageIds([]);
        refreshCatalogs().catch((error) => {
          console.error("Failed to refresh catalogs:", error);
          toast("Catalog saved, but refresh failed.", { variant: "error" });
        });
      } finally {
        setCatalogSaving(false);
      }
    };
    void submitCatalog();
  };

  const toggleLanguage = (languageId: string) => {
    setSelectedLanguageIds((prev) =>
      prev.includes(languageId)
        ? prev.filter((id) => id !== languageId)
        : [...prev, languageId]
    );
  };

  const languageNameMap = useMemo(
    () => new Map(languages.map((language) => [language.id, language.name])),
    [languages]
  );

  const selectedLanguages = useMemo(
    () =>
      languages.filter((language) => selectedLanguageIds.includes(language.id)),
    [languages, selectedLanguageIds]
  );

  const availableLanguages = useMemo(() => {
    const query = catalogLanguageQuery.trim().toLowerCase();
    return languages.filter((language) => {
      if (selectedLanguageIds.includes(language.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        language.name.toLowerCase().includes(query) ||
        language.code.toLowerCase().includes(query)
      );
    });
  }, [catalogLanguageQuery, languages, selectedLanguageIds]);

  const handleOpenLanguageModal = (language: Language) => {
    setEditingLanguageId(language.id);
    setSelectedCountryIds(
      language.countries?.map((entry) => entry.countryId) ?? []
    );
    setLanguageForm({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName ?? "",
    });
    setShowLanguageModal(true);
  };

  const handleOpenNewLanguageModal = () => {
    setEditingLanguageId(null);
    setSelectedCountryIds([]);
    setLanguageForm({ code: "", name: "", nativeName: "" });
    setShowLanguageModal(true);
  };

  const toggleCountry = (countryId: string) => {
    setSelectedCountryIds((prev) =>
      prev.includes(countryId)
        ? prev.filter((id) => id !== countryId)
        : [...prev, countryId]
    );
  };

  const handleSaveLanguage = () => {
    const saveLanguage = async () => {
      if (!languageForm.code.trim() || !languageForm.name.trim()) {
        toast("Language code and name are required.", { variant: "error" });
        return;
      }
      const payload = {
        code: languageForm.code.trim(),
        name: languageForm.name.trim(),
        nativeName: languageForm.nativeName.trim() || undefined,
        countryIds: selectedCountryIds,
      };
      const res = await fetch(
        editingLanguageId
          ? `/api/languages/${editingLanguageId}`
          : "/api/languages",
        {
          method: editingLanguageId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = error.error || "Failed to save language.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      setShowLanguageModal(false);
      setEditingLanguageId(null);
      setSelectedCountryIds([]);
      await refreshLanguages();
    };
    void saveLanguage();
  };

  const handleDeleteLanguage = (language: Language) => {
    const confirmed = window.confirm(`Delete language "${language.name}"?`);
    if (!confirmed) return;
    const removeLanguage = async () => {
      const res = await fetch(`/api/languages/${language.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = error.error || "Failed to delete language.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      await refreshLanguages();
      if (editingLanguageId === language.id) {
        setShowLanguageModal(false);
        setEditingLanguageId(null);
        setSelectedCountryIds([]);
      }
    };
    void removeLanguage();
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">Product Settings</h1>
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-col gap-2">
              {settingSections.map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`rounded px-3 py-2 text-left text-sm transition ${
                    activeSection === section
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800/60"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </aside>
          <section className="rounded-md border border-gray-800 bg-gray-900 p-6">
            {activeSection === "Price Groups" && (
              <PriceGroupsSettings
                loadingGroups={loadingGroups}
                priceGroups={priceGroups}
                handleOpenCreate={handleOpenCreate}
                handleEditGroup={handleEditGroup}
                handleDeleteGroup={handleDeleteGroup}
              />
            )}
            {activeSection === "Data Source" && (
              <DataSourceSettings
                productDbLoading={productDbLoading}
                productDbProvider={productDbProvider}
                setProductDbProvider={setProductDbProvider}
                setProductDbDirty={setProductDbDirty}
                productDbDirty={productDbDirty}
                productDbSaving={productDbSaving}
                handleSaveProductDbProvider={handleSaveProductDbProvider}
                migrationRunning={migrationRunning}
                migrationProcessed={migrationProcessed}
                migrationTotal={migrationTotal}
                migrationDirection={migrationDirection}
                missingImageIds={missingImageIds}
                missingCatalogIds={missingCatalogIds}
                runProductMigration={runProductMigration}
              />
            )}
            {activeSection === "Catalogs" && (
              <CatalogsSettings
                loadingCatalogs={loadingCatalogs}
                catalogs={catalogs}
                handleOpenCatalogModal={handleOpenCatalogModal}
                handleEditCatalog={handleOpenCatalogModal}
                handleDeleteCatalog={handleDeleteCatalog}
              />
            )}
            {activeSection === "Internationalization" && (
              <InternationalizationSettings
                loadingCurrencies={loadingCurrencies}
                currencyOptions={currencyOptions}
                handleOpenCurrencyModal={handleOpenCurrencyModal}
                handleDeleteCurrency={handleDeleteCurrency}
                loadingCountries={loadingCountries}
                filteredCountries={filteredCountries}
                countrySearch={countrySearch}
                setCountrySearch={setCountrySearch}
                handleOpenCountryModal={handleOpenCountryModal}
                handleDeleteCountry={handleDeleteCountry}
                languagesLoading={languagesLoading}
                languagesError={languagesError}
                languages={languages}
                handleOpenNewLanguageModal={handleOpenNewLanguageModal}
                handleOpenLanguageModal={handleOpenLanguageModal}
                handleDeleteLanguage={handleDeleteLanguage}
              />
            )}
          </section>
        </div>
      </div>
      {showCatalogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowCatalogModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingCatalogId ? "Edit Catalog" : "Create Catalog"}
              </h2>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowCatalogModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              {catalogError ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">Catalog save failed</span>
                    <button
                      className="rounded border border-red-400/50 px-2 py-1 text-[11px] text-red-100 hover:bg-red-500/20"
                      type="button"
                      onClick={() => {
                        if (catalogError) {
                          void navigator.clipboard.writeText(catalogError);
                          toast("Error copied to clipboard.", {
                            variant: "success",
                          });
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    className="mt-2 w-full resize-none rounded-md border border-red-500/30 bg-gray-900/70 p-2 text-[11px] text-red-100"
                    rows={3}
                    readOnly
                    value={catalogError}
                  />
                </div>
              ) : null}
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={catalogForm.name}
                  onChange={(event) =>
                    setCatalogForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Description</label>
                <textarea
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  rows={3}
                  value={catalogForm.description}
                  onChange={(event) =>
                    setCatalogForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  className="accent-emerald-400"
                  checked={catalogForm.isDefault}
                  disabled={!editingCatalogId && catalogs.length === 0}
                  onChange={(event) =>
                    setCatalogForm((prev) => ({
                      ...prev,
                      isDefault: event.target.checked,
                    }))
                  }
                />
                Set as default catalog
              </label>
              <div>
                <div className="rounded-md border border-gray-800 bg-gray-950/70 p-3">
                  <label className="text-xs text-gray-400">Languages</label>
                  {languagesLoading ? (
                    <p className="mt-2 text-xs text-gray-500">
                      Loading languages...
                    </p>
                  ) : languagesError ? (
                    <p className="mt-2 text-xs text-red-400">
                      {languagesError}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      <Input
                        placeholder="Search languages..."
                        value={catalogLanguageQuery}
                        onChange={(event) =>
                          setCatalogLanguageQuery(event.target.value)
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        {selectedLanguages.length === 0 ? (
                          <span className="text-[11px] text-gray-500">
                            No languages selected.
                          </span>
                        ) : (
                          selectedLanguages.map((language) => (
                            <button
                              key={language.id}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-200 hover:border-gray-500"
                              onClick={() => toggleLanguage(language.id)}
                            >
                              {language.name}
                              <span className="text-gray-500">
                                ({language.code})
                              </span>
                              <span className="text-gray-500">×</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200">
                        {availableLanguages.length === 0 ? (
                          <p className="text-gray-500">
                            No matching languages.
                          </p>
                        ) : (
                          availableLanguages.map((language) => (
                            <button
                              key={language.id}
                              type="button"
                              className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-gray-800"
                              onClick={() => toggleLanguage(language.id)}
                            >
                              <span>
                                {language.name}
                                <span className="ml-1 text-gray-500">
                                  ({language.code})
                                </span>
                              </span>
                              <span className="text-gray-500">Add</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  className="rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-900"
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                  type="button"
                  onClick={handleSubmitCatalog}
                  disabled={catalogSaving}
                >
                  {catalogSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showLanguageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowLanguageModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingLanguageId ? "Edit Language" : "Add Language"}
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Code</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={languageForm.code}
                  onChange={(event) =>
                    setLanguageForm((prev) => ({
                      ...prev,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. EN"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={languageForm.name}
                  onChange={(event) =>
                    setLanguageForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. English"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Native name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={languageForm.nativeName}
                  onChange={(event) =>
                    setLanguageForm((prev) => ({
                      ...prev,
                      nativeName: event.target.value,
                    }))
                  }
                  placeholder="e.g. English"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Countries</label>
                <div className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                  {countries.map((country) => (
                    <label
                      key={country.id}
                      className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountryIds.includes(country.id)}
                        onChange={() => toggleCountry(country.id)}
                      />
                      <span>
                        {country.name}
                        <span className="ml-1 text-gray-500">
                          ({country.code})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  className="rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-900"
                  type="button"
                  onClick={() => setShowLanguageModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                  type="button"
                  onClick={handleSaveLanguage}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">
                {editingGroupId ? "Edit Price Group" : "Create Price Group"}
              </h2>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowCreateModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formState.isDefault}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isDefault: event.target.checked,
                    }))
                  }
                />
                Set as default group
              </label>
              <div>
                <label className="text-sm text-gray-300">Price Group ID</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={formState.groupId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      groupId: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Description</label>
                <textarea
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Currency</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={formState.currencyId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      currencyId: event.target.value,
                    }))
                  }
                  disabled={loadingCurrencies}
                >
                  {loadingCurrencies && (
                    <option value="">Loading currencies...</option>
                  )}
                  {!loadingCurrencies &&
                    currencyOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.code} · {option.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Group type</label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      checked={formState.groupType === "standard"}
                      onChange={() =>
                        setFormState((prev) => ({
                          ...prev,
                          groupType: "standard",
                        }))
                      }
                    />
                    Standard
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      checked={formState.groupType === "dependent"}
                      onChange={() =>
                        setFormState((prev) => ({
                          ...prev,
                          groupType: "dependent",
                        }))
                      }
                    />
                    Dependent
                  </label>
                </div>
              </div>
              {formState.groupType === "dependent" && (
                <div>
                  <label className="text-sm text-gray-300">
                    Source Price Group
                  </label>
                  <select
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                    value={formState.sourceGroupId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        sourceGroupId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a source group</option>
                    {priceGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.groupId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-300">
                  Base Price Field
                </label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={formState.basePriceField}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      basePriceField: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-300">
                    Price Multiplier
                  </label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                    type="number"
                    step="0.01"
                    value={formState.priceMultiplier}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        priceMultiplier: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Add To Price</label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                    type="number"
                    value={formState.addToPrice}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        addToPrice: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-500"
                type="button"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                type="button"
                onClick={handleSaveGroup}
              >
                Save Price Group
              </button>
            </div>
          </div>
        </div>
      )}
      {showCurrencyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowCurrencyModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">
                {editingCurrencyId ? "Edit Currency" : "Add Currency"}
              </h2>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowCurrencyModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300">Code</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={currencyForm.code}
                  onChange={(event) =>
                    setCurrencyForm((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                >
                  {["PLN", "EUR", "USD", "GBP", "SEK"].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={currencyForm.name}
                  onChange={(event) =>
                    setCurrencyForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Symbol</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={currencyForm.symbol}
                  onChange={(event) =>
                    setCurrencyForm((prev) => ({
                      ...prev,
                      symbol: event.target.value,
                    }))
                  }
                  placeholder="e.g. $"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-500"
                type="button"
                onClick={() => setShowCurrencyModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                type="button"
                onClick={handleSaveCurrency}
              >
                Save Currency
              </button>
            </div>
          </div>
        </div>
      )}
      {showCountryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowCountryModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">
                {editingCountryId ? "Edit Country" : "Add Country"}
              </h2>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowCountryModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300">Code</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={countryForm.code}
                  onChange={(event) => {
                    const selected = countryCodeOptions.find(
                      (option) => option.code === event.target.value
                    );
                    setCountryForm((prev) => ({
                      ...prev,
                      code: event.target.value,
                      name: selected?.name ?? prev.name,
                    }));
                  }}
                >
                  {countryCodeOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code} · {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  value={countryForm.name}
                  onChange={(event) =>
                    setCountryForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Currencies</label>
                {loadingCurrencies ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Loading currencies...
                  </p>
                ) : (
                  <div className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                    {currencyOptions.map((currency) => (
                      <label
                        key={currency.id}
                        className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCurrencyIds.includes(currency.id)}
                          onChange={() => toggleCountryCurrency(currency.id)}
                        />
                        <span>
                          {currency.code}
                          <span className="ml-1 text-gray-500">
                            {currency.name}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-500"
                type="button"
                onClick={() => setShowCountryModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                type="button"
                onClick={handleSaveCountry}
              >
                Save Country
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
