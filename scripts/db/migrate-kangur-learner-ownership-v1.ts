import 'dotenv/config';

import type { ObjectId } from 'mongodb';

import { getKangurAssignmentRepository } from '@/features/kangur/services/kangur-assignment-repository';
import { getKangurProgressRepository } from '@/features/kangur/services/kangur-progress-repository';
import {
  buildDefaultKangurLearnerSeed,
  buildKangurMigrationLegacyKeys,
  isDefaultKangurProgressState,
  planKangurAssignmentCopies,
  resolveAdoptedLegacyUserKey,
  selectKangurScoreBackfillLearner,
} from '@/features/kangur/services/kangur-learner-ownership-migration';
import {
  ensureDefaultKangurLearnerForOwner,
  listKangurLearnersByOwner,
  setKangurLearnerLegacyUserKey,
} from '@/features/kangur/services/kangur-learner-repository';
import type { AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type {
  KangurAssignment,
  KangurLearnerProfile,
  KangurScore,
} from '@/shared/contracts/kangur';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import { createDefaultKangurProgressState, kangurScoreSchema } from '@/shared/contracts/kangur';
import { getAuthDataProvider, type AuthDbProvider } from '@/shared/lib/auth/services/auth-provider';

type CliOptions = {
  dryRun: boolean;
  ownerFilters: string[];
  help: boolean;
};

type AuthOwner = {
  id: string;
  email: string;
  name: string | null;
};

type WorkingLearner = KangurLearnerProfile & {
  simulated?: boolean;
};

type PrismaScoreRow = {
  key: string;
  score: KangurScore;
};

type LearnerMigrationReport = {
  learnerId: string;
  displayName: string;
  simulated: boolean;
  createdDefaultLearner: boolean;
  legacyUserKey: string | null;
  candidateLegacyKeys: string[];
  progressStatus: 'backfilled' | 'unchanged' | 'skipped';
  progressSourceKey: string | null;
  progressMatchedKeys: string[];
  assignmentCopies: number;
  assignmentSkippedExistingIds: number;
  assignmentSkippedDuplicateTargets: number;
  assignmentSourceKeys: string[];
  notes: string[];
};

type ScoreMigrationReport = {
  status: 'backfilled' | 'unchanged' | 'skipped_no_owner_email' | 'skipped_ambiguous';
  targetLearnerId: string | null;
  candidateCount: number;
  updatedCount: number;
  notes: string[];
};

type OwnerMigrationReport = {
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string | null;
  learnersBefore: number;
  learnersAfter: number;
  createdDefaultLearner: boolean;
  learnerReports: LearnerMigrationReport[];
  scoreReport: ScoreMigrationReport;
  errors: string[];
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  authProvider: AuthDbProvider;
  appProvider: AppDbProvider;
  ownerFilters: string[];
  scannedOwners: number;
  matchedOwners: number;
  createdDefaultLearners: number;
  adoptedLegacyKeys: number;
  progressBackfilled: number;
  assignmentCopies: number;
  scoreUpdates: number;
  ownersWithErrors: number;
  reports: OwnerMigrationReport[];
};

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
};

type MongoScoreDoc = {
  _id: ObjectId;
  created_by?: string | null;
  learner_id?: string | null;
  owner_user_id?: string | null;
};

type MongoAssignmentSettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const KANGUR_SCORE_SETTING_PREFIX = 'kangur_score:';
const KANGUR_ASSIGNMENT_SETTING_PREFIX = 'kangur_assignment:';
const KANGUR_SCORES_COLLECTION = 'kangur_scores';
const SETTINGS_COLLECTION = 'settings';

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    ownerFilters: [],
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--owner=')) {
      const raw = arg.slice('--owner='.length).trim().toLowerCase();
      if (raw.length > 0) {
        options.ownerFilters.push(raw);
      }
    }
  }

  return options;
};

const printUsage = (): void => {
  console.log(`Usage: npm run migrate:kangur:learner-ownership:v1 -- [--write] [--owner=<email-or-user-id>]

Dry-run is the default mode.
Use --write to persist learner creation, legacy-key adoption, progress backfill,
assignment copies, and score learner_id updates.
Repeat --owner to scope the migration to one or more parent accounts.`);
};

const normalizeKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOwnerFilters = (ownerFilters: string[]): string[] =>
  ownerFilters.filter((value, index) => ownerFilters.indexOf(value) === index);

