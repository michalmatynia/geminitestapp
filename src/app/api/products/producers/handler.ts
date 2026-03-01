import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProducerRepository } from '@/features/products/server';
import { createProducerSchema } from '@/shared/contracts/products';
export { createProducerSchema as producerCreateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError } from '@/shared/errors/app-error';

/**
 * GET /api/products/producers
 * Fetches all producers (flat list).
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getProducerRepository();
  const producers = await repository.listProducers({});

  return NextResponse.json(producers);
}

/**
 * POST /api/products/producers
 * Creates a new producer.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof createProducerSchema>;
  const { name } = data;
  const trimmedName = name.trim();

  const repository = await getProducerRepository();
  const existing = await repository.findByName(trimmedName);

  if (existing) {
    throw conflictError('A producer with this name already exists', {
      name: trimmedName,
      producerId: existing.id,
    });
  }

  const created = await repository.createProducer({
    name: trimmedName,
    website: data.website ?? null,
  });

  return NextResponse.json(created, { status: 201 });
}
