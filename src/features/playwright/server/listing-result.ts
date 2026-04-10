import 'server-only';

import type {
  BrowserListingResultDto,
  PlaywrightRelistBrowserMode,
} from '@/shared/contracts/integrations/listings';

import type { PlaywrightListingResult } from './programmable';

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
}): Record<string, unknown> => ({
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
  latestStage:
    typeof result.rawResult['stage'] === 'string' ? result.rawResult['stage'] : null,
  latestStageUrl:
    typeof result.rawResult['currentUrl'] === 'string' ? result.rawResult['currentUrl'] : null,
  publishVerified: result.publishVerified,
  ...(additional ?? {}),
});
