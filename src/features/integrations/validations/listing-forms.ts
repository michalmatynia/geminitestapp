import { z } from 'zod';

const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const optionalId = z.string().trim().optional().nullable();

export const listProductFormSchema = z
  .object({
    selectedIntegrationId: optionalId,
    selectedConnectionId: optionalId,
    isBaseComIntegration: z.boolean(),
    selectedInventoryId: optionalId,
  })
  .superRefine((data, ctx) => {
    if (!hasText(data.selectedIntegrationId) || !hasText(data.selectedConnectionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedConnectionId'],
        message: 'Please select both a marketplace and an account',
      });
    }

    if (data.isBaseComIntegration && !hasText(data.selectedInventoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedInventoryId'],
        message: 'Please select a Base.com inventory',
      });
    }
  });

export const selectProductForListingFormSchema = z
  .object({
    selectedProductId: optionalId,
    selectedIntegrationId: optionalId,
    selectedConnectionId: optionalId,
    isBaseComIntegration: z.boolean(),
    selectedInventoryId: optionalId,
  })
  .superRefine((data, ctx) => {
    if (!hasText(data.selectedProductId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedProductId'],
        message: 'Please select a product',
      });
    }

    if (!hasText(data.selectedIntegrationId) || !hasText(data.selectedConnectionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedConnectionId'],
        message: 'Please select both a marketplace and an account',
      });
    }

    if (data.isBaseComIntegration && !hasText(data.selectedInventoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedInventoryId'],
        message: 'Please select a Base.com inventory',
      });
    }
  });

export const massListProductFormSchema = z
  .object({
    isBaseComIntegration: z.boolean(),
    selectedInventoryId: optionalId,
  })
  .superRefine((data, ctx) => {
    if (data.isBaseComIntegration && !hasText(data.selectedInventoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedInventoryId'],
        message: 'Please select a Base.com inventory',
      });
    }
  });
