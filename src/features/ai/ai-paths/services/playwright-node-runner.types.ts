import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio/base';
import type { PlaywrightActionRunRequestSummary } from '@/shared/contracts/playwright-action-runs';
import type { BrowserContextOptions, LaunchOptions } from 'playwright';

export type PlaywrightNodeRunArtifact = {
  name: string;
  path: string;
  mimeType?: string | null;
  kind?: string | null;
};

export type PlaywrightNodeRunInstanceKind =
  | 'ai_path_node'
  | 'programmable_listing'
  | 'programmable_import'
  | 'tradera_standard_listing'
  | 'tradera_scripted_listing'
  | 'tradera_parameter_mapper_catalog_scrape'
  | 'tradera_category_scrape'
  | 'tradera_listing_status_scrape'
  | 'vinted_browser_listing'
  | 'social_capture_single'
  | 'social_capture_batch'
  | 'custom';

export type PlaywrightNodeRunInstanceFamily =
  | 'ai_path'
  | 'listing'
  | 'scrape'
  | 'capture'
  | 'custom';

export type PlaywrightNodeRunInstance = {
  kind: PlaywrightNodeRunInstanceKind;
  family?: PlaywrightNodeRunInstanceFamily | null;
  label?: string | null;
  connectionId?: string | null;
  integrationId?: string | null;
  listingId?: string | null;
  nodeId?: string | null;
  tags?: string[] | null;
};

export type PlaywrightNodeRunRecord = {
  runId: string;
  ownerUserId: string | null;
  status: ImageStudioRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string | null;
  instance?: PlaywrightNodeRunInstance | null;
  requestSummary?: PlaywrightActionRunRequestSummary | null;
  artifacts: PlaywrightNodeRunArtifact[];
  logs: string[];
};

type PlaywrightNodeRunRequestBase = {
  input?: Record<string, unknown> | undefined;
  startUrl?: string | undefined;
  actionId?: string | null | undefined;
  actionName?: string | null | undefined;
  selectorProfile?: string | null | undefined;
  timeoutMs?: number | undefined;
  failureHoldOpenMs?: number | undefined;
  browserEngine?: 'chromium' | 'firefox' | 'webkit' | undefined;
  personaId?: string | undefined;
  settingsOverrides?: Record<string, unknown> | undefined;
  launchOptions?: LaunchOptions | undefined;
  contextOptions?: BrowserContextOptions | undefined;
  policyAllowedHosts?: string[] | undefined;
  contextRegistry?: ContextRegistryConsumerEnvelope | null | undefined;
  capture?:
    | {
        screenshot?: boolean | undefined;
        html?: boolean | undefined;
        video?: boolean | undefined;
        trace?: boolean | undefined;
      }
    | undefined;
  /** When true, block scripts from opening additional browser pages/tabs. */
  preventNewPages?: boolean | undefined;
};

export type PlaywrightNodeScriptRunRequest = PlaywrightNodeRunRequestBase & {
  script: string;
  runtimeKey?: null | undefined;
};

export type PlaywrightNodeRuntimeRunRequest = PlaywrightNodeRunRequestBase & {
  script?: undefined;
  runtimeKey: string;
};

export type PlaywrightNodeRunRequest =
  | PlaywrightNodeScriptRunRequest
  | PlaywrightNodeRuntimeRunRequest;

export const isPlaywrightNodeRuntimeRunRequest = (
  request: PlaywrightNodeRunRequest
): request is PlaywrightNodeRuntimeRunRequest => typeof request.runtimeKey === 'string';

export type PlaywrightNodeArtifactReadResult = {
  artifact: PlaywrightNodeRunArtifact;
  content: Buffer;
};
