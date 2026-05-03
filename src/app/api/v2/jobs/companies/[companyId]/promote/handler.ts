import { type NextRequest, NextResponse } from 'next/server';

import { promoteCompanyToOrganisation } from '@/features/job-board/server/organisation-promotion';
import {
  promoteCompanyRequestSchema,
  promoteCompanyResponseSchema,
  type PromoteCompanyRequest,
} from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { promoteCompanyRequestSchema };

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as PromoteCompanyRequest;
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const promoteIndex = segments.lastIndexOf('promote');
  const companyId = promoteIndex > 0 ? segments[promoteIndex - 1] : undefined;
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required in URL.' }, { status: 400 });
  }

  try {
    const result = await promoteCompanyToOrganisation({
      companyId,
      organizationId: body.organizationId,
      addresses: body.addresses ?? null,
      updatedBy: ctx.userId ?? null,
    });
    return NextResponse.json(promoteCompanyResponseSchema.parse(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