const matchesOwnerFilter = (owner: AuthOwner, ownerFilters: string[]): boolean => {
  if (ownerFilters.length === 0) {
    return true;
  }

  return ownerFilters.includes(owner.id.toLowerCase()) || ownerFilters.includes(owner.email);
};

const toLearnerPrefix = (learnerKey: string): string =>
  `${KANGUR_ASSIGNMENT_SETTING_PREFIX}${encodeURIComponent(learnerKey.trim().toLowerCase())}:`;

const toAssignmentSettingKey = (learnerKey: string, assignmentId: string): string =>
  `${toLearnerPrefix(learnerKey)}${assignmentId.trim()}`;

const listAuthOwners = async (
  authProvider: AuthDbProvider,
  ownerFilters: string[]
): Promise<AuthOwner[]> => {
  if (authProvider === 'prisma') {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return rows
      .filter((row): row is { id: string; email: string; name: string | null } => {
        return typeof row.email === 'string' && row.email.trim().length > 0;
      })
      .map((row) => ({
        id: row.id,
        email: row.email.trim().toLowerCase(),
        name: row.name?.trim() || null,
      }))
      .filter((owner) => matchesOwnerFilter(owner, ownerFilters));
  }

  const db = await getMongoDb();
  const rows = await db
    .collection<MongoUserDoc>('users')
    .find(
      {},
      {
        projection: {
          email: 1,
          name: 1,
        },
      }
    )
    .toArray();

  return rows
    .map((row) => ({
      id: row._id.toString(),
      email: typeof row.email === 'string' ? row.email.trim().toLowerCase() : '',
      name: typeof row.name === 'string' ? row.name.trim() || null : null,
    }))
    .filter((owner) => owner.email.length > 0)
    .filter((owner) => matchesOwnerFilter(owner, ownerFilters))
    .sort((left, right) => left.email.localeCompare(right.email));
};

const loadPrismaLegacyScores = async (): Promise<Map<string, PrismaScoreRow[]>> => {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: KANGUR_SCORE_SETTING_PREFIX,
      },
    },
    select: {
      key: true,
      value: true,
    },
    orderBy: {
      key: 'asc',
    },
  });

  const byOwnerEmail = new Map<string, PrismaScoreRow[]>();
  for (const row of rows) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(row.value);
    } catch {
      continue;
    }

    const parsedScore = kangurScoreSchema.safeParse(parsedJson);
    if (!parsedScore.success) {
      continue;
    }

    const ownerEmail = normalizeKey(parsedScore.data.created_by);
    const learnerId = normalizeKey(parsedScore.data.learner_id);
    if (!ownerEmail || learnerId) {
      continue;
    }

    const entries = byOwnerEmail.get(ownerEmail) ?? [];
    entries.push({
      key: row.key,
      score: parsedScore.data,
    });
    byOwnerEmail.set(ownerEmail, entries);
  }

  return byOwnerEmail;
};

const upsertAssignment = async (
  appProvider: AppDbProvider,
  assignment: KangurAssignment
): Promise<void> => {
  const key = toAssignmentSettingKey(assignment.learnerKey, assignment.id);
  const value = JSON.stringify(assignment);

  if (appProvider === 'prisma') {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return;
  }

  const db = await getMongoDb();
  const now = new Date();
  await db.collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION).updateOne(
    {
      $or: [{ key }, { _id: key }],
    },
    {
      $set: {
        _id: key,
        key,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    }
  );
};

const countMongoLegacyScores = async (ownerEmail: string): Promise<number> => {
  const db = await getMongoDb();
  return db.collection<MongoScoreDoc>(KANGUR_SCORES_COLLECTION).countDocuments({
    created_by: ownerEmail,
    $or: [{ learner_id: { $exists: false } }, { learner_id: null }, { learner_id: '' }],
  });
};

const backfillMongoLegacyScores = async (input: {
  ownerEmail: string;
  ownerUserId: string;
  learnerId: string;
  dryRun: boolean;
}): Promise<number> => {
  const db = await getMongoDb();
  const filter = {
    created_by: input.ownerEmail,
    $or: [{ learner_id: { $exists: false } }, { learner_id: null }, { learner_id: '' }],
  };

  if (input.dryRun) {
    return db.collection<MongoScoreDoc>(KANGUR_SCORES_COLLECTION).countDocuments(filter);
  }

  const result = await db.collection<MongoScoreDoc>(KANGUR_SCORES_COLLECTION).updateMany(filter, {
    $set: {
      learner_id: input.learnerId,
      owner_user_id: input.ownerUserId,
    },
  });

  return result.modifiedCount;
};

