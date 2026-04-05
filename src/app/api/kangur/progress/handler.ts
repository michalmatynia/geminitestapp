import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurProgressRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { ActivityTypes } from '@/shared/constants/observability';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { kangurLessonSubjectSchema } from '@kangur/contracts/kangur-lesson-constants';
import { type KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import { type KangurProgressState } from '@kangur/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { parseKangurProgressUpdatePayload } from '@/shared/validations/kangur';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const KANGUR_PROGRESS_SOURCE_HEADER = 'x-kangur-progress-source';
const KANGUR_PROGRESS_CTA_HEADER = 'x-kangur-progress-cta';
const KANGUR_PROGRESS_CTA_SOURCE = 'lesson_panel_navigation';
const KANGUR_PROGRESS_CACHE_TTL_MS = 30_000;

type KangurProgressCacheEntry = {
  data: KangurProgressState;
  fetchedAt: number;
};

const kangurProgressCache = new Map<string, KangurProgressCacheEntry>();
const kangurProgressInflight = new Map<string, Promise<KangurProgressState>>();

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur progress payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw badRequestError('Invalid JSON payload.').withCause(error);
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

const resolveProgressSubject = (req: NextRequest): KangurLessonSubject => {
  const raw = req.nextUrl.searchParams.get('subject');
  const parsed = kangurLessonSubjectSchema.safeParse(raw?.trim());
  return parsed.success ? parsed.data : 'maths';
};

const buildSubjectProgressKey = (userKey: string, subject: KangurLessonSubject): string =>
  `${userKey}::${subject}`;

const buildKangurProgressCacheKey = (input: {
  learnerId: string;
  legacyUserKey: string | null;
  subject: KangurLessonSubject;
}): string =>
  JSON.stringify({
    learnerId: input.learnerId,
    legacyUserKey: input.legacyUserKey ?? null,
    subject: input.subject,
  });

const cloneKangurProgress = (progress: KangurProgressState): KangurProgressState =>
  structuredClone(progress);

const primeKangurProgressCache = (
  input: {
    learnerId: string;
    legacyUserKey: string | null;
    subject: KangurLessonSubject;
  },
  progress: KangurProgressState
): void => {
  kangurProgressCache.set(buildKangurProgressCacheKey(input), {
    data: cloneKangurProgress(progress),
    fetchedAt: Date.now(),
  });
};

const isRelatedKangurProgressCacheKey = (
  cacheKey: string,
  input: {
    learnerId: string;
    legacyUserKey: string | null;
    subject: KangurLessonSubject;
  }
): boolean => {
  try {
    const parsed = JSON.parse(cacheKey) as {
      learnerId?: string | null;
      legacyUserKey?: string | null;
      subject?: string | null;
    };

    if (parsed.subject !== input.subject) {
      return false;
    }

    return parsed.learnerId === input.learnerId || parsed.legacyUserKey === input.legacyUserKey;
  } catch {
    return false;
  }
};

export const clearKangurProgressCache = (): void => {
  kangurProgressCache.clear();
  kangurProgressInflight.clear();
};

export const invalidateKangurProgressCache = (input: {
  learnerId: string;
  legacyUserKey: string | null;
  subject: KangurLessonSubject;
}): void => {
  for (const key of kangurProgressCache.keys()) {
    if (isRelatedKangurProgressCacheKey(key, input)) {
      kangurProgressCache.delete(key);
    }
  }

  for (const key of kangurProgressInflight.keys()) {
    if (isRelatedKangurProgressCacheKey(key, input)) {
      kangurProgressInflight.delete(key);
    }
  }
};

const resolveProgressKeys = (input: {
  learnerId: string;
  legacyUserKey: string | null;
  subject: KangurLessonSubject;
}): { primaryKey: string; keys: string[] } => {
  const baseKeys = [input.learnerId, ...(input.legacyUserKey ? [input.legacyUserKey] : [])];
  const subjectKeys = baseKeys.map((key) => buildSubjectProgressKey(key, input.subject));
  const fallbackKeys = input.subject === 'maths' ? baseKeys : [];
  return {
    primaryKey: subjectKeys[0]!,
    keys: [...subjectKeys, ...fallbackKeys],
  };
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
      if (totalSeconds <= 0) {
        return;
      }
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
  subject: KangurLessonSubject;
}) => {
  const cacheKey = buildKangurProgressCacheKey(input);
  const cached = kangurProgressCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < KANGUR_PROGRESS_CACHE_TTL_MS) {
    return cloneKangurProgress(cached.data);
  }

  const inflight = kangurProgressInflight.get(cacheKey);
  if (inflight) {
    return cloneKangurProgress(await inflight);
  }

  const repository = await getKangurProgressRepository();
  const inflightPromise = (async (): Promise<KangurProgressState> => {
    const { primaryKey, keys } = resolveProgressKeys(input);
    const progressEntries = await Promise.all(keys.map((key) => repository.getProgress(key)));
    const [primary] = progressEntries;
    const defaultProgress = createDefaultKangurProgressState();
    const primaryEmpty =
      JSON.stringify(primary ?? defaultProgress) === JSON.stringify(defaultProgress);

    let resolvedProgress = primary ?? defaultProgress;
    if (primaryEmpty) {
      const fallback = progressEntries.find(
        (entry) => JSON.stringify(entry) !== JSON.stringify(defaultProgress)
      );
      if (fallback) {
        await repository.saveProgress(primaryKey, fallback);
        resolvedProgress = fallback;
      }
    }

    primeKangurProgressCache(input, resolvedProgress);
    return resolvedProgress;
  })().finally(() => {
    kangurProgressInflight.delete(cacheKey);
  });

  kangurProgressInflight.set(cacheKey, inflightPromise);
  return cloneKangurProgress(await inflightPromise);
};

export async function getKangurProgressHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const subject = resolveProgressSubject(req);
  const progress = await loadProgressForLearner({
    learnerId: activeLearner.id,
    legacyUserKey: activeLearner.legacyUserKey,
    subject,
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
  const subject = resolveProgressSubject(req);
  const repository = await getKangurProgressRepository();
  const previousProgress = await loadProgressForLearner({
    learnerId: activeLearner.id,
    legacyUserKey: activeLearner.legacyUserKey,
    subject,
  });
  const progressKey = buildSubjectProgressKey(activeLearner.id, subject);
  const progress = await repository.saveProgress(progressKey, payload);
  invalidateKangurProgressCache({
    learnerId: activeLearner.id,
    legacyUserKey: activeLearner.legacyUserKey,
    subject,
  });
  primeKangurProgressCache(
    {
      learnerId: activeLearner.id,
      legacyUserKey: activeLearner.legacyUserKey,
      subject,
    },
    progress
  );

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
      subject,
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
    }).catch((error) => {
      void ErrorSystem.captureException(error);
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
      void Promise.all(activityWrites).catch((error) => {
        void ErrorSystem.captureException(error);
        // Avoid failing the progress write on activity log issues.
      });
    }
  }
  return NextResponse.json(progress);
}
