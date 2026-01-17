"use client";

import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import type { Catalog } from "@/types/products";

export function useCatalogSync(catalogFilter: string) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [currencyPriceGroups, setCurrencyPriceGroups] = useState<
    Array<{ id: string; isDefault: boolean; currency?: { code?: string } | null }>
  >([]);
  
  const catalogFilterInitialized = useRef(false);

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
          setCatalogs(
            data.map((catalog) => ({
              ...catalog,
              priceGroupIds: catalog.priceGroupIds ?? [],
              defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
            }))
          );
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
        const data = await res.json();
        if (!mounted) return;
        setCurrencyPriceGroups(data);
      } catch (error) {
        logger.error("Failed to load price groups:", error);
      }
    };
    void loadPriceGroups();
    return () => { mounted = false; };
  }, []);

  // Sync Currency Options based on Catalog
  useEffect(() => {
    if (currencyPriceGroups.length === 0) return;
    const isCatalogScoped = catalogFilter !== "all" && catalogFilter !== "unassigned";
    const catalog = isCatalogScoped ? catalogs.find((entry) => entry.id === catalogFilter) : undefined;
    const catalogPriceGroupIds = catalog?.priceGroupIds ?? [];
    const allowedGroupIds = catalogPriceGroupIds.length > 0 ? new Set(catalogPriceGroupIds) : null;
    
    const candidateGroups = allowedGroupIds
      ? currencyPriceGroups.filter((group) => allowedGroupIds.has(group.id))
      : currencyPriceGroups;
      
    const codes = Array.from(
      new Set(
        candidateGroups
          .map((group) => group.currency?.code)
          .filter((code): code is string => Boolean(code))
      )
    );
    
    setCurrencyOptions(codes);
    
    const defaultGroupId = catalog?.defaultPriceGroupId ?? null;
    const defaultGroup = defaultGroupId
      ? candidateGroups.find((group) => group.id === defaultGroupId)
      : candidateGroups.find((group) => group.isDefault);
      
    const fallbackCode = defaultGroup?.currency?.code || codes[0] || "";
    setCurrencyCode((prev) => (prev && codes.includes(prev) ? prev : fallbackCode));
  }, [catalogFilter, catalogs, currencyPriceGroups]);

  return {
    catalogs,
    catalogsLoading,
    catalogsError,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    catalogFilterInitialized,
  };
}
