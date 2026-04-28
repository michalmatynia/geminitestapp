import { type NextRequest } from 'next/server';

import type { FilemakerJobBoardScrapeLiveEvent } from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import {
  runFilemakerJobBoardScrape,
  saveFilemakerJobBoardScrapeDrafts,
} from '@/features/filemaker/server/filemaker-job-board-scrape';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

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

const wantsDraftSave = (body: unknown): boolean =>
  isRecord(body) && body['action'] === 'save_drafts';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Job-board scrape failed.';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const body = await readOptionalJsonBody(req);
  if (wantsDraftSave(body)) {
    const result = await saveFilemakerJobBoardScrapeDrafts(body);
    return Response.json(result);
  }
  if (wantsLiveStream(body)) {
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream({
      start(controller: ReadableStreamDefaultController<Uint8Array>) {
        const send = (event: FilemakerJobBoardScrapeLiveEvent): void => {
          if (closed) return;
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        const close = (): void => {
          if (closed) return;
          closed = true;
          controller.close();
        };
        req.signal.addEventListener('abort', close, { once: true });
        void runFilemakerJobBoardScrape(body, { onEvent: send, signal: req.signal })
          .catch((error: unknown) => {
            send({
              at: new Date().toISOString(),
              message: errorMessage(error),
              type: 'error',
            });
          })
          .finally(close);
      },
    });
    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/x-ndjson; charset=utf-8',
      },
    });
  }
  const result = await runFilemakerJobBoardScrape(body);
  return Response.json(result);
}
