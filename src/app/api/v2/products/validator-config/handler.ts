import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { listValidationPatternsCached } from '@/shared/lib/products/services/validation-pattern-runtime-cache';

export const querySchema = z.object({
  includeDisabled: optionalBooleanQuerySchema().default(false),
});

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const includeDisabled = query.includeDisabled;
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
