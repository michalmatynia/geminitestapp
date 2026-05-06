import { z } from 'zod';

export const AiNodeSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().default(''),
  description: z.string().default(''),
  type: z.string(), // We'll validate this later against known types
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ x: 0, y: 0 }),
});

export type AiNode = z.infer<typeof AiNodeSchema>;
