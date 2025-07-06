import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  price: z.number().int().positive({ message: 'Price must be a positive integer' }),
  sku: z.string().min(1, { message: 'SKU is required' }),
  description: z.string().optional(),
});