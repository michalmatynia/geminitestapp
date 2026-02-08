export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProducerRepository } from '@/features/products/server';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const producerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().trim().nullable().optional(),
});

async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string },
): Promise<Response> {
  const id = params.id;
  const data = ctx.body as z.infer<typeof producerUpdateSchema>;
  const name = typeof data.name === 'string' ? data.name.trim() : undefined;

  const repository = await getProducerRepository();
  const current = await repository.getProducerById(id);
  
  if (!current) {
    throw notFoundError('Producer not found', { producerId: id });
  }

  if (name) {
    const existing = await repository.findByName(name);
    if (existing && existing.id !== id) {
      throw conflictError('A producer with this name already exists', {
        name,
        producerId: existing.id,
      });
    }
  }

  const updated = await repository.updateProducer(id, {
    ...(name !== undefined && { name }),
    ...(data.website !== undefined && { website: data.website }),
  });
  
  return NextResponse.json(updated);
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string },
): Promise<Response> {
  const repository = await getProducerRepository();
  await repository.deleteProducer(params.id);
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.producers.[id].PUT',
  parseJsonBody: true,
  bodySchema: producerUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.producers.[id].DELETE',
});
