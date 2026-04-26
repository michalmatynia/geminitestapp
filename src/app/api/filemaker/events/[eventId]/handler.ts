import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerEventById,
  listMongoFilemakerAddressesForOwner,
  listMongoFilemakerWebsitesForEvent,
  requireFilemakerMailAdminSession,
  updateMongoFilemakerEvent,
} from '@/features/filemaker/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const eventPatchSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  countryId: z.string().optional(),
  eventName: z.string().optional(),
  postalCode: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
});

const resolveEventId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['eventId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const event = await getMongoFilemakerEventById(resolveEventId(ctx));
  if (!event) {
    throw notFoundError('Filemaker event was not found.');
  }
  const [linkedAddresses, linkedWebsites] = await Promise.all([
    listMongoFilemakerAddressesForOwner('event', event.id),
    listMongoFilemakerWebsitesForEvent(event),
  ]);
  return Response.json({ event, linkedAddresses, linkedWebsites });
}

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof eventPatchSchema>> = await parseJsonBody(
    req,
    eventPatchSchema,
    { logPrefix: 'filemaker.events.PATCH' }
  );
  if (!result.ok) {
    return result.response;
  }
  const event = await updateMongoFilemakerEvent(resolveEventId(ctx), result.data);
  return Response.json({ event });
}
