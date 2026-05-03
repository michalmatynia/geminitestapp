import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerPersonById,
  requireFilemakerMailAdminSession,
  upsertMongoFilemakerEmailsForPerson,
} from '@/features/filemaker/server';
import { extractFilemakerEmailsFromText } from '@/features/filemaker/filemaker-settings.validation';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const emailParserRuleSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  flags: z.string().nullable().optional(),
  sequence: z.number().nullable().optional(),
});

const personEmailExtractRequestSchema = z.object({
  parserRules: z.array(emailParserRuleSchema).nullable().optional(),
  text: z.string(),
});

const resolvePersonId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['personId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof personEmailExtractRequestSchema>> =
    await parseJsonBody(req, personEmailExtractRequestSchema, {
      logPrefix: 'filemaker.persons.[personId].emails.POST',
    });
  if (!result.ok) {
    return result.response;
  }

  const person = await getMongoFilemakerPersonById(resolvePersonId(ctx));
  if (!person) {
    throw notFoundError('Filemaker person was not found.');
  }

  const extraction = extractFilemakerEmailsFromText(result.data.text, {
    parserRules: result.data.parserRules ?? undefined,
  });
  const upsert = await upsertMongoFilemakerEmailsForPerson(person, extraction.emails);

  return Response.json({
    ...extraction,
    ...upsert,
  });
}
