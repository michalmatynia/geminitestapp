import 'server-only';

import type { Filter } from 'mongodb';

import {
  PLAYWRIGHT_ACTION_RUNS_COLLECTION,
  PLAYWRIGHT_ACTION_RUN_STEPS_COLLECTION,
  type PlaywrightActionRunDetailResponse,
  type PlaywrightActionRunListFilters,
  type PlaywrightActionRunListResponse,
  type PlaywrightActionRunRecord,
  type PlaywrightActionRunStepRecord,
  type PlaywrightActionRunSummary,
} from '@/shared/contracts/playwright-action-runs';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type ActionRunDocument = Omit<
  PlaywrightActionRunRecord,
  'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

type ActionRunStepDocument = Omit<
  PlaywrightActionRunStepRecord,
  'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

let indexesEnsured: Promise<void> | null = null;

const isMongoConfigured = (): boolean => Boolean(process.env['MONGODB_URI']);

const parseDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toRunDoc = (run: PlaywrightActionRunRecord): ActionRunDocument => ({
  ...run,
  createdAt: parseDate(run.createdAt) ?? new Date(),
  updatedAt: parseDate(run.updatedAt) ?? new Date(),
  startedAt: parseDate(run.startedAt),
  completedAt: parseDate(run.completedAt),
});

const toStepDoc = (step: PlaywrightActionRunStepRecord): ActionRunStepDocument => ({
  ...step,
  createdAt: parseDate(step.createdAt) ?? new Date(),
  updatedAt: parseDate(step.updatedAt) ?? new Date(),
  startedAt: parseDate(step.startedAt),
  completedAt: parseDate(step.completedAt),
});

const toRunRecord = (doc: ActionRunDocument): PlaywrightActionRunRecord => ({
  ...doc,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  startedAt: toIso(doc.startedAt),
  completedAt: toIso(doc.completedAt),
});

const toStepRecord = (doc: ActionRunStepDocument): PlaywrightActionRunStepRecord => ({
  ...doc,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  startedAt: toIso(doc.startedAt),
  completedAt: toIso(doc.completedAt),
});

const ensureIndexes = async (): Promise<void> => {
  if (!isMongoConfigured()) return;
  if (indexesEnsured) return indexesEnsured;

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    await Promise.all([
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex(
        { runId: 1 },
        { unique: true }
      ),
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex({
        createdAt: -1,
      }),
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex({
        status: 1,
        createdAt: -1,
      }),
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex({
        actionId: 1,
        createdAt: -1,
      }),
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex({
        runtimeKey: 1,
        createdAt: -1,
      }),
      db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION).createIndex({
        selectorProfile: 1,
        createdAt: -1,
      }),
      db.collection<ActionRunStepDocument>(PLAYWRIGHT_ACTION_RUN_STEPS_COLLECTION).createIndex({
        runId: 1,
        sequenceIndex: 1,
      }),
    ]);
  })().catch((error: unknown) => {
    indexesEnsured = null;
    throw error;
  });

  return indexesEnsured;
};

const getRunCollection = async () => {
  const db = await getMongoDb();
  return db.collection<ActionRunDocument>(PLAYWRIGHT_ACTION_RUNS_COLLECTION);
};

const getStepCollection = async () => {
  const db = await getMongoDb();
  return db.collection<ActionRunStepDocument>(PLAYWRIGHT_ACTION_RUN_STEPS_COLLECTION);
};

const toPositiveLimit = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(200, Math.max(1, Math.trunc(value)))
    : 50;

const toCursorOffset = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};

const toSummary = (run: PlaywrightActionRunRecord): PlaywrightActionRunSummary => ({
  runId: run.runId,
  actionId: run.actionId,
  actionName: run.actionName,
  runtimeKey: run.runtimeKey,
  status: run.status,
  startedAt: run.startedAt,
  completedAt: run.completedAt,
  durationMs: run.durationMs,
  selectorProfile: run.selectorProfile,
  connectionId: run.connectionId,
  integrationId: run.integrationId,
  instanceKind: run.instanceKind,
  instanceFamily: run.instanceFamily,
  instanceLabel: run.instanceLabel,
  tags: run.tags,
  stepCount: run.stepCount,
  createdAt: run.createdAt,
  updatedAt: run.updatedAt,
});

export async function upsertPlaywrightActionRunHistory(input: {
  run: PlaywrightActionRunRecord;
  steps: PlaywrightActionRunStepRecord[];
}): Promise<void> {
  if (!isMongoConfigured()) return;

  try {
    await ensureIndexes();
    const [runs, steps] = await Promise.all([getRunCollection(), getStepCollection()]);
    const runDoc = toRunDoc(input.run);
    const { createdAt, ...runUpdate } = runDoc;
    await runs.updateOne(
      { runId: input.run.runId },
      {
        $set: runUpdate,
        $setOnInsert: {
          createdAt,
        },
      },
      { upsert: true }
    );

    await steps.deleteMany({ runId: input.run.runId });
    const stepDocs = input.steps.map(toStepDoc);
    if (stepDocs.length > 0) {
      await steps.insertMany(stepDocs, { ordered: true });
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'playwright.action-run-history',
      action: 'upsert',
      runId: input.run.runId,
    });
  }
}

export async function listPlaywrightActionRuns(
  filters: PlaywrightActionRunListFilters = {}
): Promise<PlaywrightActionRunListResponse> {
  if (!isMongoConfigured()) {
    return { runs: [], nextCursor: null, total: 0 };
  }

  await ensureIndexes();
  const collection = await getRunCollection();
  const query: Filter<ActionRunDocument> = {};
  const limit = toPositiveLimit(filters.limit);
  const offset = toCursorOffset(filters.cursor);

  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.actionId) query.actionId = filters.actionId;
  if (filters.runtimeKey) query.runtimeKey = filters.runtimeKey;
  if (filters.selectorProfile) query.selectorProfile = filters.selectorProfile;
  if (filters.instanceKind) query.instanceKind = filters.instanceKind;
  if (filters.dateFrom || filters.dateTo) {
    const createdAtRange: { $gte?: Date; $lte?: Date } = {};
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      if (!Number.isNaN(dateFrom.getTime())) createdAtRange.$gte = dateFrom;
    }
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      if (!Number.isNaN(dateTo.getTime())) createdAtRange.$lte = dateTo;
    }
    if (Object.keys(createdAtRange).length > 0) {
      query.createdAt = createdAtRange;
    }
  }

  const normalizedQuery = filters.query?.trim();
  if (normalizedQuery) {
    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { runId: regex },
      { actionName: regex },
      { runtimeKey: regex },
      { instanceLabel: regex },
      { selectorProfile: regex },
    ];
  }

  const [docs, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  const runs = docs.map(toRunRecord).map(toSummary);
  const nextOffset = offset + docs.length;

  return {
    runs,
    total,
    nextCursor: nextOffset < total ? String(nextOffset) : null,
  };
}

export async function getPlaywrightActionRunDetail(
  runId: string
): Promise<PlaywrightActionRunDetailResponse | null> {
  if (!isMongoConfigured()) return null;

  await ensureIndexes();
  const [runs, steps] = await Promise.all([getRunCollection(), getStepCollection()]);
  const runDoc = await runs.findOne({ runId });
  if (!runDoc) return null;

  const stepDocs = await steps.find({ runId }).sort({ sequenceIndex: 1 }).toArray();

  return {
    run: toRunRecord(runDoc),
    steps: stepDocs.map(toStepRecord),
  };
}
