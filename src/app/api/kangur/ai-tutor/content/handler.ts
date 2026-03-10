import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { validateKangurAiTutorOnboardingContent } from '@/features/kangur/ai-tutor-onboarding-validation';
import {
  getKangurAiTutorContent,
  upsertKangurAiTutorContent,
} from '@/features/kangur/server/ai-tutor-content-repository';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { VALIDATOR_PATTERN_LISTS_KEY, parseValidatorPatternLists } from '@/shared/contracts/validator';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';

export const querySchema = z.object({
  locale: z.preprocess((value) => normalizeOptionalQueryString(value) ?? 'pl', z.string()),
});

export async function getKangurAiTutorContentHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const locale = query.locale;
  const content = await getKangurAiTutorContent(locale);

  return NextResponse.json(content, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurAiTutorContentHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur AI Tutor content.');
  }

  const content = parseKangurAiTutorContent(ctx.body as KangurAiTutorContent);
  const [rawPatternLists, rawPromptEngineSettings] = await Promise.all([
    readStoredSettingValue(VALIDATOR_PATTERN_LISTS_KEY),
    readStoredSettingValue(PROMPT_ENGINE_SETTINGS_KEY),
  ]);
  const validation = validateKangurAiTutorOnboardingContent({
    content,
    patternLists: parseValidatorPatternLists(rawPatternLists),
    promptEngineSettings: parsePromptEngineSettings(rawPromptEngineSettings),
  });
  if (validation.blockingIssues.length > 0) {
    throw badRequestError('AI Tutor onboarding validation failed.', {
      issues: validation.blockingIssues,
    });
  }

  const payload = await upsertKangurAiTutorContent(content);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