const backfillPrismaLegacyScores = async (input: {
  rows: PrismaScoreRow[];
  ownerUserId: string;
  learnerId: string;
  dryRun: boolean;
}): Promise<number> => {
  if (input.dryRun) {
    return input.rows.length;
  }

  let updatedCount = 0;
  for (const row of input.rows) {
    await prisma.setting.update({
      where: { key: row.key },
      data: {
        value: JSON.stringify({
          ...row.score,
          learner_id: input.learnerId,
          owner_user_id: input.ownerUserId,
        } satisfies KangurScore),
      },
    });
    updatedCount += 1;
  }

  return updatedCount;
};

const prepareLearnersForOwner = async (input: {
  owner: AuthOwner;
  dryRun: boolean;
}): Promise<{
  learnersBefore: number;
  learners: WorkingLearner[];
  createdDefaultLearner: boolean;
  adoptedLegacyKeys: number;
}> => {
  let learners: WorkingLearner[] = (await listKangurLearnersByOwner(input.owner.id)) as WorkingLearner[];
  const learnersBefore = learners.length;
  let createdDefaultLearner = false;
  let adoptedLegacyKeys = 0;

  if (learners.length === 0) {
    createdDefaultLearner = true;
    const seed = buildDefaultKangurLearnerSeed(input.owner);

    if (input.dryRun) {
      learners = [
        {
          id: `dry-run:${input.owner.id}`,
          ownerUserId: input.owner.id,
          displayName: seed.displayName,
          loginName: seed.preferredLoginName,
          status: 'active',
          legacyUserKey: seed.legacyUserKey,
          aiTutor: createDefaultKangurAiTutorLearnerMood(),
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          simulated: true,
        },
      ];
    } else {
      await ensureDefaultKangurLearnerForOwner({
        ownerUserId: input.owner.id,
        displayName: seed.displayName,
        preferredLoginName: seed.preferredLoginName,
        legacyUserKey: seed.legacyUserKey,
      });
      learners = await listKangurLearnersByOwner(input.owner.id);
    }
  }

  if (learners.length === 1) {
    const learner = learners[0]!;
    const adoptedLegacyUserKey = resolveAdoptedLegacyUserKey({
      learner,
      ownerEmail: input.owner.email,
      ownerUserId: input.owner.id,
      ownerLearnerCount: learners.length,
    });

    if (adoptedLegacyUserKey) {
      adoptedLegacyKeys += 1;
      if (input.dryRun || (learner as WorkingLearner).simulated) {
        learners = [
          {
            ...learner,
            legacyUserKey: adoptedLegacyUserKey,
          },
        ];
      } else {
        learners = [await setKangurLearnerLegacyUserKey(learner.id, adoptedLegacyUserKey)];
      }
    }
  }

  return {
    learnersBefore,
    learners: learners as WorkingLearner[],
    createdDefaultLearner,
    adoptedLegacyKeys,
  };
};

