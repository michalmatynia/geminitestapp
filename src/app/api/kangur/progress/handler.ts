import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurProgressRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { ActivityTypes } from '@/shared/constants/observability';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { parseKangurProgressUpdatePayload } from '@/shared/validations/kangur';

const KANGUR_PROGRESS_SOURCE_HEADER = 'x-kangur-progress-source';
const KANGUR_PROGRESS_CTA_HEADER = 'x-kangur-progress-cta';
const KANGUR_PROGRESS_CTA_SOURCE = 'lesson_panel_navigation';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur progress payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

const resolveBodyJson = async (
  request: NextRequest,
  ctx: ApiHandlerContext
): Promise<unknown> => {
  if (ctx.body !== undefined) {
    return ctx.body;
  }
  return readBodyJson(request);
};

const resolveProgressKeys = (input: {
  learnerId: string;
  legacyUserKey: string | null;
}): string[] => {
  const keys = [input.learnerId];
  if (input.legacyUserKey) {
    keys.push(input.legacyUserKey);
  }
  return keys;
};

const loadProgressForLearner = async (input: {
  learnerId: string;
  legacyUserKey: string | null;
}) => {
  const repository = await getKangurProgressRepository();
  const [primary, legacy] = await Promise.all(
    resolveProgressKeys(input).map((key) => repository.getProgress(key))
  );
  const defaultProgress = createDefaultKangurProgressState();
  const primaryEmpty = JSON.stringify(primary) === JSON.stringify(defaultProgress);
  if (primaryEmpty && legacy && JSON.stringify(legacy) !== JSON.stringify(defaultProgress)) {
    await repository.saveProgress(input.learnerId, legacy);
    return legacy;
  }
  return primary ?? defaultProgress;
};

export async function getKangurProgressHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const progress = await loadProgressForLearner({
    learnerId: activeLearner.id,
    legacyUserKey: activeLearner.legacyUserKey,
  });

  return NextResponse.json(progress);
}

export async function patchKangurProgressHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurProgressUpdatePayload(await resolveBodyJson(req, ctx));
  const ctaSource = req.headers.get(KANGUR_PROGRESS_SOURCE_HEADER);
  const ctaId = req.headers.get(KANGUR_PROGRESS_CTA_HEADER);
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const repository = await getKangurProgressRepository();
  const progress = await repository.saveProgress(activeLearner.id, payload);

  void logKangurServerEvent({
    source: 'kangur.progress.update',
    message: 'Kangur progress updated',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      totalXp: progress.totalXp,
      gamesPlayed: progress.gamesPlayed,
      lessonsCompleted: progress.lessonsCompleted,
      perfectGames: progress.perfectGames,
    },
  });

  if (
    ctaSource === KANGUR_PROGRESS_CTA_SOURCE &&
    actor.actorType === 'learner' &&
    actor.ownerUserId
  ) {
    void logActivity({
      type: ActivityTypes.KANGUR.LESSON_PANEL_CTA,
      description: `Lesson panel navigation CTA${ctaId ? `: ${ctaId}` : ''}`,
      userId: actor.ownerUserId,
      entityId: activeLearner.id,
      entityType: 'kangur_learner',
      metadata: {
        source: ctaSource,
        cta: ctaId ?? null,
      },
    }).catch(() => {
      // Avoid failing the progress write on activity log issues.
    });
  }
  return NextResponse.json(progress);
}
