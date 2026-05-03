import React, { type Dispatch, type SetStateAction } from 'react';

import type { useSaveCatalogMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { CatalogFormState } from './useCatalogForm.types';

type CatalogSubmitArgs = {
  catalog: Catalog | null | undefined;
  form: CatalogFormState;
  selectedLanguageIds: string[];
  defaultLanguageId: string;
  catalogPriceGroupIds: string[];
  catalogDefaultPriceGroupId: string;
  saveMutation: ReturnType<typeof useSaveCatalogMutation>;
  normalizePriceGroupIds: (values: string[]) => string[];
  canonicalizePriceGroupId: (value: string) => string;
  setError: Dispatch<SetStateAction<string | null>>;
  toast: Toast;
};

type CatalogPayloadResult =
  | {
      status: 'ready';
      data: Partial<Catalog>;
    }
  | {
      status: 'error';
      message: string;
    };

const buildCatalogPayload = ({
  form,
  selectedLanguageIds,
  defaultLanguageId,
  catalogPriceGroupIds,
  catalogDefaultPriceGroupId,
  normalizePriceGroupIds,
  canonicalizePriceGroupId,
}: Pick<
  CatalogSubmitArgs,
  | 'form'
  | 'selectedLanguageIds'
  | 'defaultLanguageId'
  | 'catalogPriceGroupIds'
  | 'catalogDefaultPriceGroupId'
  | 'normalizePriceGroupIds'
  | 'canonicalizePriceGroupId'
>): CatalogPayloadResult => {
  const name = form.name.trim();
  const priceGroupIds = normalizePriceGroupIds(catalogPriceGroupIds);
  const defaultPriceGroupId = canonicalizePriceGroupId(catalogDefaultPriceGroupId);

  if (name.length === 0) return { status: 'error', message: 'Catalog name is required.' };
  if (selectedLanguageIds.length === 0) {
    return { status: 'error', message: 'Select at least one language.' };
  }
  if (defaultLanguageId.length === 0 || !selectedLanguageIds.includes(defaultLanguageId)) {
    return { status: 'error', message: 'Select a default language.' };
  }
  if (priceGroupIds.length === 0) {
    return { status: 'error', message: 'Select at least one price group.' };
  }
  if (defaultPriceGroupId.length === 0 || !priceGroupIds.includes(defaultPriceGroupId)) {
    return { status: 'error', message: 'Select a default price group.' };
  }

  return {
    status: 'ready',
    data: {
      name,
      description: form.description.trim(),
      languageIds: selectedLanguageIds,
      defaultLanguageId,
      priceGroupIds,
      defaultPriceGroupId,
      isDefault: form.isDefault,
    },
  };
};

export function useCatalogSubmit(args: CatalogSubmitArgs): () => Promise<void> {
  return React.useCallback(async (): Promise<void> => {
    if (args.saveMutation.isPending) return;

    const result = buildCatalogPayload(args);
    if (result.status === 'error') {
      args.toast(result.message, { variant: 'error' });
      return;
    }

    try {
      await args.saveMutation.mutateAsync({
        id: args.catalog?.id,
        data: result.data,
      });
      args.toast('Catalog saved.', { variant: 'success' });
    } catch (err) {
      logClientCatch(err, {
        source: 'CatalogModal',
        action: 'saveCatalog',
        catalogId: args.catalog?.id,
      });
      args.setError(err instanceof Error ? err.message : 'Failed to save catalog.');
    }
  }, [args]);
}
