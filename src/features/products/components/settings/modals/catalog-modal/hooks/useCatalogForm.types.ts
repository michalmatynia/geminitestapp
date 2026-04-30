import type { Dispatch, SetStateAction } from 'react';

import type { useSaveCatalogMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Language } from '@/shared/contracts/internationalization';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';

export interface CatalogFormState {
  name: string;
  description: string;
  isDefault: boolean;
}

export interface UseCatalogFormProps {
  catalog?: Catalog | null | undefined;
  languages: Language[];
  priceGroups: PriceGroup[];
  defaultGroupId: string;
}

export interface UseCatalogFormReturn {
  form: CatalogFormState;
  setForm: Dispatch<SetStateAction<CatalogFormState>>;
  selectedLanguageIds: string[];
  setSelectedLanguageIds: Dispatch<SetStateAction<string[]>>;
  defaultLanguageId: string;
  setDefaultLanguageId: Dispatch<SetStateAction<string>>;
  catalogPriceGroupIds: string[];
  setCatalogPriceGroupIds: Dispatch<SetStateAction<string[]>>;
  catalogDefaultPriceGroupId: string;
  setCatalogDefaultPriceGroupId: Dispatch<SetStateAction<string>>;
  languageQuery: string;
  setLanguageQuery: Dispatch<SetStateAction<string>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  languageIdByAnyValue: Map<string, string>;
  canonicalizeLanguageId: (value: string) => string;
  getLanguage: (value: string) => Language | undefined;
  saveMutation: ReturnType<typeof useSaveCatalogMutation>;
  handleSubmit: () => Promise<void>;
}

export const EMPTY_CATALOG_FORM: CatalogFormState = {
  name: '',
  description: '',
  isDefault: false,
};
