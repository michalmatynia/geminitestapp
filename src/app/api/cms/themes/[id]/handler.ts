import { type NextRequest, NextResponse } from 'next/server';

import { getCmsRepository } from '@/features/cms/server';
import { cmsThemeUpdateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { UpdateCmsThemeDto } from '@/shared/contracts/cms';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

/**
 * CMS Theme Detail API Handlers
 *
 * HTTP request handlers for individual CMS theme operations.
 * Handlers: getHandler, putHandler, deleteHandler
 *
 * - Retrieves, updates, and deletes CMS themes
 * - Manages theme styling and configuration
 * - Handles theme application and inheritance
 */

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.getThemeById(id);

  if (!theme) {
    throw notFoundError('Theme not found');
  }

  return NextResponse.json(theme);
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;

  const parsed = await parseJsonBody(req, cmsThemeUpdateSchema, {
    logPrefix: 'cms-themes',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const cmsRepository = await getCmsRepository();
  const input: Partial<UpdateCmsThemeDto> = {
    ...parsed.data,
    customCss: parsed.data.customCss ?? undefined,
  };
  const updated = await cmsRepository.updateTheme(id, input);

  if (!updated) {
    throw notFoundError('Theme not found');
  }

  void logCmsActivity({
    event: 'THEME_UPDATED',
    description: `Updated CMS theme: ${updated.name}`,
    userId: ctx.userId ?? null,
    entityId: id,
    entityType: 'cms_theme',
    metadata: { name: updated.name },
  }).catch(() => {});
  return NextResponse.json(updated);
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function deleteHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const cmsRepository = await getCmsRepository();
  const theme = await cmsRepository.deleteTheme(id);
  if (theme) {
    void logCmsActivity({
      event: 'THEME_DELETED',
      description: `Deleted CMS theme: ${theme.name}`,
      userId: ctx.userId ?? null,
      entityId: id,
      entityType: 'cms_theme',
      metadata: { name: theme.name },
    }).catch(() => {});
  }
  return new Response(null, { status: 204 });
}
