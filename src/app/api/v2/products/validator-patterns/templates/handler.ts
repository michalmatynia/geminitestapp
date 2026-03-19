import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { getValidatorTemplatePresetByType } from '@/features/products/lib/validatorSemanticPresets';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_validator_template_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const preset = getValidatorTemplatePresetByType(params.type);
  if (!preset) {
    throw badRequestError(`Invalid validator template type: ${params.type}`);
  }

  const repo = await getValidationPatternRepository();
  const existingPatterns = await repo.listPatterns();
  const outcomes: Array<{
    action: 'created' | 'updated';
    target: string;
    patternId: string;
    label: string;
  }> = [];

  for (const templatePattern of preset.patterns) {
    const payload = templatePattern.buildPayload();
    const existingPattern = existingPatterns.find((pattern) =>
      templatePattern.matchesExisting(pattern)
    );
    const persistedPattern = existingPattern
      ? await repo.updatePattern(existingPattern.id, payload, { semanticAuditSource: 'template' })
      : await repo.createPattern(payload, { semanticAuditSource: 'template' });

    outcomes.push({
      action: existingPattern ? 'updated' : 'created',
      target: persistedPattern.target,
      patternId: persistedPattern.id,
      label: persistedPattern.label,
    });
  }

  return NextResponse.json({ outcomes });
}
