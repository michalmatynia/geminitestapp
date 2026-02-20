import React from 'react';

import { useSaveCatalogMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog } from '@/shared/contracts/products';
import type { Language } from '@/shared/contracts/internationalization';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface CatalogFormState {
  name: string;
  description: string;
  isDefault: boolean;
}

interface UseCatalogFormProps {
  catalog?: Catalog | null | undefined;
  languages: Language[];
  defaultGroupId: string;
}

interface UseCatalogFormReturn {
  form: CatalogFormState;
  setForm: React.Dispatch<React.SetStateAction<CatalogFormState>>;
  selectedLanguageIds: string[];
  setSelectedLanguageIds: React.Dispatch<React.SetStateAction<string[]>>;
  defaultLanguageId: string;
  setDefaultLanguageId: React.Dispatch<React.SetStateAction<string>>;
  catalogPriceGroupIds: string[];
  setCatalogPriceGroupIds: React.Dispatch<React.SetStateAction<string[]>>;
  catalogDefaultPriceGroupId: string;
  setCatalogDefaultPriceGroupId: React.Dispatch<React.SetStateAction<string>>;
  languageQuery: string;
  setLanguageQuery: React.Dispatch<React.SetStateAction<string>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  languageIdByAnyValue: Map<string, string>;
  canonicalizeLanguageId: (value: string) => string;
  getLanguage: (value: string) => Language | undefined;
  saveMutation: ReturnType<typeof useSaveCatalogMutation>;
  handleSubmit: () => Promise<void>;
}

export function useCatalogForm({
  catalog,
  languages,
  defaultGroupId,
}: UseCatalogFormProps): UseCatalogFormReturn {
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CatalogFormState>({
    name: '',
    description: '',
    isDefault: false,
  });
  const [selectedLanguageIds, setSelectedLanguageIds] = React.useState<string[]>([]);
  const [defaultLanguageId, setDefaultLanguageId] = React.useState('');
  const [catalogPriceGroupIds, setCatalogPriceGroupIds] = React.useState<string[]>([]);
  const [catalogDefaultPriceGroupId, setCatalogDefaultPriceGroupId] = React.useState('');
  const [languageQuery, setLanguageQuery] = React.useState('');
  const { toast } = useToast();
  const saveMutation = useSaveCatalogMutation();

  const languageIdByAnyValue = React.useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    languages.forEach((language: Language) => {
      const id = language.id?.trim();
      const code = language.code?.trim();
      if (id) {
        map.set(id, id);
        map.set(id.toLowerCase(), id);
      }
      if (code && id) {
        map.set(code, id);
        map.set(code.toLowerCase(), id);
      }
    });
    return map;
  }, [languages]);

  const canonicalizeLanguageId = React.useCallback(
    (value: string): string => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      return (
        languageIdByAnyValue.get(trimmed) ??
        languageIdByAnyValue.get(trimmed.toLowerCase()) ??
        trimmed
      );
    },
    [languageIdByAnyValue]
  );

  const getLanguage = React.useCallback(
    (value: string): Language | undefined => {
      const canonicalId = canonicalizeLanguageId(value);
      return languages.find((language: Language) => language.id === canonicalId);
    },
    [canonicalizeLanguageId, languages]
  );

  React.useEffect(() => {
    if (catalog) {
      setForm({
        name: catalog.name,
        description: catalog.description ?? '',
        isDefault: catalog.isDefault,
      });
      const nextLanguageIds = Array.from(
        new Set((catalog.languageIds ?? []).map((id: string) => canonicalizeLanguageId(id)))
      ).filter((id: string) => Boolean(id));
      setSelectedLanguageIds(nextLanguageIds);
      const normalizedDefaultLanguageId = catalog.defaultLanguageId
        ? canonicalizeLanguageId(catalog.defaultLanguageId)
        : '';
      setDefaultLanguageId(
        nextLanguageIds.includes(normalizedDefaultLanguageId)
          ? normalizedDefaultLanguageId
          : nextLanguageIds[0] ?? '',
      );
      const nextPriceGroupIds = catalog.priceGroupIds?.length
        ? catalog.priceGroupIds
        : defaultGroupId
          ? [defaultGroupId]
          : [];
      setCatalogPriceGroupIds(nextPriceGroupIds);
      setCatalogDefaultPriceGroupId(
        catalog.defaultPriceGroupId ??
          nextPriceGroupIds[0] ??
          defaultGroupId ??
          '',
      );
    } else {
      setForm({
        name: '',
        description: '',
        isDefault: false,
      });
      setSelectedLanguageIds([]);
      setDefaultLanguageId('');
      setCatalogPriceGroupIds(defaultGroupId ? [defaultGroupId] : []);
      setCatalogDefaultPriceGroupId(defaultGroupId ?? '');
    }
    setError(null);
    setLanguageQuery('');
  }, [catalog, defaultGroupId, canonicalizeLanguageId]);

  const handleSubmit = async (): Promise<void> => {
    if (saveMutation.isPending) return;
    const name = form.name.trim();
    if (!name) {
      toast('Catalog name is required.', { variant: 'error' });
      return;
    }
    if (selectedLanguageIds.length === 0) {
      toast('Select at least one language.', { variant: 'error' });
      return;
    }
    if (
      !defaultLanguageId ||
      !selectedLanguageIds.includes(defaultLanguageId)
    ) {
      toast('Select a default language.', { variant: 'error' });
      return;
    }
    if (catalogPriceGroupIds.length === 0) {
      toast('Select at least one price group.', { variant: 'error' });
      return;
    }
    if (
      !catalogDefaultPriceGroupId ||
      !catalogPriceGroupIds.includes(catalogDefaultPriceGroupId)
    ) {
      toast('Select a default price group.', { variant: 'error' });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(catalog?.id ? { id: catalog.id } : {}),
        data: {
          name,
          description: form.description.trim(),
          languageIds: selectedLanguageIds,
          defaultLanguageId,
          priceGroupIds: catalogPriceGroupIds,
          defaultPriceGroupId: catalogDefaultPriceGroupId,
          isDefault: form.isDefault,
        },
      });

      toast('Catalog saved.', { variant: 'success' });
    } catch (err) {
      logClientError(err, { context: { source: 'CatalogModal', action: 'saveCatalog', catalogId: catalog?.id } });
      setError(err instanceof Error ? err.message : 'Failed to save catalog.');
    }
  };

  return {
    form,
    setForm,
    selectedLanguageIds,
    setSelectedLanguageIds,
    defaultLanguageId,
    setDefaultLanguageId,
    catalogPriceGroupIds,
    setCatalogPriceGroupIds,
    catalogDefaultPriceGroupId,
    setCatalogDefaultPriceGroupId,
    languageQuery,
    setLanguageQuery,
    error,
    setError,
    languageIdByAnyValue,
    canonicalizeLanguageId,
    getLanguage,
    saveMutation,
    handleSubmit,
  };
}
