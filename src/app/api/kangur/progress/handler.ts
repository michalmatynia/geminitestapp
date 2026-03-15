import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurProgressRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { ActivityTypes } from '@/shared/constants/observability';
import {
  createDefaultKangurProgressState,
  type KangurProgressState,
} from '@/shared/contracts/kangur';
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

const parseTimestampMs = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildOpenedTaskKey = (entry: { kind: string; href: string; openedAt?: string | null }): string =>
  `${entry.kind}::${entry.href}::${entry.openedAt ?? ''}`;

const resolveOpenedTaskActivity = (
  previous: KangurProgressState,
  next: KangurProgressState
): Array<{
  kind: string;
  title: string;
  href: string;
  openedAt: string;
}> => {
  const previousTasks = previous.openedTasks ?? [];
  const nextTasks = next.openedTasks ?? [];
  if (nextTasks.length === 0) {
    return [];
  }

  const previousMaxTimestamp = previousTasks.reduce(
    (max, entry) => Math.max(max, parseTimestampMs(entry.openedAt)),
    0
  );
  const previousKeys = new Set(previousTasks.map(buildOpenedTaskKey));

  return nextTasks.filter((entry) => {
    const openedAt = entry.openedAt ?? '';
    if (!entry.title?.trim() || !entry.href?.trim() || !openedAt) {
      return false;
    }
    const timestamp = parseTimestampMs(openedAt);
    if (!timestamp) {
      return false;
    }
    if (timestamp > previousMaxTimestamp) {
      return true;
    }
    if (timestamp === previousMaxTimestamp) {
      return !previousKeys.has(buildOpenedTaskKey(entry));
    }
    return false;
  }) as Array<{
    kind: string;
    title: string;
    href: string;
    openedAt: string;
  }>;
};

const sumPanelSeconds = (
  panelTimes: NonNullable<
    NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
  >
): number =>
  Object.values(panelTimes).reduce((sum, panel) => sum + Math.max(0, panel.seconds ?? 0), 0);

const countPanels = (
  panelTimes: NonNullable<
    NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
  >
): number => Object.values(panelTimes).filter((panel) => (panel.seconds ?? 0) > 0).length;

const resolveLessonPanelActivity = (
  previous: KangurProgressState,
  next: KangurProgressState
): Array<{
  lessonKey: string;
  sectionId: string;
  label: string | null;
  sessionId: string | null;
  sessionStartedAt: string | null;
  sessionUpdatedAt: string;
  totalSeconds: number;
  panelCount: number;
}> => {
  const nextLessons = next.lessonPanelProgress ?? {};
  const previousLessons = previous.lessonPanelProgress ?? {};
  const events: Array<{
    lessonKey: string;
    sectionId: string;
    label: string | null;
    sessionId: string | null;
    sessionStartedAt: string | null;
    sessionUpdatedAt: string;
    totalSeconds: number;
    panelCount: number;
  }> = [];

  Object.entries(nextLessons).forEach(([lessonKey, sections]) => {
    Object.entries(sections ?? {}).forEach(([sectionId, entry]) => {
      const updatedAt = entry.sessionUpdatedAt ?? entry.lastViewedAt ?? null;
      const updatedAtMs = parseTimestampMs(updatedAt);
      if (!updatedAt || !updatedAtMs) {
        return;
      }
      const previousEntry = previousLessons[lessonKey]?.[sectionId];
      const previousUpdatedAtMs = parseTimestampMs(
        previousEntry?.sessionUpdatedAt ?? previousEntry?.lastViewedAt ?? null
      );
      if (updatedAtMs <= previousUpdatedAtMs) {
        return;
      }

      const panelTimes = entry.panelTimes ?? {};
      const totalSeconds = sumPanelSeconds(panelTimes);
      const panelCount = countPanels(panelTimes);
      const previousPanelTimes = previousEntry?.panelTimes ?? {};
      const previousTotalSeconds = sumPanelSeconds(previousPanelTimes);
      const totalDelta = totalSeconds - previousTotalSeconds;
      const sessionId = entry.sessionId?.trim() || null;
      const previousSessionId = previousEntry?.sessionId?.trim() || null;
      const isNewSession = !previousEntry || (sessionId && sessionId !== previousSessionId);
      const shouldLog = isNewSession || totalDelta >= 60;

      if (!shouldLog) {
        return;
      }

      events.push({
        lessonKey,
        sectionId,
        label: entry.label?.trim() || null,
        sessionId,
        sessionStartedAt: entry.sessionStartedAt ?? null,
        sessionUpdatedAt: updatedAt,
        totalSeconds,
        panelCount,
      });
    });
  });

  return events;
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
  const previousProgress = await loadProgressForLearner({
    learnerId: activeLearner.id,
    legacyUserKey: activeLearner.legacyUserKey,
  });
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

  if (actor.actorType === 'learner' && actor.ownerUserId) {
    const openedTaskEvents = resolveOpenedTaskActivity(previousProgress, payload);
    const lessonPanelEvents = resolveLessonPanelActivity(previousProgress, payload);

    const activityWrites = [
      ...openedTaskEvents.map((entry) =>
        logActivity({
          type: ActivityTypes.KANGUR.OPENED_TASK,
          description: `Otwarte zadanie: ${entry.title}`,
          userId: actor.ownerUserId,
          entityId: activeLearner.id,
          entityType: 'kangur_learner',
          metadata: {
            kind: entry.kind,
            title: entry.title,
            href: entry.href,
            openedAt: entry.openedAt,
          },
        })
      ),
      ...lessonPanelEvents.map((entry) =>
        logActivity({
          type: ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
          description: `Aktywność w panelach lekcji: ${entry.lessonKey}/${entry.sectionId}`,
          userId: actor.ownerUserId,
          entityId: activeLearner.id,
          entityType: 'kangur_learner',
          metadata: {
            lessonKey: entry.lessonKey,
            sectionId: entry.sectionId,
            label: entry.label,
            sessionId: entry.sessionId,
            sessionStartedAt: entry.sessionStartedAt,
            sessionUpdatedAt: entry.sessionUpdatedAt,
            totalSeconds: entry.totalSeconds,
            panelCount: entry.panelCount,
          },
        })
      ),
    ];

    if (activityWrites.length > 0) {
      void Promise.all(activityWrites).catch(() => {
        // Avoid failing the progress write on activity log issues.
      });
    }
  }
  return NextResponse.json(progress);
}
