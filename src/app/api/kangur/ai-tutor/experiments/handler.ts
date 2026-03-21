import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import {
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  normalizeKangurAiTutorLearnerSettings,
  type KangurAiTutorExperimentFlags,
} from '@/features/kangur/settings-ai-tutor';

const experimentFlagsSchema = z.object({
  coachingMode: z
    .enum(['hint_ladder', 'misconception_check', 'review_reflection', 'next_best_action'])
    .nullable()
    .optional(),
  contextStrategy: z.enum(['default', 'no_kg', 'native_guide_only']).nullable().optional(),
});

/**
 * GET /api/kangur/ai-tutor/experiments
 * Returns current experiment flags for the active learner.
 */
export async function GET_handler(req: NextRequest): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const learnerId = activeLearner.id;

  try {
    const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
    const settingsStore = parseKangurAiTutorSettings(rawSettings);
    const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId);

    return NextResponse.json({
      success: true,
      learnerId,
      experimentFlags: tutorSettings.experimentFlags,
    });
  } catch (error) {
    throw badRequestError('Failed to read experiment flags.').withCause(error);
  }
}

/**
 * PUT /api/kangur/ai-tutor/experiments
 * Updates experiment flags for the active learner.
 * Request body: { coachingMode?: string | null, contextStrategy?: string | null }
 */
export async function PUT_handler(req: NextRequest): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const learnerId = activeLearner.id;

  const parsed = await parseJsonBody(req, experimentFlagsSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const input = parsed.data;

  try {
    // Read current settings
    const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
    const settingsStore = parseKangurAiTutorSettings(rawSettings);

    // Get or create learner settings
    const existingSettings = settingsStore[learnerId] ?? {};
    const normalized = normalizeKangurAiTutorLearnerSettings(existingSettings);

    // Update experiment flags
    const updatedFlags: KangurAiTutorExperimentFlags = {
      coachingMode: input.coachingMode ?? normalized.experimentFlags.coachingMode,
      contextStrategy: input.contextStrategy ?? normalized.experimentFlags.contextStrategy,
    };

    // Update store
    const updatedSettings = {
      ...normalized,
      experimentFlags: updatedFlags,
    };

    settingsStore[learnerId] = updatedSettings;

    // Write back to storage
    await upsertStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY, JSON.stringify(settingsStore));

    return NextResponse.json({
      success: true,
      learnerId,
      experimentFlags: updatedFlags,
    });
  } catch (error) {
    throw badRequestError('Failed to update experiment flags.').withCause(error);
  }
}
