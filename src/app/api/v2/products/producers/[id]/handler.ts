import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProducerRepository } from '@/features/products/server';
import { updateProducerSchema } from '@/shared/contracts/products/producers';
export { updateProducerSchema as producerUpdateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Producer id is required'),
});

const parseProducerId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = parseProducerId(params);
  const data = ctx.body as z.infer<typeof updateProducerSchema>;
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

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getProducerRepository();
  const id = parseProducerId(params);
  await repository.deleteProducer(id);
  return new Response(null, { status: 204 });
}
