import { NextResponse } from 'next/server';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import {
  isPlaywrightAiPathsFixtureTriggerButton,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
  shouldIncludePlaywrightAiPathsFixtureButtons,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  buildCanonicalTriggerButtonDisplay,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';

type TriggerButtonsQuery = Partial<Record<typeof PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM, boolean>>;

export const buildEmptyTriggerButtonsResponse = (): Response =>
  NextResponse.json([], {
    headers: {
      'Cache-Control': 'no-store',
    },
  });

export const resolveUnauthorizedTriggerButtonsResponse = (error: unknown): Response | null => {
  if (
    isAppError(error) &&
    (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
  ) {
    return buildEmptyTriggerButtonsResponse();
  }
  return null;
};

export const parseStoredTriggerButtonsSafely = (
  raw: string | null
): AiTriggerButtonRecord[] | null => {
  try {
    return parseAiTriggerButtonsRaw(raw);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const shouldIncludeFixtureButtonsForRequest = (
  fixtureCookieValue: string | null,
  query: TriggerButtonsQuery
): boolean =>
  shouldIncludePlaywrightAiPathsFixtureButtons(fixtureCookieValue) ||
  query[PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM] === true;

export const filterPlaywrightFixtureButtons = (
  buttons: AiTriggerButtonRecord[],
  includeFixtureButtons: boolean
): AiTriggerButtonRecord[] =>
  includeFixtureButtons
    ? buttons
    : buttons.filter((button) => !isPlaywrightAiPathsFixtureTriggerButton(button));

export const filterButtonsWithExistingPathsSafely = async (
  buttons: AiTriggerButtonRecord[],
  filterButtonsWithExistingPaths: (
    input: AiTriggerButtonRecord[]
  ) => Promise<AiTriggerButtonRecord[]>
): Promise<AiTriggerButtonRecord[]> => {
  try {
    return await filterButtonsWithExistingPaths(buttons);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return buttons;
  }
};

export const resolveCreateTriggerButtonName = (name: string): string => {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Name is required.');
  }
  return normalizedName;
};

export const createTriggerButtonId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `trigger_${Math.random().toString(36).slice(2, 10)}`;

export const getNextTriggerButtonSortIndex = (existing: AiTriggerButtonRecord[]): number =>
  existing.reduce((max, record) => Math.max(max, record.sortIndex ?? 0), -1) + 1;

export const buildCreatedTriggerButtonRecord = (input: {
  existing: AiTriggerButtonRecord[];
  name: string;
  iconId: string | null | undefined;
  pathId: string | null | undefined;
  enabled: boolean | undefined;
  locations: AiTriggerButtonRecord['locations'];
  mode: AiTriggerButtonRecord['mode'];
  display: unknown;
  now: string;
}): AiTriggerButtonRecord => {
  const normalizedName = resolveCreateTriggerButtonName(input.name);

  return {
    id: createTriggerButtonId(),
    name: normalizedName,
    iconId: input.iconId ? input.iconId.trim() : null,
    pathId: input.pathId ? input.pathId.trim() : null,
    enabled: input.enabled ?? true,
    locations: input.locations,
    mode: input.mode,
    display: buildCanonicalTriggerButtonDisplay(
      normalizedName,
      typeof input.display === 'string' ? input.display : undefined
    ),
    createdAt: input.now,
    updatedAt: input.now,
    sortIndex: getNextTriggerButtonSortIndex(input.existing),
  };
};
