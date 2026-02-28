import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { listValidationPatternsCached } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const includeDisabled = req.nextUrl.searchParams.get('includeDisabled') === 'true';
  const repository = await getValidationPatternRepository();
  const [enabledByDefault, formatterEnabledByDefault, instanceDenyBehavior, patterns] =
    await Promise.all([
      repository.getEnabledByDefault(),
      repository.getFormatterEnabledByDefault(),
      repository.getInstanceDenyBehavior(),
      listValidationPatternsCached(),
    ]);

  return NextResponse.json({
    enabledByDefault,
    formatterEnabledByDefault,
    instanceDenyBehavior,
    patterns: includeDisabled ? patterns : patterns.filter((pattern) => pattern.enabled),
  });
}
