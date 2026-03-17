import { z } from 'zod';

export const imageStudioWhitespaceMetricsSchema = z.object({
  px: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
  percent: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
});

export type ImageStudioWhitespaceMetrics = z.infer<typeof imageStudioWhitespaceMetricsSchema>;
