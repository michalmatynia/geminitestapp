import { z } from 'zod';

import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurAssignmentSnapshotSchema } from '@/features/kangur/shared/contracts/kangur';
import { withKangurClientError } from '@/features/kangur/observability/client';

import { KANGUR_ASSIGNMENTS_ENDPOINT } from './local-kangur-platform-endpoints';
import {
  createKangurClientFallback,
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
    },
    {
      fallback: [] as KangurAssignmentSnapshot[],
      shouldReport: (error) => !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
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
