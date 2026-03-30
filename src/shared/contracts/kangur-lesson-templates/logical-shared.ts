import { z } from 'zod';

export const kangurLogicalTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

export const kangurLogicalTitleLeadCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240),
});

export const kangurLogicalTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

export const kangurLogicalTitleLeadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
});
