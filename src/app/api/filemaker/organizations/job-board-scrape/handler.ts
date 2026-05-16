import { type NextRequest } from 'next/server';

import type { FilemakerJobBoardScrapeLiveEvent } from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import {
  enqueueFilemakerJobBoardScrapeRun,
  readFilemakerJobBoardScrapeRun,
} from '@/features/filemaker/server/filemaker-job-board-scrape-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { safeSetTimeout } from '@/shared/lib/timers';

const readOptionalJsonBody = async (req: NextRequest): Promise<unknown> => {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return {};
  try {
    const bodyText = await req.text();
    if (bodyText.trim().length === 0) return {};
    return JSON.parse(bodyText) as unknown;
  } catch (error) {
    throw badRequestError('Invalid job-board scrape request JSON.').withCause(error);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const wantsLiveStream = (body: unknown): boolean =>
  isRecord(body) && body['stream'] === true;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Job-board scrape failed.';

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    safeSetTimeout(() => resolve(), delayMs);
  });
};

const isTerminalSnapshot = (
  snapshot: Awaited<ReturnType<typeof readFilemakerJobBoardScrapeRun>>
): boolean =>
  snapshot.run?.status === 'completed' ||
  snapshot.run?.status === 'failed' ||
  snapshot.run?.status === 'canceled';

const enqueueLiveEvent = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: FilemakerJobBoardScrapeLiveEvent
): void => {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
};

const enqueueErrorEvent = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  error: unknown
): void => {
  enqueueLiveEvent(controller, encoder, {
    at: new Date().toISOString(),
    message: errorMessage(error),
    type: 'error',
  });
};

const streamFilemakerJobBoardScrapeRun = (
  runId: string,
  signal: AbortSignal
): Response => {
  const encoder = new TextEncoder();
  let closed = false;
  let cursor = 0;
  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController<Uint8Array>) {
      const close = (): void => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      if (signal.aborted) {
        close();
        return;
      }
      signal.addEventListener('abort', close, { once: true });
      try {
        while (!closed) {
          // eslint-disable-next-line no-await-in-loop
          const snapshot = await readFilemakerJobBoardScrapeRun(runId);
          const nextEvents = snapshot.events.slice(cursor);
          cursor = snapshot.events.length;
          for (const event of nextEvents) {
            enqueueLiveEvent(controller, encoder, event);
          }
          if (isTerminalSnapshot(snapshot)) {
            close();
            return;
          }
          // eslint-disable-next-line no-await-in-loop
          await sleep(500);
        }
      } catch (error) {
        if (!closed) {
          enqueueErrorEvent(controller, encoder, error);
          close();
        }
      } finally {
        signal.removeEventListener('abort', close);
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'X-Filemaker-Job-Board-Scrape-Run-Id': runId,
    },
  });
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const body = await readOptionalJsonBody(req);
  const started = await enqueueFilemakerJobBoardScrapeRun(body);
  if (wantsLiveStream(body)) {
    return streamFilemakerJobBoardScrapeRun(started.run.id, req.signal);
  }
  return Response.json(started, {
    status: 202,
    headers: {
      'Cache-Control': 'no-store',
      'X-Filemaker-Job-Board-Scrape-Run-Id': started.run.id,
    },
  });
}
