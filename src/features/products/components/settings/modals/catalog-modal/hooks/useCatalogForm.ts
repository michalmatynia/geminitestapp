'use client';

import React from 'react';

import { useSaveCatalogMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { useToast } from '@/shared/ui/toast';

import { useCatalogFormStateSync } from './useCatalogFormStateSync';
import { EMPTY_CATALOG_FORM } from './useCatalogForm.types';
import type { UseCatalogFormProps, UseCatalogFormReturn } from './useCatalogForm.types';
import { useCatalogLanguageLookup } from './useCatalogLanguageLookup';
import { useCatalogPriceGroups } from './useCatalogPriceGroups';
import { useCatalogSubmit } from './useCatalogSubmit';

export function useCatalogForm({
  catalog,
  languages,
  priceGroups,
  defaultGroupId,
}: UseCatalogFormProps): UseCatalogFormReturn {
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_CATALOG_FORM);
  const [selectedLanguageIds, setSelectedLanguageIds] = React.useState<string[]>([]);
  const [defaultLanguageId, setDefaultLanguageId] = React.useState('');
  const [catalogPriceGroupIds, setCatalogPriceGroupIds] = React.useState<string[]>([]);
  const [catalogDefaultPriceGroupId, setCatalogDefaultPriceGroupId] = React.useState('');
  const [languageQuery, setLanguageQuery] = React.useState('');
  const { toast } = useToast();
  const saveMutation = useSaveCatalogMutation();
  const languageLookup = useCatalogLanguageLookup(languages);
  const priceGroupLookup = useCatalogPriceGroups(priceGroups);
  useCatalogFormStateSync({
    catalog,
    defaultGroupId,
    ...languageLookup,
    ...priceGroupLookup,
    setForm,
    setSelectedLanguageIds,
    setDefaultLanguageId,
    setCatalogPriceGroupIds,
    setCatalogDefaultPriceGroupId,
    setError,
    setLanguageQuery,
  });
  const handleSubmit = useCatalogSubmit({
    catalog,
    form,
    selectedLanguageIds,
    defaultLanguageId,
    catalogPriceGroupIds,
    catalogDefaultPriceGroupId,
    saveMutation,
    ...priceGroupLookup,
    setError,
    toast,
  });
  return { form, setForm, selectedLanguageIds, setSelectedLanguageIds, defaultLanguageId,
    setDefaultLanguageId, catalogPriceGroupIds, setCatalogPriceGroupIds,
    catalogDefaultPriceGroupId, setCatalogDefaultPriceGroupId, languageQuery, setLanguageQuery,
    error, setError, ...languageLookup, saveMutation, handleSubmit };
}
