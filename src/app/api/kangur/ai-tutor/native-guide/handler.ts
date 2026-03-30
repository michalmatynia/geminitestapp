import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { validateKangurAiTutorOnboardingStore } from '@/features/kangur/ai-tutor/onboarding-validation';
import {
  getKangurAiTutorNativeGuideStore,
  upsertKangurAiTutorNativeGuideStore,
} from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
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

export async function getKangurAiTutorNativeGuideHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const locale = query.locale;
  const store = await getKangurAiTutorNativeGuideStore(locale);

  return NextResponse.json(store, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurAiTutorNativeGuideHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur AI Tutor native guides.');
  }

  const store = parseKangurAiTutorNativeGuideStore(ctx.body as KangurAiTutorNativeGuideStore);
  const [rawPatternLists, rawPromptEngineSettings] = await Promise.all([
    readStoredSettingValue(VALIDATOR_PATTERN_LISTS_KEY),
    readStoredSettingValue(PROMPT_ENGINE_SETTINGS_KEY),
  ]);
  const validation = validateKangurAiTutorOnboardingStore({
    store,
    patternLists: parseValidatorPatternLists(rawPatternLists),
    promptEngineSettings: parsePromptEngineSettings(rawPromptEngineSettings),
  });
  if (validation.blockingIssues.length > 0) {
    throw badRequestError('AI Tutor onboarding validation failed.', {
      issues: validation.blockingIssues,
    });
  }

  const payload = await upsertKangurAiTutorNativeGuideStore(store);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
