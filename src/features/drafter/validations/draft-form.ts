import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const draftSubmitSchema = z
  .object({
    name: z.string().trim().min(1, 'Draft name is required'),
    iconColorMode: z.enum(['theme', 'custom']),
    iconColor: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.iconColorMode !== 'custom') return;

    const normalized = data.iconColor?.trim() || '';
    if (!HEX_COLOR_PATTERN.test(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['iconColor'],
        message: 'Custom icon color must be a valid hex value (e.g. #60a5fa).',
      });
    }
  });
