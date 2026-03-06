import { z } from 'zod';

import {
  kangurProgressStateSchema,
  kangurScoreCreateInputSchema,
  kangurScoreListQuerySchema,
  kangurScoreSortFieldSchema,
  type KangurProgressState,
  type KangurScoreCreateInput,
  type KangurScoreListQuery,
  type KangurScoreSortField,
} from '@/shared/contracts/kangur';
import { validationError } from '@/shared/errors/app-error';

const normalizeSortField = (value: string): KangurScoreSortField => {
  const parsed = kangurScoreSortFieldSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return 'created_date';
};

export const normalizeKangurSort = (
  sort?: string
): `-${KangurScoreSortField}` | KangurScoreSortField => {
  if (!sort || sort.trim().length === 0) {
    return '-created_date';
  }

  const normalized = sort.trim();
  const isDescending = normalized.startsWith('-');
  const rawField = isDescending ? normalized.slice(1) : normalized;
  const field = normalizeSortField(rawField);

  return isDescending ? `-${field}` : field;
};

const extractValidationIssues = (error: z.ZodError): Record<string, unknown> =>
  error.flatten() as unknown as Record<string, unknown>;

export const parseKangurScoreCreatePayload = (payload: unknown): KangurScoreCreateInput => {
  const parsed = kangurScoreCreateInputSchema.safeParse(payload);
  if (!parsed.success) {
    throw validationError('Invalid Kangur score payload.', {
      issues: extractValidationIssues(parsed.error),
    });
  }
  return parsed.data;
};

export const parseKangurProgressUpdatePayload = (payload: unknown): KangurProgressState => {
  const parsed = kangurProgressStateSchema.safeParse(payload);
  if (!parsed.success) {
    throw validationError('Invalid Kangur progress payload.', {
      issues: extractValidationIssues(parsed.error),
    });
  }
  return parsed.data;
};

export const parseKangurScoreListQuery = (
  payload: Record<string, string | undefined>
): KangurScoreListQuery => {
  const parsed = kangurScoreListQuerySchema.safeParse({
    sort: payload['sort'],
    limit: payload['limit'] ? Number(payload['limit']) : undefined,
    player_name: payload['player_name'],
    operation: payload['operation'],
    created_by: payload['created_by'],
  });

  if (!parsed.success) {
    throw validationError('Invalid Kangur score query.', {
      issues: extractValidationIssues(parsed.error),
    });
  }

  return {
    ...parsed.data,
    sort: normalizeKangurSort(parsed.data.sort),
  };
};
