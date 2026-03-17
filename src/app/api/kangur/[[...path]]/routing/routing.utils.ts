import { type NextRequest } from 'next/server';
import { notFoundError, methodNotAllowedError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

export const buildSource = (method: string): string => `kangur.[[...path]].${method}`;

export const notFound = async (request: NextRequest, method: string): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source: buildSource(method) });

export const methodNotAllowed = async (
  request: NextRequest,
  allowed: string[],
  method: string
): Promise<Response> => {
  const response = await createErrorResponse(
    methodNotAllowedError('Method not allowed', { allowedMethods: allowed }),
    { request, source: buildSource(method) }
  );
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

export type SimpleRouteHandler = ((request: NextRequest) => Promise<Response>) & { __isApiHandler?: boolean };
export type ParamRouteHandler = ((request: NextRequest, context: { params: { id: string } }) => Promise<Response>) & { __isApiHandler?: boolean };

export const handleGetPost = (
  request: NextRequest,
  getHandler: SimpleRouteHandler | null,
  postHandler: SimpleRouteHandler | null
): Promise<Response> => {
  if (request.method === 'GET') {
    return getHandler ? getHandler(request) : methodNotAllowed(request, ['POST'], 'GET');
  }
  if (request.method === 'POST') {
    return postHandler ? postHandler(request) : methodNotAllowed(request, ['GET'], 'POST');
  }
  return methodNotAllowed(request, ['GET', 'POST'], request.method);
};