const migrateLearner = async (input: {
  owner: AuthOwner;
  ownerLearnerCount: number;
  learner: WorkingLearner;
  createdDefaultLearner: boolean;
  dryRun: boolean;
  appProvider: AppDbProvider;
  progressRepository: Awaited<ReturnType<typeof getKangurProgressRepository>>;
  assignmentRepository: Awaited<ReturnType<typeof getKangurAssignmentRepository>>;
}): Promise<LearnerMigrationReport> => {
  const notes: string[] = [];
  const candidateLegacyKeys =
    input.ownerLearnerCount === 1
      ? buildKangurMigrationLegacyKeys({
        learnerLegacyUserKey: input.learner.legacyUserKey,
        ownerEmail: input.owner.email,
        ownerUserId: input.owner.id,
      })
      : buildKangurMigrationLegacyKeys({
        learnerLegacyUserKey: input.learner.legacyUserKey,
      });

  if (candidateLegacyKeys.length === 0) {
    notes.push('No deterministic legacy key is available for this learner.');
  }

  const currentProgress = input.learner.simulated
    ? Promise.resolve(createDefaultKangurProgressState())
    : input.progressRepository.getProgress(input.learner.id);
  const currentAssignments = input.learner.simulated
    ? Promise.resolve([] as KangurAssignment[])
    : input.assignmentRepository.listAssignments({
      learnerKey: input.learner.id,
      includeArchived: true,
    });

  const [resolvedCurrentProgress, resolvedCurrentAssignments] = await Promise.all([
    currentProgress,
    currentAssignments,
  ]);
  const progressMatchedKeys: string[] = [];
  let progressSourceKey: string | null = null;
  let progressStatus: LearnerMigrationReport['progressStatus'] = 'unchanged';
  let progressSaved = false;

  if (isDefaultKangurProgressState(resolvedCurrentProgress)) {
    for (const candidateKey of candidateLegacyKeys) {
      const legacyProgress = await input.progressRepository.getProgress(candidateKey);
      if (!isDefaultKangurProgressState(legacyProgress)) {
        progressMatchedKeys.push(candidateKey);
        progressSourceKey ??= candidateKey;
        if (!input.dryRun && !input.learner.simulated && !progressSaved) {
          await input.progressRepository.saveProgress(input.learner.id, legacyProgress);
          progressSaved = true;
        }
      }
    }

    if (progressMatchedKeys.length > 0) {
      progressStatus = 'backfilled';
      if (progressMatchedKeys.length > 1) {
        notes.push('Multiple legacy progress keys contained data; the first match was used.');
      }
    } else if (candidateLegacyKeys.length === 0) {
      progressStatus = 'skipped';
    }
  }

  const legacyAssignmentsByKey: Array<{ sourceKey: string; assignments: KangurAssignment[] }> = [];
  for (const candidateKey of candidateLegacyKeys) {
    const assignments = await input.assignmentRepository.listAssignments({
      learnerKey: candidateKey,
      includeArchived: true,
    });
    if (assignments.length > 0) {
      legacyAssignmentsByKey.push({
        sourceKey: candidateKey,
        assignments,
      });
    }
  }

  const assignmentPlan = planKangurAssignmentCopies({
    targetLearnerId: input.learner.id,
    currentAssignments: resolvedCurrentAssignments,
    legacyAssignmentsByKey,
  });

  if (!input.dryRun && !input.learner.simulated) {
    for (const copy of assignmentPlan.copies) {
      await upsertAssignment(input.appProvider, copy.assignment);
    }
  }

  if (assignmentPlan.sourceKeys.length === 0 && candidateLegacyKeys.length === 0) {
    notes.push('Assignment migration skipped because this owner already has multiple learners.');
  }

  return {
    learnerId: input.learner.id,
    displayName: input.learner.displayName,
    simulated: Boolean(input.learner.simulated),
    createdDefaultLearner: input.createdDefaultLearner,
    legacyUserKey: input.learner.legacyUserKey ?? null,
    candidateLegacyKeys,
    progressStatus,
    progressSourceKey,
    progressMatchedKeys,
    assignmentCopies: assignmentPlan.copies.length,
    assignmentSkippedExistingIds: assignmentPlan.skippedExistingIds,
    assignmentSkippedDuplicateTargets: assignmentPlan.skippedDuplicateTargets,
    assignmentSourceKeys: assignmentPlan.sourceKeys,
    notes,
  };
};

