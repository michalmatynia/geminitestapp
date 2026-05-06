/**
 * Job System Types
 * 
 * Type definitions for the background job processing system.
 * Provides:
 * - Job data structures and contracts
 * - Listing and product job type definitions
 * - Job row data interfaces
 * - Integration job type exports
 * - Type-safe job handling across the application
 */

import type { ListingJob, ProductJob, ListingRow } from '@/shared/contracts/integrations/domain';
import type { JobRowData } from '@/shared/contracts/jobs';

export type { JobRowData, ListingJob, ProductJob, ListingRow };
