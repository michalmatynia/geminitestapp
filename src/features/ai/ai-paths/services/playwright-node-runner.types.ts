import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio/image-studio/base';

export type PlaywrightNodeRunArtifact = {
  name: string;
  path: string;
  mimeType?: string | null;
  kind?: string | null;
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
  artifacts: PlaywrightNodeRunArtifact[];
  logs: string[];
};

export type PlaywrightNodeRunRequest = {
  script: string;
  input?: Record<string, unknown> | undefined;
  startUrl?: string | undefined;
  timeoutMs?: number | undefined;
  browserEngine?: 'chromium' | 'firefox' | 'webkit' | undefined;
  personaId?: string | undefined;
  settingsOverrides?: Record<string, unknown> | undefined;
  launchOptions?: Record<string, unknown> | undefined;
  contextOptions?: Record<string, unknown> | undefined;
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

export type PlaywrightNodeArtifactReadResult = {
  artifact: PlaywrightNodeRunArtifact;
  content: Buffer;
};

