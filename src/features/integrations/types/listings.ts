import type { 
  ProductListingDto, 
  ProductListingWithDetailsDto,
  ProductListingExportEventDto,
  ProductListingRelistPolicyDto,
  ListingJobDto,
  ProductJobDto,
  ExportJobDetailDto
} from '@/shared/contracts/integrations';

export type ProductListing = ProductListingDto;
export type ProductListingWithDetails = ProductListingWithDetailsDto;
export type ListingAttempt = ProductListingExportEventDto;
export type ListingJob = ListingJobDto;
export type ProductJob = ProductJobDto;
export type ExportJobDetail = ExportJobDetailDto;
export type ProductListingRelistPolicy = ProductListingRelistPolicyDto;