const migrateScoresForOwner = async (input: {
  owner: AuthOwner;
  learners: WorkingLearner[];
  dryRun: boolean;
  appProvider: AppDbProvider;
  prismaLegacyScores: Map<string, PrismaScoreRow[]>;
}): Promise<ScoreMigrationReport> => {
  if (!input.owner.email) {
    return {
      status: 'skipped_no_owner_email',
      targetLearnerId: null,
      candidateCount: 0,
      updatedCount: 0,
      notes: ['Owner email is missing.'],
    };
  }

  const targetLearner = selectKangurScoreBackfillLearner({
    learners: input.learners,
    ownerEmail: input.owner.email,
    ownerUserId: input.owner.id,
  });

  const candidateCount =
    input.appProvider === 'prisma'
      ? (input.prismaLegacyScores.get(input.owner.email) ?? []).length
      : await countMongoLegacyScores(input.owner.email);

  if (!targetLearner) {
    return {
      status: candidateCount > 0 ? 'skipped_ambiguous' : 'unchanged',
      targetLearnerId: null,
      candidateCount,
      updatedCount: 0,
      notes:
        candidateCount > 0
          ? ['Legacy scores remain ambiguous because multiple learners exist for this owner.']
          : [],
    };
  }

  if (candidateCount === 0) {
    return {
      status: 'unchanged',
      targetLearnerId: targetLearner.id,
      candidateCount: 0,
      updatedCount: 0,
      notes: [],
    };
  }

  const updatedCount =
    input.appProvider === 'prisma'
      ? await backfillPrismaLegacyScores({
        rows: input.prismaLegacyScores.get(input.owner.email) ?? [],
        ownerUserId: input.owner.id,
        learnerId: targetLearner.id,
        dryRun: input.dryRun,
      })
      : await backfillMongoLegacyScores({
        ownerEmail: input.owner.email,
        ownerUserId: input.owner.id,
        learnerId: targetLearner.id,
        dryRun: input.dryRun,
      });

  return {
    status: 'backfilled',
    targetLearnerId: targetLearner.id,
    candidateCount,
    updatedCount,
    notes: [],
  };
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const ownerFilters = normalizeOwnerFilters(options.ownerFilters);
  const authProvider = await getAuthDataProvider();
  const appProvider = await getAppDbProvider();
  const owners = await listAuthOwners(authProvider, ownerFilters);
  const progressRepository = await getKangurProgressRepository();
  const assignmentRepository = await getKangurAssignmentRepository();
  const prismaLegacyScores =
    appProvider === 'prisma' ? await loadPrismaLegacyScores() : new Map<string, PrismaScoreRow[]>();

  const reports: OwnerMigrationReport[] = [];
  let createdDefaultLearners = 0;
  let adoptedLegacyKeys = 0;
  let progressBackfilled = 0;
  let assignmentCopies = 0;
  let scoreUpdates = 0;
  let ownersWithErrors = 0;

  for (const owner of owners) {
    const errors: string[] = [];

    try {
      const prepared = await prepareLearnersForOwner({
        owner,
        dryRun: options.dryRun,
      });

      createdDefaultLearners += prepared.createdDefaultLearner ? 1 : 0;
      adoptedLegacyKeys += prepared.adoptedLegacyKeys;

      const learnerReports: LearnerMigrationReport[] = [];
      for (const learner of prepared.learners) {
        const learnerReport = await migrateLearner({
          owner,
          ownerLearnerCount: prepared.learners.length,
          learner,
          createdDefaultLearner: prepared.createdDefaultLearner,
          dryRun: options.dryRun,
          appProvider,
          progressRepository,
          assignmentRepository,
        });
        learnerReports.push(learnerReport);
        if (learnerReport.progressStatus === 'backfilled') {
          progressBackfilled += 1;
        }
        assignmentCopies += learnerReport.assignmentCopies;
      }

      const scoreReport = await migrateScoresForOwner({
        owner,
        learners: prepared.learners,
        dryRun: options.dryRun,
        appProvider,
        prismaLegacyScores,
      });
      scoreUpdates += scoreReport.updatedCount;

      reports.push({
        ownerUserId: owner.id,
        ownerEmail: owner.email,
        ownerName: owner.name,
        learnersBefore: prepared.learnersBefore,
        learnersAfter: prepared.learners.length,
        createdDefaultLearner: prepared.createdDefaultLearner,
        learnerReports,
        scoreReport,
        errors,
      });
    } catch (error) {
      ownersWithErrors += 1;
      errors.push(error instanceof Error ? error.message : String(error));
      reports.push({
        ownerUserId: owner.id,
        ownerEmail: owner.email,
        ownerName: owner.name,
        learnersBefore: 0,
        learnersAfter: 0,
        createdDefaultLearner: false,
        learnerReports: [],
        scoreReport: {
          status: 'unchanged',
          targetLearnerId: null,
          candidateCount: 0,
          updatedCount: 0,
          notes: [],
        },
        errors,
      });
    }
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    authProvider,
    appProvider,
    ownerFilters,
    scannedOwners: owners.length,
    matchedOwners: owners.length,
    createdDefaultLearners,
    adoptedLegacyKeys,
    progressBackfilled,
    assignmentCopies,
    scoreUpdates,
    ownersWithErrors,
    reports,
  };
};

void run()
  .then(async (summary) => {
    console.log(JSON.stringify(summary, null, 2));
    await closeResources();
    if (summary.ownersWithErrors > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate Kangur learner ownership:', error);
    await closeResources();
    process.exit(1);
  });
