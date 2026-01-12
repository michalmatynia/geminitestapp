"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const settingSections = [
  "Price Groups",
  "Catalogs",
  "Internationalization",
] as const;

type PriceGroupType = "standard" | "dependent";

type PriceGroup = {
  id: string;
  groupId: string;
  name: string;
  description: string;
  currencyId: string;
  currencyCode: string;
  isDefault: boolean;
  groupType: PriceGroupType;
  basePriceField: string;
  sourceGroupId?: string | null;
  priceMultiplier: number;
  addToPrice: number;
};

type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
};

type CountryOption = {
  id: string;
  code: string;
  name: string;
  currencies?: { currencyId: string; currency: CurrencyOption }[];
};

type Catalog = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  languages?: { languageId: string; language: Language }[];
};

type Language = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries?: { countryId: string; country: CountryOption }[];
};

const countryCodeOptions = [
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "SE", name: "Sweden" },
  { code: "US", name: "United States" },
];

const countryFlagMap: Record<string, JSX.Element> = {
  PL: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="8" fill="#ffffff" />
      <rect y="8" width="24" height="8" fill="#dc143c" />
    </svg>
  ),
  DE: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="5.33" fill="#000000" />
      <rect y="5.33" width="24" height="5.33" fill="#dd0000" />
      <rect y="10.66" width="24" height="5.34" fill="#ffce00" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#012169" />
      <path
        d="M0 0L24 16M24 0L0 16"
        stroke="#ffffff"
        strokeWidth="3"
      />
      <path
        d="M0 0L24 16M24 0L0 16"
        stroke="#c8102e"
        strokeWidth="1.5"
      />
      <rect x="10" width="4" height="16" fill="#ffffff" />
      <rect y="6" width="24" height="4" fill="#ffffff" />
      <rect x="11" width="2" height="16" fill="#c8102e" />
      <rect y="7" width="24" height="2" fill="#c8102e" />
    </svg>
  ),
  SE: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#005293" />
      <rect x="6" width="4" height="16" fill="#fecb00" />
      <rect y="6" width="24" height="4" fill="#fecb00" />
    </svg>
  ),
  US: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#ffffff" />
      <g fill="#b22234">
        <rect y="0" width="24" height="2" />
        <rect y="4" width="24" height="2" />
        <rect y="8" width="24" height="2" />
        <rect y="12" width="24" height="2" />
      </g>
      <rect width="10" height="8" fill="#3c3b6e" />
    </svg>
  ),
};

