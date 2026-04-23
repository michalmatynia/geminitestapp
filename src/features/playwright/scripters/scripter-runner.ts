import type { PageDriver } from './page-driver';
import { createRateLimiter, type RateLimiter } from './rate-limiter';
import type { ScripterDefinition, ScripterExtractionStep } from './types';

export type ScripterRunStepTelemetry = {
  stepId: string;
  kind: ScripterExtractionStep['kind'];
  startedAt: number;
  durationMs: number;
  recordsAdded: number;
  error: string | null;
  iteration?: number;
};

export type ScripterRunResult = {
  records: Array<Record<string, unknown>>;
  telemetry: ScripterRunStepTelemetry[];
  errors: Array<{ stepId: string; message: string }>;
  visitedUrls: string[];
};

export type RunScripterOptions = {
  entryUrl?: string;
  signal?: AbortSignal;
  now?: () => number;
  rateLimiter?: RateLimiter;
};

const filterJsonLd = (items: unknown[], filterType: string | undefined): unknown[] => {
  const flat: unknown[] = [];
  for (const item of items) {
    if (!item) continue;
    if (Array.isArray(item)) {
      for (const child of item) flat.push(child);
      continue;
    }
    if (typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const graph = record['@graph'];
      if (Array.isArray(graph)) {
        for (const child of graph) flat.push(child);
        continue;
      }
      flat.push(record);
    }
  }
  if (!filterType) return flat;
  return flat.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const type = (item as Record<string, unknown>)['@type'];
    if (Array.isArray(type)) return type.includes(filterType);
    return type === filterType;
  });
};

const addQueryParam = (url: string, key: string, value: string): string => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
};

const checkAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted) throw new Error('Scripter run aborted');
};

type RerunnableStep = Extract<ScripterExtractionStep, { kind: 'extractJsonLd' | 'extractList' }>;

const isRerunnable = (step: ScripterExtractionStep): step is RerunnableStep =>
  step.kind === 'extractJsonLd' || step.kind === 'extractList';

export const runScripter = async (
  definition: ScripterDefinition,
  driver: PageDriver,
  options: RunScripterOptions = {}
): Promise<ScripterRunResult> => {
  const now = options.now ?? Date.now;
  const records: Array<Record<string, unknown>> = [];
  const telemetry: ScripterRunStepTelemetry[] = [];
  const errors: Array<{ stepId: string; message: string }> = [];
  const visited: string[] = [];
  const rerunHistory: RerunnableStep[] = [];

  const runExtraction = async (
    step: RerunnableStep,
    iteration?: number
  ): Promise<ScripterRunStepTelemetry> => {
    const startedAt = now();
    let recordsAdded = 0;
    let error: string | null = null;
    try {
      if (step.kind === 'extractJsonLd') {
        const items = await driver.extractJsonLd();
        const filtered = filterJsonLd(items, step.filterType);
        for (const item of filtered) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            records.push(item as Record<string, unknown>);
            recordsAdded += 1;
          }
        }
      } else {
        const rows = await driver.extractList(step.itemSelector, step.fields);
        for (const row of rows) {
          records.push({ ...row });
          recordsAdded += 1;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      errors.push({ stepId: step.id, message: error });
    }
    const entry: ScripterRunStepTelemetry = {
      stepId: step.id,
      kind: step.kind,
      startedAt,
      durationMs: now() - startedAt,
      recordsAdded,
      error,
    };
    if (iteration !== undefined) entry.iteration = iteration;
    telemetry.push(entry);
    return entry;
  };

  const entryUrl = options.entryUrl ?? definition.entryUrl;
  const rateLimiter =
    options.rateLimiter ??
    (definition.rateLimit
      ? createRateLimiter({ requestsPerMinute: definition.rateLimit.requestsPerMinute })
      : undefined);
  const gate = async (): Promise<void> => {
    if (rateLimiter) await rateLimiter.wait();
  };

  for (const step of definition.steps) {
    const startedAt = now();
    let recordsAdded = 0;
    let error: string | null = null;

    try {
      checkAborted(options.signal);
      switch (step.kind) {
        case 'goto': {
          const url = step.url || entryUrl;
          const opts = step.waitUntil ? { waitUntil: step.waitUntil } : undefined;
          await gate();
          await driver.goto(url, opts);
          visited.push(await driver.currentUrl());
          break;
        }
        case 'dismissConsent': {
          await driver.tryClick(step.selectors);
          break;
        }
        case 'waitFor': {
          const waitOpts: Parameters<PageDriver['waitFor']>[0] = {};
          if (step.selector) waitOpts.selector = step.selector;
          if (step.timeoutMs !== undefined) waitOpts.timeoutMs = step.timeoutMs;
          if (step.state) waitOpts.state = step.state;
          await driver.waitFor(waitOpts);
          break;
        }
        case 'extractJsonLd':
        case 'extractList': {
          rerunHistory.push(step);
          const entry = await runExtraction(step);
          recordsAdded = entry.recordsAdded;
          error = entry.error;
          continue;
        }
        case 'paginate': {
          const maxPages = step.maxPages ?? 5;
          for (let i = 1; i <= maxPages; i += 1) {
            checkAborted(options.signal);
            let advanced = false;
            if (step.strategy === 'nextLink') {
              if (!step.nextSelector) throw new Error('paginate.nextLink requires nextSelector');
              await gate();
              const clicked = await driver.tryClick([step.nextSelector]);
              advanced = clicked !== null;
            } else if (step.strategy === 'queryParam') {
              if (!step.queryParam) throw new Error('paginate.queryParam requires queryParam');
              const currentUrl = await driver.currentUrl();
              const nextUrl = addQueryParam(currentUrl, step.queryParam, String(i + 1));
              if (nextUrl === currentUrl) {
                advanced = false;
              } else {
                await gate();
                await driver.goto(nextUrl);
                advanced = true;
              }
            } else {
              await driver.scrollToBottom();
              advanced = true;
            }
            if (!advanced) break;
            visited.push(await driver.currentUrl());
            for (const prior of rerunHistory) {
              if (!isRerunnable(prior)) continue;
              const entry = await runExtraction(prior, i);
              recordsAdded += entry.recordsAdded;
            }
          }
          break;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      errors.push({ stepId: step.id, message: error });
    }

    telemetry.push({
      stepId: step.id,
      kind: step.kind,
      startedAt,
      durationMs: now() - startedAt,
      recordsAdded,
      error,
    });
  }

  return { records, telemetry, errors, visitedUrls: visited };
};
