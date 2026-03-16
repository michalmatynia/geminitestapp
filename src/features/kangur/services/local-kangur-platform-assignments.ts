import { z } from 'zod';

import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurAssignmentSnapshotSchema } from '@/features/kangur/shared/contracts/kangur';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';

import { KANGUR_ASSIGNMENTS_ENDPOINT } from './local-kangur-platform-endpoints';
import {
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const assignmentListSchema = z.array(kangurAssignmentSnapshotSchema);

const buildAssignmentsUrl = (query?: KangurAssignmentListQuery): string => {
  const search = new URLSearchParams();

  if (query?.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const serialized = search.toString();
  return serialized.length > 0
    ? `${KANGUR_ASSIGNMENTS_ENDPOINT}?${serialized}`
    : KANGUR_ASSIGNMENTS_ENDPOINT;
};

export const requestAssignmentsFromApi = async (
  query?: KangurAssignmentListQuery
): Promise<KangurAssignmentSnapshot[]> => {
  const url = buildAssignmentsUrl(query);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment list request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = assignmentListSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment list payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('assignments.list', error, {
      endpoint: url,
      method: 'GET',
      includeArchived: query?.includeArchived ?? false,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.list',
      method: 'GET',
      endpoint: url,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const createAssignmentViaApi = async (
  input: KangurAssignmentCreateInput
): Promise<KangurAssignmentSnapshot> => {
  try {
    const response = await fetch(KANGUR_ASSIGNMENTS_ENDPOINT, {
      method: 'POST',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment create request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment create payload validation failed.');
    }

    trackWriteSuccess('assignments.create', {
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      method: 'POST',
      assignmentId: parsed.data.id,
      targetType: parsed.data.target.type,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.create', error, {
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      method: 'POST',
      targetType: input.target.type,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.create',
      method: 'POST',
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      targetType: input.target.type,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const updateAssignmentViaApi = async (
  id: string,
  input: KangurAssignmentUpdateInput
): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment update request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment update payload validation failed.');
    }

    trackWriteSuccess('assignments.update', {
      endpoint,
      method: 'PATCH',
      assignmentId: parsed.data.id,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.update', error, {
      endpoint,
      method: 'PATCH',
      assignmentId: id,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.update',
      method: 'PATCH',
      endpoint,
      assignmentId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const reassignAssignmentViaApi = async (id: string): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}/reassign`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment reassign request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment reassign payload validation failed.');
    }

    trackWriteSuccess('assignments.reassign', {
      endpoint,
      method: 'POST',
      assignmentId: parsed.data.id,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.reassign', error, {
      endpoint,
      method: 'POST',
      assignmentId: id,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.reassign',
      method: 'POST',
      endpoint,
      assignmentId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};
