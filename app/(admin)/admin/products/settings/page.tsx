"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const settingSections = ["Price Groups", "Currencies", "Countries"] as const;

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
};

type CountryOption = {
  id: string;
  code: string;
  name: string;
};

const countryCodeOptions = [
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
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
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    code: "PLN",
    name: "",
  });
  const [countryForm, setCountryForm] = useState({
    code: "",
    name: "",
  });
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

  useEffect(() => {
    void refreshCurrencies();
    void refreshCountries();
    void refreshPriceGroups();
  }, [refreshCurrencies, refreshCountries, refreshPriceGroups]);

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
      setCurrencyForm({ code: currency.code, name: currency.name });
      setEditingCurrencyId(currency.id);
    } else {
      setCurrencyForm({ code: "PLN", name: "" });
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
    } else {
      const defaultCountry = countryCodeOptions[0];
      setCountryForm({ code: defaultCountry.code, name: defaultCountry.name });
      setEditingCountryId(null);
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

  const filteredCountries = countries.filter((country) => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      country.code.toLowerCase().includes(query) ||
      country.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-white">Product Settings</h1>
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Categories
            </p>
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
            {activeSection === "Currencies" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Currencies</h2>
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
                          </p>
                          <p className="text-sm text-gray-400">{currency.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-sm text-gray-300 hover:text-white"
                            type="button"
                            onClick={() => handleOpenCurrencyModal(currency)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-red-400 hover:text-red-300"
                            type="button"
                            onClick={() => handleDeleteCurrency(currency)}
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
            {activeSection === "Countries" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Countries</h2>
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
                          <p className="text-sm text-gray-400">{country.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-sm text-gray-300 hover:text-white"
                            type="button"
                            onClick={() => handleOpenCountryModal(country)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-red-400 hover:text-red-300"
                            type="button"
                            onClick={() => handleDeleteCountry(country)}
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
          </section>
        </div>
      </div>
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
                  {["PLN", "EUR", "USD", "GBP"].map((code) => (
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
