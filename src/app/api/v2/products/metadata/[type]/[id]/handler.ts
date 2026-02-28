import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
  type ProductTagUpdateInputDto,
  type ProductParameterUpdateInput,
} from '@/features/products/server';
import { deleteSimpleParameter } from '@/shared/lib/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

export async function GET_products_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    const item = await repo.getProducerById(id);
    if (!item) throw notFoundError(`Producer not found: ${id}`);
    return NextResponse.json(item);
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    const item = await repo.getTagById(id);
    if (!item) throw notFoundError(`Tag not found: ${id}`);
    return NextResponse.json(item);
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    const item = await repo.getParameterById(id);
    if (!item) throw notFoundError(`Parameter not found: ${id}`);
    return NextResponse.json(item);
  }

  throw badRequestError(`Invalid products metadata type for GET: ${type}`);
}

export async function PUT_products_metadata_id_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const data = (await req.json()) as Record<string, unknown>;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    const updateData = data as { name?: string; website?: string | null };
    return NextResponse.json(await repo.updateProducer(id, updateData));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    const updateData = data as ProductTagUpdateInputDto;
    return NextResponse.json(await repo.updateTag(id, updateData));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    const updateData = data as ProductParameterUpdateInput;
    return NextResponse.json(await repo.updateParameter(id, updateData));
  }
  if (type === 'price-groups') {
    const item = await prisma.priceGroup.update({
      where: { id },
      data: data as Prisma.PriceGroupUpdateInput,
    });
    return NextResponse.json(item);
  }

  throw badRequestError(`Invalid products metadata type for PUT: ${type}`);
}

export async function DELETE_products_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    await repo.deleteProducer(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    await repo.deleteTag(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    await repo.deleteParameter(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'price-groups') {
    await prisma.priceGroup.delete({ where: { id } });
    return new Response(null, { status: 204 });
  }
  if (type === 'simple-parameters') {
    await deleteSimpleParameter(id);
    return new Response(null, { status: 204 });
  }

  throw badRequestError(`Invalid products metadata type for DELETE: ${type}`);
}
