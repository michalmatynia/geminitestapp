import type { UseQueryResult } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';

import type { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
} from '@/shared/contracts/products/scrape-profiles';

import type { ProductScrapeProfileStoredSettings } from './ProductScrapeProfilesModal.storage';

export type ProductScrapeProfilesController = {
  dryRun: boolean;
  error: Error | null;
  isBusy: boolean;
  isLoading: boolean;
  isDraftTemplatesLoading: boolean;
  canRun: boolean;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfilesListResponse['profiles'];
  result: ProductScrapeProfileRunResponse | null;
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
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
  initialLimitInput: string;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
  updateStoredSettings: (settings: ProductScrapeProfileStoredSettings) => void;
};
