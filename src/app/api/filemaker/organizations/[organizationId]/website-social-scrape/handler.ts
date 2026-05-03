import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { runFilemakerOrganizationPresenceScrape } from '@/features/filemaker/server/filemaker-organization-presence-scrape';

const websiteSocialScrapeRequestSchema = z.object({
  maxPages: z.number().int().positive().max(12).optional(),
  maxSearchResults: z.number().int().positive().max(16).optional(),
});

const resolveOrganizationId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['organizationId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

const readOptionalJsonBody = async (req: NextRequest): Promise<unknown> => {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return {};
  try {
    const bodyText = await req.text();
    if (bodyText.trim().length === 0) return {};
    return JSON.parse(bodyText) as unknown;
  } catch (error) {
    throw badRequestError('Invalid website/social scrape request JSON.').withCause(error);
  }
};

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const parsed = websiteSocialScrapeRequestSchema.safeParse(await readOptionalJsonBody(req));
  if (!parsed.success) {
    throw badRequestError('Invalid website/social scrape request.', {
      issues: parsed.error.issues,
    });
  }

  const result = await runFilemakerOrganizationPresenceScrape({
    organizationId: resolveOrganizationId(ctx),
    maxPages: parsed.data.maxPages,
    maxSearchResults: parsed.data.maxSearchResults,
  });
  return Response.json(result);
}
