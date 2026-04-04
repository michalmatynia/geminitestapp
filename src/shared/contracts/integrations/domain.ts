import { z } from 'zod';

import { namedDtoSchema } from '@/shared/contracts/base';

import { productListingSchema } from './listings';

export const integrationConnectionBasicSchema = z.object({
  id: z.string(),
  name: z.string(),
  integrationId: z.string(),
  traderaBrowserMode: z.enum(['builtin', 'scripted']).nullable().optional(),
  hasPlaywrightListingScript: z.boolean().optional(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().nullable().optional(),
  traderaAutoRelistEnabled: z.boolean().nullable().optional(),
  traderaAutoRelistLeadMinutes: z.number().nullable().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiSandbox: z.boolean().nullable().optional(),
});

export type IntegrationConnectionBasic = z.infer<typeof integrationConnectionBasicSchema>;

export const integrationWithConnectionsSchema = namedDtoSchema.extend({
  slug: z.string(),
  connections: z.array(integrationConnectionBasicSchema),
});

export type IntegrationWithConnections = z.infer<typeof integrationWithConnectionsSchema>;

export const listingJobSchema = productListingSchema.extend({
  integrationName: z.string(),
  integrationSlug: z.string(),
  connectionName: z.string(),
});

export type ListingJob = z.infer<typeof listingJobSchema>;

export const productJobSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  listings: z.array(listingJobSchema),
});

export type ProductJob = z.infer<typeof productJobSchema>;

export type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
};

export const exportJobDetailSchema = z.object({
  job: productJobSchema,
  listing: listingJobSchema,
});

export type ExportJobDetail = z.infer<typeof exportJobDetailSchema>;

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
  { name: 'LinkedIn', slug: 'linkedin' },
  { name: 'Playwright (Programmable)', slug: 'playwright-programmable' },
] as const;
