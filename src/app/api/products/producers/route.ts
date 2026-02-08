export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProducerRepository } from '@/features/products/server';
import { conflictError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const producerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().trim().nullable().optional(),
});

/**
 * GET /api/products/producers
 * Fetches all producers (flat list).
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getProducerRepository();
  const producers = await repository.listProducers({});
  
  return NextResponse.json(producers);
}

/**
 * POST /api/products/producers
 * Creates a new producer.
 */
async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof producerCreateSchema>;
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.producers.GET' },
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.producers.POST', parseJsonBody: true, bodySchema: producerCreateSchema },
);

