import { z } from 'zod';
export const productDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type ProductDbProvider = z.infer<typeof productDbProviderSchema>;

export const integrationDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type IntegrationDbProvider = z.infer<typeof integrationDbProviderSchema>;

export const productMigrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type ProductMigrationDirection = z.infer<typeof productMigrationDirectionSchema>;

export const syncDirectionSchema = z.enum(['to_base', 'from_base', 'bidirectional']);
export type SyncDirection = z.infer<typeof syncDirectionSchema>;

export const priceGroupTypeSchema = z.enum(['standard', 'dependent']);
export type PriceGroupType = z.infer<typeof priceGroupTypeSchema>;

export const productMigrationBatchResultSchema = z.object({
  direction: productMigrationDirectionSchema,
  productsProcessed: z.number(),
  productsUpserted: z.number(),
  nextCursor: z.string().nullable(),
  missingImageFileIds: z.array(z.string()),
  missingCatalogIds: z.array(z.string()),
});

export type ProductMigrationBatchResult = z.infer<typeof productMigrationBatchResultSchema>;
