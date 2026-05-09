/**
 * @file catch-all-router.ts
 * @description Dynamic routing handler for catch-all API routes in Next.js.
 * This router allows defining complex path patterns with literals and parameters,
 * and dispatches requests to the appropriate handlers based on HTTP methods.
 */

import { type NextRequest } from 'next/server';

import type { StringRecord } from '@/shared/contracts/base';
import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

/** Supported HTTP methods for catch-all routes */
export type CatchAllRouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Record of dynamic path parameters extracted from the URL */
export type CatchAllRouteParams = StringRecord;

/** Shape of the params object passed to Next.js route handlers */
export type CatchAllRoutePathParams = { path?: string[] | string };

/** Type for individual route handlers within a catch-all module */
export type CatchAllRouteHandler<P extends CatchAllRouteParams = CatchAllRouteParams> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;

/** 
 * Module containing handlers for different HTTP methods.
 * Usually returned by dynamic imports in route definitions.
 */
export type CatchAllRouteModule = Partial<Record<CatchAllRouteMethod, unknown>>;

/** Token representing a required dynamic parameter in a path pattern */
export type CatchAllRoutePatternParamToken = { param: string };

/** Token representing a literal string in a path pattern */
export type CatchAllRoutePatternLiteralToken = { literal: string; optional?: boolean };

/** Token representing an optional dynamic parameter in a path pattern */
export type CatchAllRoutePatternOptionalParamToken = { param: string; optional?: boolean };

/** Tokens that can be used in a basic route pattern */
export type CatchAllRoutePatternToken = string | CatchAllRoutePatternParamToken;

/** Tokens that can be used in a route pattern with optional segments */
export type CatchAllOptionalRoutePatternToken =
  | string
  | CatchAllRoutePatternLiteralToken
  | CatchAllRoutePatternOptionalParamToken;

/** 
 * Definition of a catch-all route, mapping a pattern to a handler module.
 */
export type CatchAllRouteDefinition<
  TPatternToken = CatchAllRoutePatternToken,
  TModule extends CatchAllRouteModule = CatchAllRouteModule,
> = {
  /** The sequence of tokens defining the path to match */
  pattern: TPatternToken[];
  /** The module containing handlers, if already loaded */
  module?: TModule;
  /** Async loader function to lazy-load the module */
  loader?: () => Promise<TModule>;
};

const HTTP_METHODS: CatchAllRouteMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Builds a standardized source identifier for observability.
 * @param base The base identifier (e.g. "admin.cms")
 * @param method The HTTP method
 */
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
  moduleOrLoader: CatchAllRouteModule | (() => Promise<CatchAllRouteModule>),
  method: CatchAllRouteMethod,
  request: NextRequest,
  params?: CatchAllRouteParams
): Promise<Response> => {
  const module = typeof moduleOrLoader === 'function' ? await moduleOrLoader() : moduleOrLoader;
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

/**
 * Extracts path segments from the request URL that follow the basePath.
 * @param request The incoming request
 * @param basePath The prefix to ignore (e.g. "/api/cms")
 */
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

const resolveSegmentAt = (segments: string[], segmentIndex: number): string | null =>
  segmentIndex < segments.length ? (segments[segmentIndex] ?? null) : null;

const isMissingRequiredToken = (
  segment: string | null,
  optional: boolean,
): boolean => segment === null && !optional;

const shouldSkipOptionalLiteral = (
  key: string,
  currentSegment: string,
  optional: boolean,
): boolean => optional && key !== currentSegment;

const shouldAbortPatternMatch = (
  currentSegment: string | null,
  optional: boolean,
): boolean => isMissingRequiredToken(currentSegment, optional);

const consumeLiteralToken = (args: {
  key: string;
  currentSegment: string;
  optional: boolean;
}): boolean => {
  if (shouldSkipOptionalLiteral(args.key, args.currentSegment, args.optional)) {
    return false;
  }

  return args.key === args.currentSegment;
};

const matchLiteralToken = (args: {
  currentSegment: string | null;
  key: string;
  optional: boolean;
  segmentIndex: number;
}): number | null => {
  if (shouldAbortPatternMatch(args.currentSegment, args.optional)) {
    return null;
  }

  if (args.currentSegment === null) {
    return args.segmentIndex;
  }

  if (shouldSkipOptionalLiteral(args.key, args.currentSegment, args.optional)) {
    return args.segmentIndex;
  }

  if (!consumeLiteralToken({
    key: args.key,
    currentSegment: args.currentSegment,
    optional: args.optional,
  })) {
    return null;
  }

  return args.segmentIndex + 1;
};

const matchParamToken = (args: {
  currentSegment: string | null;
  key: string;
  optional: boolean;
  params: CatchAllRouteParams;
  segmentIndex: number;
}): number | null => {
  if (shouldAbortPatternMatch(args.currentSegment, args.optional)) {
    return null;
  }

  if (args.currentSegment === null) {
    return args.segmentIndex;
  }

  args.params[args.key] = args.currentSegment;
  return args.segmentIndex + 1;
};

/**
 * Attempts to match a list of path segments against a pattern.
 * If successful, returns the extracted parameters.
 * @param pattern Array of tokens representing the pattern
 * @param segments Array of path segments from the URL
 */
export const matchCatchAllPattern = (
  pattern: CatchAllOptionalRoutePatternToken[],
  segments: string[]
): CatchAllRouteParams | null => {
  const params: CatchAllRouteParams = {};
  let segmentIndex = 0;
  
  // Iterate through each token in the pattern to match against segments
  for (const token of pattern) {
    const { isParam, key, optional } = normalizeToken(token);
    const currentSegment = resolveSegmentAt(segments, segmentIndex);
    
    // Attempt to match the current token (literal or parameter)
    const nextSegmentIndex = isParam
      ? matchParamToken({
          currentSegment,
          key,
          optional,
          params,
          segmentIndex,
        })
      : matchLiteralToken({
          currentSegment,
          key,
          optional,
          segmentIndex,
        });

    if (nextSegmentIndex === null) {
      return null; // Pattern mismatch
    }

    segmentIndex = nextSegmentIndex;
  }

  // Ensure all segments were consumed if they were not optional literals at the end
  if (segmentIndex !== segments.length) {
    return null;
  }

  return params;
};

/**
 * Main entry point for handling catch-all requests.
 * Iterates through defined routes and dispatches to the first matching one.
 * @param method HTTP method
 * @param request NextRequest object
 * @param segments Extracted path segments
 * @param routes List of route definitions
 * @param sourceBase Base identifier for observability
 */
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
    const moduleOrLoader = route.loader ?? route.module;
    if (!moduleOrLoader) {
      continue;
    }
    return dispatch(moduleOrLoader, method, request, params);
  }

  return createNotFound(request, source);
};
