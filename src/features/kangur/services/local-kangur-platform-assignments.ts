import { z } from 'zod';
import {
  buildKangurAssignmentsPath,
  createKangurApiClient,
} from '@kangur/api-client';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@kangur/platform';

import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurAssignmentSnapshotSchema } from '@kangur/contracts';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';

import { KANGUR_ASSIGNMENTS_ENDPOINT } from './local-kangur-platform-endpoints';
import {
  createKangurClientFallback,
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const assignmentListSchema = z.array(kangurAssignmentSnapshotSchema);
const kangurAssignmentsApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

const buildAssignmentsUrl = (query?: KangurAssignmentListQuery): string =>
  buildKangurAssignmentsPath(query);

export const requestAssignmentsFromApi = async (
  query?: KangurAssignmentListQuery
): Promise<KangurAssignmentSnapshot[]> => {
  const url = buildAssignmentsUrl(query);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'assignments.list',
      description: 'Fetch assignment list from the Kangur API.',
      context: {
        endpoint: url,
        method: 'GET',
        includeArchived: query?.includeArchived ?? false,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurAssignmentsApiClient.listAssignments(query);
      const parsed = assignmentListSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur assignment list payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: [] as KangurAssignmentSnapshot[],
      shouldReport: (error) =>
        !isKangurAuthStatusError(error) && !isRecoverableKangurClientFetchError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (
          isKangurAuthStatusError(error) ||
          isRecoverableKangurClientFetchError(error)
        ) {
          return;
        }
        trackReadFailure('assignments.list', error, {
          endpoint: url,
          method: 'GET',
          includeArchived: query?.includeArchived ?? false,
        });
      },
    }
  );
};

export const createAssignmentViaApi = async (
  input: KangurAssignmentCreateInput
): Promise<KangurAssignmentSnapshot> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'assignments.create',
      description: 'Create a new assignment via the Kangur API.',
      context: {
        endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
        method: 'POST',
        targetType: input.target.type,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurAssignmentsApiClient.createAssignment(input);
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
    },
    {
      fallback: createKangurClientFallback('assignments.create'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('assignments.create', error, {
          endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
          method: 'POST',
          targetType: input.target.type,
        });
      },
    }
  );
};

export const updateAssignmentViaApi = async (
  id: string,
  input: KangurAssignmentUpdateInput
): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}`;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'assignments.update',
      description: 'Update an assignment via the Kangur API.',
      context: {
        endpoint,
        method: 'PATCH',
        assignmentId: id,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurAssignmentsApiClient.updateAssignment(id, input);
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
    },
    {
      fallback: createKangurClientFallback('assignments.update'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('assignments.update', error, {
          endpoint,
          method: 'PATCH',
          assignmentId: id,
        });
      },
    }
  );
};

export const reassignAssignmentViaApi = async (id: string): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}/reassign`;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'assignments.reassign',
      description: 'Reassign an assignment via the Kangur API.',
      context: {
        endpoint,
        method: 'POST',
        assignmentId: id,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurAssignmentsApiClient.reassignAssignment(id);
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
    },
    {
      fallback: createKangurClientFallback('assignments.reassign'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('assignments.reassign', error, {
          endpoint,
          method: 'POST',
          assignmentId: id,
        });
      },
    }
  );
};
