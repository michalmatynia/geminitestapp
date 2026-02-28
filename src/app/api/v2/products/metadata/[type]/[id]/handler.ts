import { NextRequest, NextResponse } from 'next/server';
import { 
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
} from '@/features/products/server';
import { deleteSimpleParameter } from '@/shared/lib/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

export async function GET_products_metadata_id_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string, id: string }
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
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  const data = await req.json();

  if (type === 'producers') {
    const repo = await getProducerRepository();
    return NextResponse.json(await repo.updateProducer(id, data));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    return NextResponse.json(await repo.updateTag(id, data));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    return NextResponse.json(await repo.updateParameter(id, data));
  }
  if (type === 'price-groups') {
    const item = await prisma.priceGroup.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  }
  
  throw badRequestError(`Invalid products metadata type for PUT: ${type}`);
}

export async function DELETE_products_metadata_id_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string, id: string }
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
