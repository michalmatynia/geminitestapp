'use client';

import React from 'react';

import { useSaveCatalogMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Language } from '@/shared/contracts/internationalization';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import { resolvePriceGroupIdentifierToId } from '@/shared/lib/products/utils/price-group-identifiers';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface CatalogFormState {
  name: string;
  description: string;
  isDefault: boolean;
}

interface UseCatalogFormProps {
  catalog?: Catalog | null | undefined;
  languages: Language[];
  priceGroups: PriceGroup[];
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

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value: string, index: number) => value === b[index]);

export function useCatalogForm({
  catalog,
  languages,
  priceGroups,
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

  const canonicalizePriceGroupId = React.useCallback(
    (value: string): string => resolvePriceGroupIdentifierToId(priceGroups, value),
    [priceGroups]
  );

  const normalizePriceGroupIds = React.useCallback(
    (values: string[]): string[] =>
      Array.from(
        new Set(
          values
            .map((value: string) => canonicalizePriceGroupId(value))
            .filter((value: string) => Boolean(value))
        )
      ),
    [canonicalizePriceGroupId]
  );

  React.useEffect(() => {
    const normalizedDefaultGroupId = canonicalizePriceGroupId(defaultGroupId);
    if (catalog) {
      const nextForm = {
        name: catalog.name,
        description: catalog.description ?? '',
        isDefault: catalog.isDefault,
      };
      setForm((previousForm) =>
        previousForm.name === nextForm.name &&
        previousForm.description === nextForm.description &&
        previousForm.isDefault === nextForm.isDefault
          ? previousForm
          : nextForm
      );
      const nextLanguageIds = Array.from(
        new Set((catalog.languageIds ?? []).map((id: string) => canonicalizeLanguageId(id)))
      ).filter((id: string) => Boolean(id));
      setSelectedLanguageIds((previousLanguageIds) =>
        arraysEqual(previousLanguageIds, nextLanguageIds) ? previousLanguageIds : nextLanguageIds
      );
      const normalizedDefaultLanguageId = catalog.defaultLanguageId
        ? canonicalizeLanguageId(catalog.defaultLanguageId)
        : '';
      const nextDefaultLanguageId = nextLanguageIds.includes(normalizedDefaultLanguageId)
        ? normalizedDefaultLanguageId
        : (nextLanguageIds[0] ?? '');
      setDefaultLanguageId((previousDefaultLanguageId) =>
        previousDefaultLanguageId === nextDefaultLanguageId
          ? previousDefaultLanguageId
          : nextDefaultLanguageId
      );
      const nextPriceGroupIds = catalog.priceGroupIds?.length
        ? normalizePriceGroupIds(catalog.priceGroupIds)
        : normalizedDefaultGroupId
          ? [normalizedDefaultGroupId]
          : [];
      const normalizedCatalogDefaultPriceGroupId = catalog.defaultPriceGroupId
        ? canonicalizePriceGroupId(catalog.defaultPriceGroupId)
        : '';
      setCatalogPriceGroupIds((previousPriceGroupIds) =>
        arraysEqual(previousPriceGroupIds, nextPriceGroupIds)
          ? previousPriceGroupIds
          : nextPriceGroupIds
      );
      const nextCatalogDefaultPriceGroupId = nextPriceGroupIds.includes(
        normalizedCatalogDefaultPriceGroupId
      )
        ? normalizedCatalogDefaultPriceGroupId
        : (nextPriceGroupIds[0] ?? normalizedDefaultGroupId ?? '');
      setCatalogDefaultPriceGroupId((previousDefaultPriceGroupId) =>
        previousDefaultPriceGroupId === nextCatalogDefaultPriceGroupId
          ? previousDefaultPriceGroupId
          : nextCatalogDefaultPriceGroupId
      );
    } else {
      const nextForm = {
        name: '',
        description: '',
        isDefault: false,
      };
      setForm((previousForm) =>
        previousForm.name === nextForm.name &&
        previousForm.description === nextForm.description &&
        previousForm.isDefault === nextForm.isDefault
          ? previousForm
          : nextForm
      );
      setSelectedLanguageIds((previousLanguageIds) =>
        previousLanguageIds.length === 0 ? previousLanguageIds : []
      );
      setDefaultLanguageId((previousDefaultLanguageId) =>
        previousDefaultLanguageId === '' ? previousDefaultLanguageId : ''
      );
      const nextPriceGroupIds = normalizedDefaultGroupId ? [normalizedDefaultGroupId] : [];
      setCatalogPriceGroupIds((previousPriceGroupIds) =>
        arraysEqual(previousPriceGroupIds, nextPriceGroupIds)
          ? previousPriceGroupIds
          : nextPriceGroupIds
      );
      setCatalogDefaultPriceGroupId((previousDefaultPriceGroupId) =>
        previousDefaultPriceGroupId === normalizedDefaultGroupId
          ? previousDefaultPriceGroupId
          : normalizedDefaultGroupId
      );
    }
    setError((previousError) => (previousError === null ? previousError : null));
    setLanguageQuery((previousLanguageQuery) =>
      previousLanguageQuery === '' ? previousLanguageQuery : ''
    );
  }, [
    catalog,
    canonicalizeLanguageId,
    canonicalizePriceGroupId,
    defaultGroupId,
    normalizePriceGroupIds,
  ]);

  const handleSubmit = async (): Promise<void> => {
    if (saveMutation.isPending) return;
    const name = form.name.trim();
    const normalizedCatalogPriceGroupIds = normalizePriceGroupIds(catalogPriceGroupIds);
    const normalizedCatalogDefaultPriceGroupId =
      canonicalizePriceGroupId(catalogDefaultPriceGroupId);
    if (!name) {
      toast('Catalog name is required.', { variant: 'error' });
      return;
    }
    if (selectedLanguageIds.length === 0) {
      toast('Select at least one language.', { variant: 'error' });
      return;
    }
    if (!defaultLanguageId || !selectedLanguageIds.includes(defaultLanguageId)) {
      toast('Select a default language.', { variant: 'error' });
      return;
    }
    if (normalizedCatalogPriceGroupIds.length === 0) {
      toast('Select at least one price group.', { variant: 'error' });
      return;
    }
    if (
      !normalizedCatalogDefaultPriceGroupId ||
      !normalizedCatalogPriceGroupIds.includes(normalizedCatalogDefaultPriceGroupId)
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
          priceGroupIds: normalizedCatalogPriceGroupIds,
          defaultPriceGroupId: normalizedCatalogDefaultPriceGroupId,
          isDefault: form.isDefault,
        },
      });

      toast('Catalog saved.', { variant: 'success' });
    } catch (err) {
      logClientCatch(err, { source: 'CatalogModal', action: 'saveCatalog', catalogId: catalog?.id });
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
