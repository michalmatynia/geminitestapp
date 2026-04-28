import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { runFilemakerOrganizationEmailScrape } from '@/features/filemaker/server/filemaker-organization-email-scrape';

const emailScrapeRequestSchema = z.object({
  maxPages: z.number().int().positive().max(12).optional(),
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
    return await req.json();
  } catch {
    return {};
  }
};

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const parsed = emailScrapeRequestSchema.safeParse(await readOptionalJsonBody(req));
  if (!parsed.success) {
    throw badRequestError('Invalid email scrape request.', {
      issues: parsed.error.issues,
    });
  }

  const result = await runFilemakerOrganizationEmailScrape({
    organizationId: resolveOrganizationId(ctx),
    maxPages: parsed.data.maxPages,
  });
  return Response.json(result);
}
