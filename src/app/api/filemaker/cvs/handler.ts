import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createMongoFilemakerCv,
  getMongoFilemakerPersonById,
  listMongoFilemakerCvsForPerson,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import { resolveFilemakerCvPersonName } from '@/features/filemaker/cv-defaults';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const cvCreateSchema = z.object({
  bodyBlocks: z.unknown().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  personId: z.string().min(1),
  title: z.string().nullable().optional(),
});

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const personId = url.searchParams.get('personId')?.trim() ?? '';
  if (personId.length === 0) {
    throw badRequestError('personId is required.');
  }
  const cvs = await listMongoFilemakerCvsForPerson(personId);
  return Response.json({ cvs });
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof cvCreateSchema>> = await parseJsonBody(
    req,
    cvCreateSchema,
    { logPrefix: 'filemaker.cvs.POST' }
  );
  if (!result.ok) return result.response;

  const person = await getMongoFilemakerPersonById(result.data.personId);
  if (!person) {
    throw notFoundError('Filemaker person was not found.');
  }

  const cv = await createMongoFilemakerCv({
    bodyBlocks: result.data.bodyBlocks,
    bodyHtml: result.data.bodyHtml,
    bodyText: result.data.bodyText,
    personId: person.id,
    personName: resolveFilemakerCvPersonName(person),
    title: result.data.title,
  });
  return Response.json({ cv }, { status: 201 });
}
