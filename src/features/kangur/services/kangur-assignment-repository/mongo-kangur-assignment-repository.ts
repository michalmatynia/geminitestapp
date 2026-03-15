import 'server-only';

import { randomUUID } from 'crypto';

import { type Filter } from 'mongodb';

import type {
  KangurAssignment,
  KangurAssignmentRepositoryCreateInput,
  KangurAssignmentUpdateInput,
} from '@/shared/contracts/kangur';
import { kangurAssignmentSchema } from '@/shared/contracts/kangur';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { executeMongoWriteWithRetry } from '@/shared/lib/db/mongo-write-retry';

import type { KangurAssignmentListInput, KangurAssignmentRepository } from './types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const SETTINGS_COLLECTION = 'settings';
const KANGUR_ASSIGNMENT_SETTING_PREFIX = 'kangur_assignment:';

type MongoAssignmentSettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
};

const toLearnerPrefix = (learnerKey: string): string =>
  `${KANGUR_ASSIGNMENT_SETTING_PREFIX}${encodeURIComponent(learnerKey.trim().toLowerCase())}:`;

const toSettingKey = (learnerKey: string, assignmentId: string): string =>
  `${toLearnerPrefix(learnerKey)}${assignmentId.trim()}`;

const parseAssignmentValue = (value: string | undefined): KangurAssignment | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const result = kangurAssignmentSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const sortAssignmentsDesc = (assignments: KangurAssignment[]): KangurAssignment[] =>
  [...assignments].sort((left, right) => {
    const updatedDelta = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });

export const mongoKangurAssignmentRepository: KangurAssignmentRepository = {
  async createAssignment(input: KangurAssignmentRepositoryCreateInput): Promise<KangurAssignment> {
    const db = await getMongoDb();
    const now = new Date().toISOString();
    const learnerKey = input.learnerKey.trim().toLowerCase();
    const assignmentId = randomUUID();
    const timeLimitMinutes = input.timeLimitMinutes ?? null;
    const hasTimeLimit =
      typeof timeLimitMinutes === 'number' &&
      Number.isFinite(timeLimitMinutes) &&
      timeLimitMinutes > 0;
    const persistedAssignment: KangurAssignment = {
      id: assignmentId,
      learnerKey,
      title: input.title,
      description: input.description,
      priority: input.priority,
      archived: input.archived ?? false,
      timeLimitMinutes,
      timeLimitStartsAt: hasTimeLimit ? now : null,
      target: input.target,
      assignedByName: input.assignedByName ?? null,
      assignedByEmail: input.assignedByEmail ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const settingKey = toSettingKey(learnerKey, assignmentId);

    await executeMongoWriteWithRetry(async () => {
      await db.collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<MongoAssignmentSettingDocument>,
        {
          $set: {
            _id: settingKey,
            key: settingKey,
            value: JSON.stringify(persistedAssignment),
          },
        },
        {
          upsert: true,
        }
      );
    });

    return persistedAssignment;
  },

  async getAssignment(learnerKey: string, assignmentId: string): Promise<KangurAssignment | null> {
    const db = await getMongoDb();
    const row = await db.collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION).findOne({
      $or: [
        { key: toSettingKey(learnerKey, assignmentId) },
        { _id: toSettingKey(learnerKey, assignmentId) },
      ],
    } as Filter<MongoAssignmentSettingDocument>);

    return parseAssignmentValue(row?.value);
  },

  async listAssignments(input: KangurAssignmentListInput): Promise<KangurAssignment[]> {
    const db = await getMongoDb();
    const prefix = toLearnerPrefix(input.learnerKey);
    const rows = await db
      .collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION)
      .find({
        key: {
          $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        },
      } as Filter<MongoAssignmentSettingDocument>)
      .toArray();

    const assignments = rows
      .map((row) => parseAssignmentValue(row.value))
      .filter((assignment): assignment is KangurAssignment => assignment !== null);

    return sortAssignmentsDesc(
      assignments.filter((assignment) => input.includeArchived || !assignment.archived)
    );
  },

  async updateAssignment(
    learnerKey: string,
    assignmentId: string,
    input: KangurAssignmentUpdateInput
  ): Promise<KangurAssignment> {
    const db = await getMongoDb();
    const now = new Date().toISOString();
    const settingKey = toSettingKey(learnerKey, assignmentId);
    const current = await db
      .collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION)
      .findOne({
        $or: [{ key: settingKey }, { _id: settingKey }],
      } as Filter<MongoAssignmentSettingDocument>);
    const parsed = parseAssignmentValue(current?.value);

    if (!parsed) {
      throw notFoundError('Assignment not found.');
    }

    const timeLimitPatch: Partial<KangurAssignment> = {};
    if (input.timeLimitMinutes !== undefined) {
      if (input.timeLimitMinutes === null) {
        timeLimitPatch.timeLimitMinutes = null;
        timeLimitPatch.timeLimitStartsAt = null;
      } else {
        const hasChanged = parsed.timeLimitMinutes !== input.timeLimitMinutes;
        timeLimitPatch.timeLimitMinutes = input.timeLimitMinutes;
        timeLimitPatch.timeLimitStartsAt =
          hasChanged || !parsed.timeLimitStartsAt ? now : parsed.timeLimitStartsAt;
      }
    }

    const nextAssignment: KangurAssignment = {
      ...parsed,
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...timeLimitPatch,
      updatedAt: now,
    };

    await executeMongoWriteWithRetry(async () => {
      await db.collection<MongoAssignmentSettingDocument>(SETTINGS_COLLECTION).updateOne(
        {
          $or: [{ key: settingKey }, { _id: settingKey }],
        } as Filter<MongoAssignmentSettingDocument>,
        {
          $set: {
            _id: settingKey,
            key: settingKey,
            value: JSON.stringify(nextAssignment),
          },
        }
      );
    });

    return nextAssignment;
  },
};
