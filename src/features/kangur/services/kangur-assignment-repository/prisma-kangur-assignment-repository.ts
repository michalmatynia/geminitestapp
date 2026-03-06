import 'server-only';

import { randomUUID } from 'crypto';

import prisma from '@/shared/lib/db/prisma';
import {
  kangurAssignmentSchema,
  type KangurAssignment,
  type KangurAssignmentRepositoryCreateInput,
  type KangurAssignmentUpdateInput,
} from '@/shared/contracts/kangur';
import { notFoundError } from '@/shared/errors/app-error';

import type { KangurAssignmentListInput, KangurAssignmentRepository } from './types';

const KANGUR_ASSIGNMENT_SETTING_PREFIX = 'kangur_assignment:';

type PrismaAssignmentSettingRow = {
  key: string;
  value: string;
};

const toLearnerPrefix = (learnerKey: string): string =>
  `${KANGUR_ASSIGNMENT_SETTING_PREFIX}${encodeURIComponent(learnerKey.trim().toLowerCase())}:`;

const toSettingKey = (learnerKey: string, assignmentId: string): string =>
  `${toLearnerPrefix(learnerKey)}${assignmentId.trim()}`;

const parseAssignmentRow = (row: PrismaAssignmentSettingRow | null): KangurAssignment | null => {
  if (!row?.value) {
    return null;
  }

  try {
    const parsedJson = JSON.parse(row.value) as unknown;
    const parsedAssignment = kangurAssignmentSchema.safeParse(parsedJson);
    return parsedAssignment.success ? parsedAssignment.data : null;
  } catch {
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

export const prismaKangurAssignmentRepository: KangurAssignmentRepository = {
  async createAssignment(input: KangurAssignmentRepositoryCreateInput): Promise<KangurAssignment> {
    const learnerKey = input.learnerKey.trim().toLowerCase();
    const assignmentId = randomUUID();
    const now = new Date().toISOString();
    const assignment: KangurAssignment = {
      id: assignmentId,
      learnerKey,
      title: input.title,
      description: input.description,
      priority: input.priority,
      archived: input.archived ?? false,
      target: input.target,
      assignedByName: input.assignedByName ?? null,
      assignedByEmail: input.assignedByEmail ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await prisma.setting.upsert({
      where: {
        key: toSettingKey(learnerKey, assignmentId),
      },
      update: {
        value: JSON.stringify(assignment),
      },
      create: {
        key: toSettingKey(learnerKey, assignmentId),
        value: JSON.stringify(assignment),
      },
    });

    return assignment;
  },

  async getAssignment(learnerKey: string, assignmentId: string): Promise<KangurAssignment | null> {
    const row = (await prisma.setting.findUnique({
      where: {
        key: toSettingKey(learnerKey, assignmentId),
      },
      select: {
        key: true,
        value: true,
      },
    })) as PrismaAssignmentSettingRow | null;

    return parseAssignmentRow(row);
  },

  async listAssignments(input: KangurAssignmentListInput): Promise<KangurAssignment[]> {
    const rows = (await prisma.setting.findMany({
      where: {
        key: {
          startsWith: toLearnerPrefix(input.learnerKey),
        },
      },
      select: {
        key: true,
        value: true,
      },
    })) as PrismaAssignmentSettingRow[];

    const assignments = rows
      .map((row) => parseAssignmentRow(row))
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
    const settingKey = toSettingKey(learnerKey, assignmentId);
    const current = (await prisma.setting.findUnique({
      where: {
        key: settingKey,
      },
      select: {
        key: true,
        value: true,
      },
    })) as PrismaAssignmentSettingRow | null;

    const parsed = parseAssignmentRow(current);
    if (!parsed) {
      throw notFoundError('Assignment not found.');
    }

    const nextAssignment: KangurAssignment = {
      ...parsed,
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      updatedAt: new Date().toISOString(),
    };

    await prisma.setting.update({
      where: {
        key: settingKey,
      },
      data: {
        value: JSON.stringify(nextAssignment),
      },
    });

    return nextAssignment;
  },
};
