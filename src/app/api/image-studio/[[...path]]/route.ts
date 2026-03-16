export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';

import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import * as cardsBackfill from '../cards/backfill/route-handler';
import * as composite from '../composite/route-handler';
import * as maskAi from '../mask/ai/route-handler';
import * as models from '../models/route-handler';
import * as promptExtract from '../prompt-extract/route-handler';
import * as run from '../run/route-handler';
import * as runsIndex from '../runs/route-handler';
import * as runById from '../runs/[runId]/route-handler';
import * as runStream from '../runs/[runId]/stream/route-handler';
import * as sequencesIndex from '../sequences/route-handler';
import * as sequencesRun from '../sequences/run/route-handler';
import * as sequenceById from '../sequences/[runId]/route-handler';
import * as sequenceStream from '../sequences/[runId]/stream/route-handler';
import * as sequenceCancel from '../sequences/[runId]/cancel/route-handler';
import * as slotsBase64 from '../slots/base64/route-handler';
import * as slotById from '../slots/[slotId]/route-handler';
import * as slotAnalysis from '../slots/[slotId]/analysis/route-handler';
import * as slotAutoscale from '../slots/[slotId]/autoscale/route-handler';
import * as slotCenter from '../slots/[slotId]/center/route-handler';
import * as slotCrop from '../slots/[slotId]/crop/route-handler';
import * as slotMasks from '../slots/[slotId]/masks/route-handler';
import * as slotScreenshot from '../slots/[slotId]/screenshot/route-handler';
import * as slotUpscale from '../slots/[slotId]/upscale/route-handler';
import * as projectsIndex from '../projects/route-handler';
import * as projectById from '../projects/[projectId]/route-handler';
import * as projectSlots from '../projects/[projectId]/slots/route-handler';
import * as projectSlotsEnsureFromUpload from '../projects/[projectId]/slots/ensure-from-upload/route-handler';
import * as projectAssets from '../projects/[projectId]/assets/route-handler';
import * as projectAssetsImport from '../projects/[projectId]/assets/import/route-handler';
import * as projectAssetsDelete from '../projects/[projectId]/assets/delete/route-handler';
import * as projectAssetsMove from '../projects/[projectId]/assets/move/route-handler';
import * as projectFolders from '../projects/[projectId]/folders/route-handler';
import * as projectVariantsDelete from '../projects/[projectId]/variants/delete/route-handler';
import * as uiExtractor from '../ui-extractor/route-handler';
import * as validationPatternsLearn from '../validation-patterns/learn/route-handler';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string>;
type RouteParams = { path?: string[] | string };
type RouteHandler<P extends Params = Params> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
type RouteModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const notFound = async (request: NextRequest, source: string): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source });
const methodNotAllowed = async (
  request: NextRequest,
  allowed: HttpMethod[],
  source: string
): Promise<Response> => {
  const response = await createErrorResponse(methodNotAllowedError('Method not allowed', {
    allowedMethods: allowed,
  }), { request, source });
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

const getAllowedMethods = <P extends Params>(module: RouteModule<P>): HttpMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async <P extends Params>(
  module: RouteModule<P>,
  method: HttpMethod,
  request: NextRequest,
  params: P | undefined,
  source: string
): Promise<Response> => {
  const handler = module[method];
  if (!handler) {
    const allowed = getAllowedMethods(module);
    return allowed.length > 0
      ? methodNotAllowed(request, allowed, source)
      : notFound(request, source);
  }
  return handler(request, { params: Promise.resolve(params ?? ({} as P)) });
};

const getPathSegments = (request: NextRequest): string[] => {
  const basePath = '/api/image-studio';
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const routeImageStudio = (
  method: HttpMethod,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const source = `image-studio.[[...path]].${method}`;
  if (segments.length === 0) {
    return notFound(request, source);
  }

  const [first, second, third, fourth] = segments;

  if (first === 'cards' && second === 'backfill' && segments.length === 2) {
    return dispatch(cardsBackfill, method, request, undefined, source);
  }

  if (first === 'composite' && segments.length === 1) {
    return dispatch(composite, method, request, undefined, source);
  }

  if (first === 'mask' && second === 'ai' && segments.length === 2) {
    return dispatch(maskAi, method, request, undefined, source);
  }

  if (first === 'models' && segments.length === 1) {
    return dispatch(models, method, request, undefined, source);
  }

  if (first === 'prompt-extract' && segments.length === 1) {
    return dispatch(promptExtract, method, request, undefined, source);
  }

  if (first === 'ui-extractor' && segments.length === 1) {
    return dispatch(uiExtractor, method, request, undefined, source);
  }

  if (first === 'run' && segments.length === 1) {
    return dispatch(run, method, request, undefined, source);
  }

  if (first === 'runs') {
    if (segments.length === 1) {
      return dispatch(runsIndex, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(runById, method, request, { runId: second }, source);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(runStream, method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'sequences') {
    if (segments.length === 1) {
      return dispatch(sequencesIndex, method, request, undefined, source);
    }
    if (second === 'run' && segments.length === 2) {
      return dispatch(sequencesRun, method, request, undefined, source);
    }
    if (second && third === 'stream' && segments.length === 3) {
      return dispatch(sequenceStream, method, request, { runId: second }, source);
    }
    if (second && third === 'cancel' && segments.length === 3) {
      return dispatch(sequenceCancel, method, request, { runId: second }, source);
    }
    if (second && segments.length === 2) {
      return dispatch(sequenceById, method, request, { runId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'slots') {
    if (second === 'base64' && segments.length === 2) {
      return dispatch(slotsBase64, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(slotById, method, request, { slotId: second }, source);
    }
    if (second && third === 'analysis' && segments.length === 3) {
      return dispatch(slotAnalysis, method, request, { slotId: second }, source);
    }
    if (second && third === 'autoscale' && segments.length === 3) {
      return dispatch(slotAutoscale, method, request, { slotId: second }, source);
    }
    if (second && third === 'center' && segments.length === 3) {
      return dispatch(slotCenter, method, request, { slotId: second }, source);
    }
    if (second && third === 'crop' && segments.length === 3) {
      return dispatch(slotCrop, method, request, { slotId: second }, source);
    }
    if (second && third === 'masks' && segments.length === 3) {
      return dispatch(slotMasks, method, request, { slotId: second }, source);
    }
    if (second && third === 'screenshot' && segments.length === 3) {
      return dispatch(slotScreenshot, method, request, { slotId: second }, source);
    }
    if (second && third === 'upscale' && segments.length === 3) {
      return dispatch(slotUpscale, method, request, { slotId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'projects') {
    if (segments.length === 1) {
      return dispatch(projectsIndex, method, request, undefined, source);
    }
    if (second && segments.length === 2) {
      return dispatch(projectById, method, request, { projectId: second }, source);
    }
    if (second && third === 'slots') {
      if (segments.length === 3) {
        return dispatch(projectSlots, method, request, { projectId: second }, source);
      }
      if (fourth === 'ensure-from-upload' && segments.length === 4) {
        return dispatch(
          projectSlotsEnsureFromUpload,
          method,
          request,
          { projectId: second },
          source
        );
      }
      return notFound(request, source);
    }
    if (second && third === 'assets') {
      if (segments.length === 3) {
        return dispatch(projectAssets, method, request, { projectId: second }, source);
      }
      if (fourth === 'import' && segments.length === 4) {
        return dispatch(projectAssetsImport, method, request, { projectId: second }, source);
      }
      if (fourth === 'delete' && segments.length === 4) {
        return dispatch(projectAssetsDelete, method, request, { projectId: second }, source);
      }
      if (fourth === 'move' && segments.length === 4) {
        return dispatch(projectAssetsMove, method, request, { projectId: second }, source);
      }
      return notFound(request, source);
    }
    if (second && third === 'folders' && segments.length === 3) {
      return dispatch(projectFolders, method, request, { projectId: second }, source);
    }
    if (second && third === 'variants' && fourth === 'delete' && segments.length === 4) {
      return dispatch(projectVariantsDelete, method, request, { projectId: second }, source);
    }
    return notFound(request, source);
  }

  if (first === 'validation-patterns' && second === 'learn' && segments.length === 2) {
    return dispatch(validationPatternsLearn, method, request, undefined, source);
  }

  return notFound(request, source);
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeImageStudio('GET', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeImageStudio('POST', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeImageStudio('PUT', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeImageStudio('PATCH', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, _params) =>
    routeImageStudio('DELETE', request, getPathSegments(request)),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].DELETE', requireAuth: true }
);
