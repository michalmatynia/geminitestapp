import { z } from 'zod';
export const productDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type ProductDbProviderDto = z.infer<typeof productDbProviderSchema>;
export type ProductDbProvider = ProductDbProviderDto;

export const integrationDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type IntegrationDbProviderDto = z.infer<typeof integrationDbProviderSchema>;
export type IntegrationDbProvider = IntegrationDbProviderDto;

export const productMigrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type ProductMigrationDirectionDto = z.infer<typeof productMigrationDirectionSchema>;
export type ProductMigrationDirection = ProductMigrationDirectionDto;

export const syncDirectionSchema = z.enum(['to_base', 'from_base', 'bidirectional']);
export type SyncDirectionDto = z.infer<typeof syncDirectionSchema>;
export type SyncDirection = SyncDirectionDto;

export const priceGroupTypeSchema = z.enum(['standard', 'dependent']);
export type PriceGroupTypeDto = z.infer<typeof priceGroupTypeSchema>;
export type PriceGroupType = PriceGroupTypeDto;

export const productMigrationBatchResultSchema = z.object({
  direction: productMigrationDirectionSchema,
  productsProcessed: z.number(),
  productsUpserted: z.number(),
  nextCursor: z.string().nullable(),
  missingImageFileIds: z.array(z.string()),
  missingCatalogIds: z.array(z.string()),
});

export type ProductMigrationBatchResultDto = z.infer<typeof productMigrationBatchResultSchema>;
export type ProductMigrationBatchResult = ProductMigrationBatchResultDto;
