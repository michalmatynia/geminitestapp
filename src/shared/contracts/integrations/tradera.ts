import { z } from 'zod';

import { playwrightRelistBrowserModeSchema } from './listings';

export const traderaApiCredentialsSchema = z.object({
  appId: z.number(),
  appKey: z.string(),
  userId: z.number(),
  token: z.string(),
  sandbox: z.boolean().optional(),
  maxResultAgeSeconds: z.number().optional(),
});

export type TraderaApiCredentials = z.infer<typeof traderaApiCredentialsSchema>;

export const traderaApiUserInfoSchema = z.object({
  userId: z.number(),
  alias: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export type TraderaApiUserInfo = z.infer<typeof traderaApiUserInfoSchema>;

export const traderaAddShopItemInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  categoryId: z.number(),
  price: z.number(),
  quantity: z.number(),
  shippingCondition: z.string(),
  paymentCondition: z.string(),
  acceptedBuyerId: z.number().optional(),
});

export type TraderaAddShopItemInput = z.infer<typeof traderaAddShopItemInputSchema>;

export const traderaAddShopItemResultSchema = z.object({
  itemId: z.number(),
  requestId: z.number().nullable(),
  resultCode: z.string().nullable(),
  resultMessage: z.string().nullable(),
});

export type TraderaAddShopItemResult = z.infer<typeof traderaAddShopItemResultSchema>;

export const traderaSystemSettingsSchema = z.object({
  defaultDurationHours: z.number(),
  autoRelistEnabled: z.boolean(),
  autoRelistLeadMinutes: z.number(),
  schedulerEnabled: z.boolean(),
  schedulerIntervalMs: z.number(),
  allowSimulatedSuccess: z.boolean(),
  listingFormUrl: z.string(),
  selectorProfile: z.string(),
});

export type TraderaSystemSettings = z.infer<typeof traderaSystemSettingsSchema>;

export const traderaListingJobInputSchema = z.object({
  listingId: z.string(),
  action: z.enum(['list', 'relist', 'sync', 'check_status']),
  source: z.enum(['manual', 'scheduler', 'api']).optional(),
  jobId: z.string().optional(),
  browserMode: playwrightRelistBrowserModeSchema.optional(),
  selectorProfile: z.string().trim().min(1).optional(),
  syncSkipImages: z.boolean().optional(),
});

export type TraderaListingJobInput = z.infer<typeof traderaListingJobInputSchema>;

export const playwrightListingJobInputSchema = z.object({
  listingId: z.string(),
  action: z.enum(['list', 'relist']),
  source: z.enum(['manual', 'scheduler', 'api']).optional(),
  jobId: z.string().optional(),
  browserMode: playwrightRelistBrowserModeSchema.optional(),
});

export type PlaywrightListingJobInput = z.infer<typeof playwrightListingJobInputSchema>;

export const traderaCategoryRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string(),
});

export type TraderaCategoryRecord = z.infer<typeof traderaCategoryRecordSchema>;
