"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { logger } from "@/lib/logger";
import type { Catalog } from "@/types/products";
import type { PriceGroupWithDetails } from "@/types";

type LanguageRecord = { id: string; code: string; name: string };
type LanguageOption = { value: "name_en" | "name_pl" | "name_de"; label: string };

const supportedLanguageMap: Record<string, LanguageOption> = {
  EN: { value: "name_en", label: "English" },
  PL: { value: "name_pl", label: "Polish" },
  DE: { value: "name_de", label: "German" },
};

export function useCatalogSync(catalogFilter: string) {
  const [rawCatalogs, setRawCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);

  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroupWithDetails[]>([]);
  const [currencyPriceGroups, setCurrencyPriceGroups] = useState<
    Array<{ id: string; isDefault: boolean; currency?: { code?: string } | null }>
  >([]);
  const [allowedCurrencyCodes, setAllowedCurrencyCodes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<LanguageRecord[]>([]);

  const catalogFilterInitialized = useRef(false);

  // Memoize catalog transformation to prevent new references
  const catalogs = useMemo(() =>
    rawCatalogs.map((catalog) => ({
      ...catalog,
      priceGroupIds: catalog.priceGroupIds ?? [],
      defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
    })),
    [rawCatalogs]
  );

  // Load Catalogs
  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        setCatalogsLoading(true);
        const res = await fetch("/api/catalogs");
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          throw new Error(payload?.error || "Failed to load catalogs");
        }
        const data = (await res.json()) as Catalog[];
        if (!cancelled) {
          setRawCatalogs(data);
        }
      } catch (error) {
        logger.error("Failed to load catalogs:", error);
        if (!cancelled) {
          setCatalogsError(error instanceof Error ? error.message : "Failed to load catalogs");
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    };
    void loadCatalogs();
    return () => { cancelled = true; };
  }, []);

  // Load Price Groups
  useEffect(() => {
    let mounted = true;
    const loadPriceGroups = async () => {
      try {
        const res = await fetch("/api/price-groups");
        if (!res.ok) return;
        const data = await res.json() as PriceGroupWithDetails[];
        if (!mounted) return;
        setPriceGroups(data);
        setCurrencyPriceGroups(data);
      } catch (error) {
        logger.error("Failed to load price groups:", error);
      }
    };
    void loadPriceGroups();
    return () => { mounted = false; };
  }, []);

  // Load languages for catalog-scoped language selection.
  useEffect(() => {
    let mounted = true;
    const loadLanguages = async () => {
      try {
        const res = await fetch("/api/languages");
        if (!res.ok) return;
        const data = (await res.json()) as LanguageRecord[];
        if (!mounted) return;
        setLanguages(data);
      } catch (error) {
        logger.error("Failed to load languages:", error);
      }
    };
    void loadLanguages();
    return () => { mounted = false; };
  }, []);

  // Load allowed currencies to avoid displaying invalid codes.
  useEffect(() => {
    let mounted = true;
    const loadCurrencies = async () => {
      try {
        const res = await fetch("/api/currencies");
        if (!res.ok) return;
        const data = await res.json() as Array<{ code?: string | null }>;
        if (!mounted) return;
        const codes = data
          .map((entry) => entry.code?.trim().toUpperCase())
          .filter((code): code is string => Boolean(code));
        setAllowedCurrencyCodes(Array.from(new Set(codes)));
      } catch (error) {
        logger.error("Failed to load currencies:", error);
      }
    };
    void loadCurrencies();
    return () => { mounted = false; };
  }, []);

  // Memoize currency options to prevent unnecessary re-renders
  const { codes, fallbackCode } = useMemo(() => {
    if (currencyPriceGroups.length === 0) return { codes: [], fallbackCode: "" };

    const isCatalogScoped = catalogFilter !== "all" && catalogFilter !== "unassigned";
    const catalog = isCatalogScoped ? catalogs.find((entry) => entry.id === catalogFilter) : undefined;
    const catalogPriceGroupIds = catalog?.priceGroupIds ?? [];
    const allowedGroupIds = catalogPriceGroupIds.length > 0 ? new Set(catalogPriceGroupIds) : null;

    const candidateGroups = allowedGroupIds
      ? currencyPriceGroups.filter((group) => allowedGroupIds.has(group.id))
      : currencyPriceGroups;

    let codes = Array.from(
      new Set(
        candidateGroups
          .map((group) => group.currency?.code)
          .filter((code): code is string => Boolean(code))
      )
    ).map((code) => code.trim().toUpperCase());

    const allowedSet = new Set(allowedCurrencyCodes.map((code) => code.trim().toUpperCase()));
    if (allowedSet.size > 0) {
      codes = codes.filter((code) => allowedSet.has(code));
    } else {
      // Basic safety filter if no allowed list available.
      codes = codes.filter((code) => /^[A-Z]{3,5}$/.test(code));
    }

    const defaultGroupId = catalog?.defaultPriceGroupId ?? null;
    const defaultGroup = defaultGroupId
      ? candidateGroups.find((group) => group.id === defaultGroupId)
      : candidateGroups.find((group) => group.isDefault);

    const fallbackCode = defaultGroup?.currency?.code || codes[0] || "";

    return { codes, fallbackCode };
  }, [catalogFilter, catalogs, currencyPriceGroups, allowedCurrencyCodes]);

  // Sync Currency Options based on Catalog
  useEffect(() => {
    setCurrencyOptions(codes);
    setCurrencyCode((prev) => (prev && codes.includes(prev) ? prev : fallbackCode));
  }, [codes, fallbackCode]);

  const { languageOptions, fallbackNameLocale } = useMemo(() => {
    const options: LanguageOption[] = [];
    const isCatalogScoped = catalogFilter !== "all" && catalogFilter !== "unassigned";
    const catalog = isCatalogScoped ? catalogs.find((entry) => entry.id === catalogFilter) : undefined;
    const allowedIds = catalog?.languageIds ?? [];

    const scopedLanguages =
      allowedIds.length > 0
        ? languages.filter((lang) => allowedIds.includes(lang.id))
        : languages;

    const seen = new Set<string>();
    scopedLanguages.forEach((lang) => {
      const key = lang.code?.trim().toUpperCase();
      const option = supportedLanguageMap[key];
      if (!option || seen.has(option.value)) return;
      seen.add(option.value);
      options.push(option);
    });

    if (options.length === 0) {
      options.push(supportedLanguageMap.EN);
      options.push(supportedLanguageMap.PL);
      options.push(supportedLanguageMap.DE);
    }

    const defaultLanguageId = catalog?.defaultLanguageId ?? null;
    const defaultLang = defaultLanguageId
      ? languages.find((lang) => lang.id === defaultLanguageId)
      : null;
    const defaultOption = defaultLang
      ? supportedLanguageMap[defaultLang.code?.trim().toUpperCase()]
      : undefined;
    const fallbackNameLocale = defaultOption?.value ?? options[0].value;

    return { languageOptions: options, fallbackNameLocale };
  }, [catalogFilter, catalogs, languages]);

  return {
    catalogs,
    catalogsLoading,
    catalogsError,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    priceGroups,
    catalogFilterInitialized,
    languageOptions,
    fallbackNameLocale,
  };
}
