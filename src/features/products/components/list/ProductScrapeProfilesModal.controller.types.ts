import type { UseQueryResult } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';

import type { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfilesListResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';

import type { ProductScrapeProfileStoredSettings } from './ProductScrapeProfilesModal.storage';
import type { ProductScrapeProfileRuntimeActionSetting } from './useProductScrapeProfileRuntimeActionSetting';

export type ProductScrapeProfilesController = {
  dryRun: boolean;
  error: Error | null;
  isBusy: boolean;
  isLoading: boolean;
  isDraftTemplatesLoading: boolean;
  canRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfilesListResponse['profiles'];
  queuedRun: ProductScrapeProfileRunQueuedResponse | null;
  result: ProductScrapeProfileRunResponse | null;
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
  onImageImportModeChange: (mode: ProductScrapeProfileImageImportMode) => void;
  onSourcePriceCurrencyCodeChange: (code: ProductScrapeSourcePriceCurrencyCode) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
  onRun: () => void;
};

export type ProductScrapeProfileQueries = {
  draftsQuery: ReturnType<typeof useDraftQueries>;
  profiles: ProductScrapeProfilesListResponse['profiles'];
  profilesQuery: UseQueryResult<ProductScrapeProfilesListResponse, Error>;
  selectedProfile: ProductScrapeProfile | null;
  draftTemplates: ProductDraft[];
};

export type StoredSettingsState = {
  initialProfileId: string;
  initialDraftTemplateId: string;
  initialDryRun: boolean;
  initialImageImportMode: ProductScrapeProfileImageImportMode;
  initialSourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  initialLimitInput: string;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
  updateStoredSettings: (settings: ProductScrapeProfileStoredSettings) => void;
};

export type ProductScrapeProfileFormState = {
  draftTemplateId: string;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitInput: string;
  profileId: string;
  settingsProfileId: string;
  setDraftTemplateId: (value: string) => void;
  setDryRun: (value: boolean) => void;
  setImageImportMode: (value: ProductScrapeProfileImageImportMode) => void;
  setSourcePriceCurrencyCode: (value: ProductScrapeSourcePriceCurrencyCode) => void;
  setLimitInput: (value: string) => void;
  setProfileId: (value: string) => void;
  setSettingsProfileId: (value: string) => void;
};
