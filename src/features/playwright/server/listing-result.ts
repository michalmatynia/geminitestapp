import 'server-only';

import type {
  BrowserListingResultDto,
  PlaywrightRelistBrowserMode,
} from '@/shared/contracts/playwright-listing-runtime';

import type { PlaywrightListingResult } from './programmable';

const toOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toOptionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export type BuildPlaywrightListingResultInput<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> = {
  externalListingId: string | null;
  listingUrl?: string | null;
  completedAt?: string | null;
  simulated?: boolean;
  metadata?: TMetadata;
};

export const buildPlaywrightListingResult = <
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  input: BuildPlaywrightListingResultInput<TMetadata>
): BrowserListingResultDto => ({
  externalListingId: input.externalListingId,
  ...(Object.prototype.hasOwnProperty.call(input, 'listingUrl')
    ? { listingUrl: input.listingUrl ?? undefined }
    : {}),
  ...(Object.prototype.hasOwnProperty.call(input, 'completedAt')
    ? { completedAt: input.completedAt ?? undefined }
    : {}),
  ...(typeof input.simulated === 'boolean' ? { simulated: input.simulated } : {}),
  ...(input.metadata ? { metadata: input.metadata } : {}),
});

export const buildPlaywrightScriptListingMetadata = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>({
  result,
  requestedBrowserMode,
  additional,
}: {
  result: Pick<
    PlaywrightListingResult,
    | 'runId'
    | 'effectiveBrowserMode'
    | 'personaId'
    | 'executionSettings'
    | 'rawResult'
    | 'publishVerified'
  >;
  requestedBrowserMode: PlaywrightRelistBrowserMode;
  additional?: TAdditional;
}): Record<string, unknown> => {
  const duplicateMatchStrategy = toOptionalString(result.rawResult['duplicateMatchStrategy']);
  return {
    runId: result.runId,
    requestedBrowserMode,
    browserMode: result.effectiveBrowserMode,
    ...(result.personaId !== undefined
      ? {
          playwrightPersonaId: result.personaId,
        }
      : {}),
    ...(result.executionSettings
      ? {
          playwrightSettings: result.executionSettings,
        }
      : {}),
    rawResult: result.rawResult,
    latestStage: toOptionalString(result.rawResult['stage']),
    latestStageUrl: toOptionalString(result.rawResult['currentUrl']),
    duplicateLinked:
      result.rawResult['duplicateLinked'] === true || (duplicateMatchStrategy ? true : null),
    duplicateMatchStrategy,
    duplicateMatchedProductId: toOptionalString(result.rawResult['duplicateMatchedProductId']),
    duplicateCandidateCount: toOptionalNumber(result.rawResult['duplicateCandidateCount']),
    duplicateSearchTitle: toOptionalString(result.rawResult['duplicateSearchTitle']),
    duplicateIgnoredNonExactCandidateCount: toOptionalNumber(
      result.rawResult['duplicateIgnoredNonExactCandidateCount']
    ),
    duplicateIgnoredCandidateTitles: Array.isArray(result.rawResult['duplicateIgnoredCandidateTitles'])
      ? result.rawResult['duplicateIgnoredCandidateTitles']
          .filter((value): value is string => typeof value === 'string')
          .slice(0, 5)
      : [],
    publishVerified: result.publishVerified,
    ...(additional ?? {}),
  };
};
