import { useState, useEffect, useMemo } from "react";
import type { Language } from "@prisma/client";
import type {
  CatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  ProductFormData,
} from "@/types";
import type { ProductCategory, ProductTag, ProductParameter } from "@/types/products";
import { UseFormSetValue, UseFormGetValues } from "react-hook-form";

// We need a generic way to set form values if we want to update defaultPriceGroupId, but strict types might be hard.
// We can accept the setValue function or handle it via a callback.

const FALLBACK_LANGUAGES: Language[] = [
  {
    id: "EN",
    code: "EN",
    name: "English",
    nativeName: "English",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "PL",
    code: "PL",
    name: "Polish",
    nativeName: "Polski",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "DE",
    code: "DE",
    name: "German",
    nativeName: "Deutsch",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

interface UseProductMetadataProps {
  product?: ProductWithImages | undefined;
  initialCatalogId?: string | undefined;
  initialCatalogIds?: string[] | undefined;
  initialCategoryIds?: string[] | undefined;
  initialTagIds?: string[] | undefined;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
}

export function useProductMetadata({
  product,
  initialCatalogId,
  initialCatalogIds,
  initialCategoryIds,
  initialTagIds,
  setValue,
  getValues,
}: UseProductMetadataProps) {
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>(
    () =>
      product?.catalogs?.map((entry) => entry.catalogId) ??
      initialCatalogIds ??
      []
  );

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () =>
      product?.categories?.map((entry: { categoryId: string }) => entry.categoryId) ??
      initialCategoryIds ??
      []
  );

  const [tags, setTags] = useState<ProductTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () =>
      product?.tags?.map((entry: { tagId: string }) => entry.tagId) ??
      initialTagIds ??
      []
  );

  const [languages, setLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [priceGroups, setPriceGroups] = useState<PriceGroupWithDetails[]>([]);
  const [parameters, setParameters] = useState<ProductParameter[]>([]);
  const [parametersLoading, setParametersLoading] = useState(false);

  // Auto-select default catalog for new products when none is chosen
  useEffect(() => {
    if (product) return;
    if (selectedCatalogIds.length > 0) return;
    if (catalogs.length === 0) return;
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    setSelectedCatalogIds([defaultCatalog?.id ?? catalogs[0].id]);
  }, [product, selectedCatalogIds.length, catalogs]);

  // Auto-set defaultPriceGroupId when catalog is selected for new products
  useEffect(() => {
    if (product) return; // Only for new products
    if (selectedCatalogIds.length === 0) return;

    // Get the first selected catalog's default price group
    const firstCatalog = catalogs.find((c) => selectedCatalogIds.includes(c.id));
    if (firstCatalog?.defaultPriceGroupId) {
      const currentDefaultPriceGroupId = getValues("defaultPriceGroupId");
      // Only set if not already set
      if (!currentDefaultPriceGroupId) {
        setValue("defaultPriceGroupId", firstCatalog.defaultPriceGroupId);
      }
    }
  }, [product, selectedCatalogIds, catalogs, getValues, setValue]);

  // Load categories when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setCategories([]);
      return;
    }

    let cancelled = false;
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const categoryPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/categories?catalogId=${catalogId}`).then((res) => res.json())
        );
        const categoryArrays = await Promise.all(categoryPromises);
        const allCategories = categoryArrays.flat() as ProductCategory[];

        if (!cancelled) {
          setCategories(allCategories);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [selectedCatalogIds]);

  // Load tags when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setTags([]);
      return;
    }

    let cancelled = false;
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        const tagPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/tags?catalogId=${catalogId}`).then((res) => res.json())
        );
        const tagArrays = await Promise.all(tagPromises);
        const allTags = tagArrays.flat() as ProductTag[];

        if (!cancelled) {
          setTags(allTags);
        }
      } catch (error) {
        console.error("Failed to load tags:", error);
        if (!cancelled) {
          setTags([]);
        }
      } finally {
        if (!cancelled) {
          setTagsLoading(false);
        }
      }
    };

    void loadTags();
    return () => {
      cancelled = true;
    };
  }, [selectedCatalogIds]);

  // Load parameters when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setParameters([]);
      return;
    }

    let cancelled = false;
    const loadParameters = async () => {
      setParametersLoading(true);
      try {
        const parameterPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/parameters?catalogId=${catalogId}`).then((res) => res.json())
        );
        const parameterArrays = await Promise.all(parameterPromises);
        const allParameters = parameterArrays.flat() as ProductParameter[];

        if (!cancelled) {
          setParameters(allParameters);
        }
      } catch (error) {
        console.error("Failed to load parameters:", error);
        if (!cancelled) {
          setParameters([]);
        }
      } finally {
        if (!cancelled) {
          setParametersLoading(false);
        }
      }
    };

    void loadParameters();
    return () => {
      cancelled = true;
    };
  }, [selectedCatalogIds]);

  // Load Catalogs
  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        setCatalogsLoading(true);
        const res = await fetch("/api/catalogs");
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          const message = payload?.error || "Failed to load catalogs";
          const suffix = payload?.errorId ? ` (Error ID: ${payload.errorId})` : "";
          throw new Error(`${message}${suffix}`);
        }
        const data = (await res.json()) as CatalogRecord[];
        if (!cancelled) {
          setCatalogs(data);
        }
      } catch (error) {
        console.error("Failed to load catalogs:", error);
        if (!cancelled) {
          setCatalogsError(
            error instanceof Error ? error.message : "Failed to load catalogs"
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    };
    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Languages
  useEffect(() => {
    let cancelled = false;
    const loadLanguages = async () => {
      try {
        const res = await fetch("/api/languages");
        if (!res.ok) return;
        const data = (await res.json()) as Language[];
        if (!cancelled) {
          setLanguages(data);
        }
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };
    void loadLanguages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Price Groups
  useEffect(() => {
    let cancelled = false;
    const loadPriceGroups = async () => {
      try {
        const res = await fetch("/api/price-groups");
        if (!res.ok) return;
        const data = (await res.json()) as PriceGroupWithDetails[];
        if (!cancelled) {
          setPriceGroups(data);
        }
      } catch (error) {
        console.error("Failed to load price groups:", error);
      }
    };
    void loadPriceGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLanguages = useMemo(() => {
    if (selectedCatalogIds.length === 0) return languages;
    if (catalogsLoading || catalogs.length === 0) return [];

    const selectedCatalogs = catalogs.filter((catalog) => selectedCatalogIds.includes(catalog.id));
    if (selectedCatalogs.length === 0) {
      return languages;
    }

    const allowedLanguageIds = new Set(
      selectedCatalogs.flatMap((catalog) => catalog.languageIds ?? [])
    );

    if (allowedLanguageIds.size === 0) {
      return languages;
    }

    const filtered = languages.filter((language) => allowedLanguageIds.has(language.id));
    return filtered.length > 0 ? filtered : languages;
  }, [languages, catalogs, selectedCatalogIds, catalogsLoading]);

  const filteredPriceGroups = useMemo(() => {
    if (selectedCatalogIds.length === 0) return priceGroups;
    const allowedGroupIds = new Set<string>();
    const orderedGroups: PriceGroupWithDetails[] = [];

    // Only include price groups that are explicitly assigned to selected catalogs
    selectedCatalogIds.forEach((catalogId) => {
      const catalog = catalogs.find((c) => c.id === catalogId);
      if (catalog?.priceGroupIds) {
        catalog.priceGroupIds.forEach((pgId) => {
          if (!allowedGroupIds.has(pgId)) {
            const pg = priceGroups.find((p) => p.id === pgId);
            if (pg) {
              orderedGroups.push(pg);
              allowedGroupIds.add(pgId);
            }
          }
        });
      }
    });

    return orderedGroups.length > 0 ? orderedGroups : priceGroups;
  }, [priceGroups, catalogs, selectedCatalogIds]);

  const toggleCatalog = (catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return {
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryIds,
    toggleCategory,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    parameters,
    parametersLoading,
    filteredLanguages,
    filteredPriceGroups,
  };
}
