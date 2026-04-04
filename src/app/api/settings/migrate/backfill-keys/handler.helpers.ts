import { authError, forbiddenError } from '@/shared/errors/app-error';

import type { Filter } from 'mongodb';

type SettingsBackfillActor = {
  user?: {
    isElevated?: boolean | null;
    permissions?: string[] | null;
  } | null;
} | null;

type SettingsBackfillCandidate = {
  _id: string;
  key?: string | null;
};

export const assertCanManageSettingsBackfill = (session: SettingsBackfillActor): void => {
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
};

export const assertAutomaticBackfillAllowed = (
  allowAutomaticBackfill: boolean,
  manual: boolean | undefined
): void => {
  if (allowAutomaticBackfill || manual === true) return;
  throw forbiddenError(
    'Automatic backfill is disabled by Database Engine policy. Run backfill manually from Workflow Database -> Database Engine.'
  );
};

export const buildSettingsBackfillFilter = (): Filter<SettingsBackfillCandidate> => ({
  $and: [
    { _id: { $type: 'string' as const } },
    {
      $or: [{ key: { $exists: false } }, { key: null }, { key: '' }],
    },
  ],
});

export const buildBackfillDryRunResult = (input: {
  matched: number;
  sampleIds: string[];
}): {
  matched: number;
  modified: number;
  remaining: number;
  sampleIds: string[];
} => ({
  matched: input.matched,
  modified: 0,
  remaining: input.matched,
  sampleIds: input.sampleIds,
});

export const buildBackfillEmptyResult = (): {
  matched: number;
  modified: number;
  remaining: number;
} => ({
  matched: 0,
  modified: 0,
  remaining: 0,
});

export const buildBackfillUpdateResult = (input: {
  matched: number;
  modified: number;
  remaining: number;
}): {
  matched: number;
  modified: number;
  remaining: number;
} => ({
  matched: input.matched,
  modified: input.modified,
  remaining: input.remaining,
});