export default function ProductSettingsPage() {
  const [activeSection, setActiveSection] = useState<(typeof settingSections)[number]>(
    "Price Groups"
  );
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
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(null);
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [languageForm, setLanguageForm] = useState({
    code: "",
    name: "",
    nativeName: "",
  });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(null);
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
  });
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
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
        const payload = (await res.json()) as { error?: string; errorId?: string };
        const message = payload?.error || "Failed to fetch languages.";
        const suffix = payload?.errorId ? ` (Error ID: ${payload.errorId})` : "";
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
      alert("Price group ID is required.");
      return;
    }
    if (!formState.name.trim()) {
      alert("Price group name is required.");
      return;
    }
    if (!formState.currencyId) {
      alert("Currency is required.");
      return;
    }
    if (
      formState.groupType === "dependent" &&
      !formState.sourceGroupId.trim()
    ) {
      alert("Source price group is required for dependent groups.");
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
      editingGroupId ? `/api/price-groups/${editingGroupId}` : "/api/price-groups",
      {
        method: editingGroupId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to save price group.");
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
    const confirmed = window.confirm(
      `Delete price group "${group.name}"?`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/price-groups/${group.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to delete price group.");
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
      alert("Currency code and name are required.");
      return;
    }
    const res = await fetch(
      editingCurrencyId ? `/api/currencies/${editingCurrencyId}` : "/api/currencies",
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
      alert(error.error || "Failed to save currency.");
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
      alert(error.error || "Failed to delete currency.");
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
      alert("Country code and name are required.");
      return;
    }
    const res = await fetch(
      editingCountryId ? `/api/countries/${editingCountryId}` : "/api/countries",
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
      alert(error.error || "Failed to save country.");
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
      alert(error.error || "Failed to delete country.");
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
      });
      setSelectedLanguageIds(
        catalog.languages?.map((entry) => entry.languageId) ?? []
      );
    } else {
      setEditingCatalogId(null);
      setCatalogForm({ name: "", description: "" });
      setSelectedLanguageIds([]);
    }
    setShowCatalogModal(true);
  };

  const handleSubmitCatalog = () => {
    const submitCatalog = async () => {
      const name = catalogForm.name.trim();
      const description = catalogForm.description.trim();
      if (!name) {
        alert("Catalog name is required.");
        return;
      }
      const endpoint = editingCatalogId
        ? `/api/catalogs/${editingCatalogId}`
        : "/api/catalogs";
      const res = await fetch(endpoint, {
        method: editingCatalogId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, languageIds: selectedLanguageIds }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to save catalog.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        alert(`${message}${suffix}`);
        return;
      }
      setShowCatalogModal(false);
      setEditingCatalogId(null);
      setCatalogForm({ name: "", description: "" });
      setSelectedLanguageIds([]);
      await refreshCatalogs();
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
        alert("Language code and name are required.");
        return;
      }
      const payload = {
        code: languageForm.code.trim(),
        name: languageForm.name.trim(),
        nativeName: languageForm.nativeName.trim() || undefined,
        countryIds: selectedCountryIds,
      };
      const res = await fetch(
        editingLanguageId ? `/api/languages/${editingLanguageId}` : "/api/languages",
        {
          method: editingLanguageId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to save language.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        alert(`${message}${suffix}`);
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
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to delete language.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        alert(`${message}${suffix}`);
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
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-white">
                      Price Groups
                    </h2>
                    <button
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                      type="button"
                      onClick={handleOpenCreate}
                    >
                      Add Price Group
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    Configure pricing tiers and group rules for products.
                  </p>
                </div>
                {loadingGroups ? (
                  <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                    Loading price groups...
                  </div>
                ) : priceGroups.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                    Select a price group to edit or add a new one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priceGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-white">
                            <span className="font-semibold">{group.name}</span>
                            {group.isDefault && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                                Default
                              </span>
                            )}
                            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                              {group.groupId}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            {group.currencyCode} · {group.groupType}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">
                            {group.description || "No description"}
                          </span>
                          <button
                            className="text-sm text-gray-300 hover:text-white"
                            type="button"
                            onClick={() => handleEditGroup(group)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-red-400 hover:text-red-300"
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeSection === "Catalogs" && (
              <div className="space-y-5">
                <div className="flex justify-start">
                  <button
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                    type="button"
                    onClick={() => handleOpenCatalogModal()}
                  >
                    Add Catalog
                  </button>
                </div>
                <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
                  <p className="text-sm font-semibold text-white">Existing Catalogs</p>
                  {loadingCatalogs ? (
                    <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                      Loading catalogs...
                    </div>
                  ) : catalogs.length === 0 ? (
                    <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                      No catalogs yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {catalogs.map((catalog) => (
                        <div
                          key={catalog.id}
                          className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {catalog.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {catalog.description || "No description"}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                                aria-label="Catalog actions"
                                type="button"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleOpenCatalogModal(catalog);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeSection === "Internationalization" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          Currencies
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                          Manage currency codes available for price groups.
                        </p>
                      </div>
                      <button
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                        type="button"
                        onClick={() => handleOpenCurrencyModal()}
                      >
                        Add Currency
                      </button>
                    </div>
                    {loadingCurrencies ? (
                      <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                        Loading currencies...
                      </div>
                    ) : currencyOptions.length === 0 ? (
                      <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                        No currencies yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currencyOptions.map((currency) => (
                          <div
                            key={currency.id}
                            className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-white">
                                {currency.code}
                                {currency.symbol ? (
                                  <span className="ml-2 text-sm text-gray-400">
                                    {currency.symbol}
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-sm text-gray-400">
                                {currency.name}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                                  aria-label="Currency actions"
                                  type="button"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleOpenCurrencyModal(currency);
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-300 focus:text-red-300"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    void handleDeleteCurrency(currency);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          Countries
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                          Manage countries for regional settings.
                        </p>
                      </div>
                      <button
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                        type="button"
                        onClick={() => handleOpenCountryModal()}
                      >
                        Add Country
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="w-full md:max-w-sm">
                        <input
                          className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(event) => setCountrySearch(event.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {filteredCountries.length} result(s)
                      </p>
                    </div>
                    {loadingCountries ? (
                      <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                        Loading countries...
                      </div>
                    ) : filteredCountries.length === 0 ? (
                      <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
                        No countries yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCountries.map((country) => (
                          <div
                            key={country.id}
                            className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="h-4 w-6 overflow-hidden rounded-sm border border-gray-700">
                                  {countryFlagMap[country.code] ?? null}
                                </span>
                                <p className="font-semibold text-white">
                                  {country.code}
                                </p>
                              </div>
                              <p className="text-sm text-gray-400">
                                {country.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {country.currencies?.length ? (
                                  country.currencies.map((entry) => (
                                    <span
                                      key={entry.currencyId}
                                      className="rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-gray-200"
                                    >
                                      {entry.currency.code}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    No currencies assigned
                                  </span>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                                  aria-label="Country actions"
                                  type="button"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleOpenCountryModal(country);
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-300 focus:text-red-300"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    void handleDeleteCountry(country);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Languages</p>
                      <button
                        className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-200"
                        type="button"
                        onClick={handleOpenNewLanguageModal}
                      >
                        Add Language
                      </button>
                    </div>
                    {languagesLoading ? (
                      <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                        Loading languages...
                      </div>
                    ) : languagesError ? (
                      <div className="mt-4 rounded-md border border-dashed border-red-500/40 p-4 text-center text-sm text-red-200">
                        {languagesError}
                      </div>
                    ) : languages.length === 0 ? (
                      <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                        No languages yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {languages.map((language) => (
                          <div
                            key={language.id}
                            className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {language.name}
                                <span className="ml-2 text-xs text-gray-500">
                                  ({language.code})
                                </span>
                              </p>
                              {language.nativeName ? (
                                <p className="text-xs text-gray-500">
                                  {language.nativeName}
                                </p>
                              ) : null}
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                                {language.countries?.length ? (
                                  language.countries.map((entry) => (
                                    <div
                                      key={entry.countryId}
                                      className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-gray-200"
                                      title={entry.country.name}
                                    >
                                      <span className="h-3 w-4 overflow-hidden rounded-sm border border-gray-700">
                                        {countryFlagMap[entry.country.code] ?? null}
                                      </span>
                                      <span>{entry.country.name}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span>No countries assigned</span>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
                                  aria-label="Language actions"
                                  type="button"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleOpenLanguageModal(language);
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-300 focus:text-red-300"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleDeleteLanguage(language);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
              <div>
                <label className="text-xs text-gray-400">Languages</label>
                {languagesLoading ? (
                  <p className="mt-2 text-xs text-gray-500">Loading languages...</p>
                ) : languagesError ? (
                  <p className="mt-2 text-xs text-red-400">{languagesError}</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {languages.map((language) => (
                      <label
                        key={language.id}
                        className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLanguageIds.includes(language.id)}
                          onChange={() => toggleLanguage(language.id)}
                        />
                        <span>
                          {language.name}
                          <span className="ml-1 text-gray-500">
                            ({language.code})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
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
                >
                  Save
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
                <label className="text-sm text-gray-300">Base Price Field</label>
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
                  <label className="text-sm text-gray-300">
                    Add To Price
                  </label>
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
                  <p className="mt-2 text-xs text-gray-500">Loading currencies...</p>
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
