import { type NextRequest, NextResponse } from 'next/server';

import { resolveAiPathsContextRegistryEnvelope } from '@/features/ai/ai-paths/context-registry/server';
import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server/access';
import {
  createAiPathNodePlaywrightInstance,
  enqueuePlaywrightEngineRun,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { aiPathsPlaywrightEnqueueRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

type CapturePayload = {
  screenshot?: boolean;
  html?: boolean;
  video?: boolean;
  trace?: boolean;
};

const normalizeCaptureConfig = (
  capture:
    | {
        screenshot?: boolean;
        html?: boolean;
        video?: boolean;
        trace?: boolean;
      }
    | undefined
): CapturePayload | undefined => {
  if (capture === undefined) return undefined;
  const normalized: CapturePayload = {};
  if (typeof capture.screenshot === 'boolean') normalized.screenshot = capture.screenshot;
  if (typeof capture.html === 'boolean') normalized.html = capture.html;
  if (typeof capture.video === 'boolean') normalized.video = capture.video;
  if (typeof capture.trace === 'boolean') normalized.trace = capture.trace;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const toPublicRun = (
  run: PlaywrightEngineRunRecord
): Omit<PlaywrightEngineRunRecord, 'ownerUserId'> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { ownerUserId: _unused, ...rest } = run;
  return rest;
};

export async function postPlaywrightHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'playwright-enqueue');
  }

  const parsed = await parseJsonBody(req, aiPathsPlaywrightEnqueueRequestSchema, {
    logPrefix: 'ai-paths.playwright.enqueue',
  });
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const startUrl = payload.startUrl?.trim();
  const personaId = payload.personaId?.trim();
  const capture = normalizeCaptureConfig(payload.capture);
  const contextRegistry = await resolveAiPathsContextRegistryEnvelope(payload.contextRegistry);
  const run = await enqueuePlaywrightEngineRun({
    request: {
      script: payload.script,
      ...(payload.input !== undefined ? { input: payload.input } : {}),
      ...(typeof startUrl === 'string' && startUrl.length > 0 ? { startUrl } : {}),
      ...(payload.timeoutMs !== undefined ? { timeoutMs: payload.timeoutMs } : {}),
      ...(payload.browserEngine !== undefined ? { browserEngine: payload.browserEngine } : {}),
      ...(typeof personaId === 'string' && personaId.length > 0 ? { personaId } : {}),
      ...(payload.settingsOverrides !== undefined ? { settingsOverrides: payload.settingsOverrides } : {}),
      ...(payload.launchOptions !== undefined ? { launchOptions: payload.launchOptions } : {}),
      ...(payload.contextOptions !== undefined ? { contextOptions: payload.contextOptions } : {}),
      ...(contextRegistry !== null ? { contextRegistry } : {}),
      ...(capture !== undefined ? { capture } : {}),
    },
    waitForResult: payload.waitForResult ?? true,
    ownerUserId: isInternal ? 'system' : access.userId,
    instance: createAiPathNodePlaywrightInstance(),
  });

  return NextResponse.json({ run: toPublicRun(run) });
}
