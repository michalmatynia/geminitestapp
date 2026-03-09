import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/server';
import { readKangurAiTutorDailyUsage } from '@/features/kangur/server/ai-tutor-usage';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
} from '@/features/kangur/settings-ai-tutor';
import type { KangurAiTutorUsageResponse } from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

const AI_TUTOR_AVAILABILITY_ERROR_MESSAGES = {
  disabled: 'AI tutor is not enabled for this learner.',
  email_unverified: 'Verify your parent email to unlock AI Tutor.',
  missing_context: 'AI tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI tutor is disabled for lessons for this learner.',
  tests_disabled: 'AI tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI tutor is available in tests only after the answer has been revealed.',
} as const;

export async function getKangurAiTutorUsageHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learnerId = actor.activeLearner.id;

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);

  if (!tutorSettings.enabled) {
    throw badRequestError(AI_TUTOR_AVAILABILITY_ERROR_MESSAGES.disabled, {
      reason: 'disabled',
    });
  }

  if (!actor.ownerEmailVerified) {
    throw badRequestError(AI_TUTOR_AVAILABILITY_ERROR_MESSAGES.email_unverified, {
      reason: 'email_unverified',
    });
  }

  const usage = await readKangurAiTutorDailyUsage({
    learnerId,
    dailyMessageLimit: tutorSettings.dailyMessageLimit,
  });

  return NextResponse.json({
    usage,
  } satisfies KangurAiTutorUsageResponse);
}
