import type { ListingJob, ProductJob } from '@/shared/contracts/integrations';
import type { JobRowData } from '@/shared/contracts/jobs';

export type { JobRowData, ListingJob, ProductJob };

export type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
};
