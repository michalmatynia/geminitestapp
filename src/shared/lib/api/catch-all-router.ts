import { NextRequest } from 'next/server';

import type { StringRecordDto } from '@/shared/contracts/base';
import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

export type CatchAllRouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type CatchAllRouteParams = StringRecordDto;
export type CatchAllRoutePathParams = { path?: string[] | string };
export type CatchAllRouteHandler<P extends CatchAllRouteParams = CatchAllRouteParams> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
// catch-all route modules define their own param shapes.
export type CatchAllRouteModule = Partial<Record<CatchAllRouteMethod, unknown>>;
export type CatchAllRoutePatternParamToken = { param: string };
export type CatchAllRoutePatternLiteralToken = { literal: string; optional?: boolean };
export type CatchAllRoutePatternOptionalParamToken = { param: string; optional?: boolean };
export type CatchAllRoutePatternToken = string | CatchAllRoutePatternParamToken;
export type CatchAllOptionalRoutePatternToken =
  | string
  | CatchAllRoutePatternLiteralToken
  | CatchAllRoutePatternOptionalParamToken;
export type CatchAllRouteDefinition<
  TPatternToken = CatchAllRoutePatternToken,
  TModule extends CatchAllRouteModule = CatchAllRouteModule,
> = {
  pattern: TPatternToken[];
  module: TModule;
};

const HTTP_METHODS: CatchAllRouteMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const buildCatchAllSource = (base: string, method: CatchAllRouteMethod): string =>
  `${base}.[[...path]].${method}`;

const createNotFound = async (request: NextRequest, source: string): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source });

const createMethodNotAllowed = async (
  request: NextRequest,
  allowed: CatchAllRouteMethod[],
  source: string
): Promise<Response> => {
  const response = await createErrorResponse(
    methodNotAllowedError('Method not allowed', { allowedMethods: allowed }),
    { request, source }
  );
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

const getAllowedMethods = (module: CatchAllRouteModule): CatchAllRouteMethod[] =>
  HTTP_METHODS.filter((method) => typeof module[method] === 'function');

const dispatch = async (
  module: CatchAllRouteModule,
  method: CatchAllRouteMethod,
  request: NextRequest,
  params?: CatchAllRouteParams
): Promise<Response> => {
  const handler = module[method];
  if (typeof handler !== 'function') {
    const allowed = getAllowedMethods(module);
    const source = 'catch-all-router.dispatch';
    return allowed.length > 0
      ? createMethodNotAllowed(request, allowed, source)
      : createNotFound(request, source);
  }
  return (handler as CatchAllRouteHandler)(
    request,
    { params: Promise.resolve(params ?? ({} as CatchAllRouteParams)) }
  );
};

export const getPathSegments = (request: NextRequest, basePath: string): string[] => {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(basePath)) {
    return [];
  }
  const remainder = pathname.slice(basePath.length).replace(/^\/+/, '');
  return remainder ? remainder.split('/').filter(Boolean) : [];
};

const normalizeToken = (
  token: CatchAllOptionalRoutePatternToken
): { isParam: boolean; key: string; optional: boolean } => {
  if (typeof token === 'string') {
    return { isParam: false, key: token, optional: false };
  }
  if ('literal' in token) {
    return { isParam: false, key: token.literal, optional: Boolean(token.optional) };
  }
  return { isParam: true, key: token.param, optional: Boolean(token.optional) };
};

export const matchCatchAllPattern = (
  pattern: CatchAllOptionalRoutePatternToken[],
  segments: string[]
): CatchAllRouteParams | null => {
  const params: CatchAllRouteParams = {};
  let segmentIndex = 0;
  for (const token of pattern) {
    const { isParam, key, optional } = normalizeToken(token);

    if (segmentIndex >= segments.length) {
      if (optional) {
        continue;
      }
      return null;
    }

    const currentSegment = segments[segmentIndex];
    if (!currentSegment) {
      return null;
    }

    if (!isParam) {
      if (key !== currentSegment) {
        if (optional) {
          continue;
        }
        return null;
      }
      segmentIndex += 1;
      continue;
    }

    params[key] = currentSegment;
    segmentIndex += 1;
  }

  if (segmentIndex !== segments.length) {
    return null;
  }

  return params;
};

export const handleCatchAllRequest = async (
  method: CatchAllRouteMethod,
  request: NextRequest,
  segments: string[],
  routes: CatchAllRouteDefinition<CatchAllOptionalRoutePatternToken>[],
  sourceBase: string
): Promise<Response> => {
  const source = buildCatchAllSource(sourceBase, method);

  for (const route of routes) {
    const params = matchCatchAllPattern(route.pattern, segments);
    if (!params) {
      continue;
    }
    return dispatch(route.module, method, request, params);
  }

  return createNotFound(request, source);
};
