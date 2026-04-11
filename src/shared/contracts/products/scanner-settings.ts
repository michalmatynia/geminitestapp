import { z } from 'zod';

import { playwrightSettingsSchema } from '../playwright';

export const productScannerPlaywrightBrowserSchema = z.enum([
  'auto',
  'brave',
  'chrome',
  'chromium',
]);

export type ProductScannerPlaywrightBrowser = z.infer<
  typeof productScannerPlaywrightBrowserSchema
>;

export const productScannerSettingsSchema = z.object({
  playwrightPersonaId: z.string().trim().min(1).max(200).nullable(),
  playwrightBrowser: productScannerPlaywrightBrowserSchema,
  playwrightSettingsOverrides: playwrightSettingsSchema.partial(),
});

export type ProductScannerSettings = z.infer<typeof productScannerSettingsSchema>;
