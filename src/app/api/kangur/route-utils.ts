import { type NextRequest } from 'next/server';

type KangurRouteContext = {
  params: {
    path?: string[] | string;
  };
};

export const resolveKangurApiPathSegments = (
  request: NextRequest,
  context: KangurRouteContext
): string[] => {
  const pathParam = context.params.path;
  if (Array.isArray(pathParam)) {
    return pathParam;
  }
  if (typeof pathParam === 'string' && pathParam.length > 0) {
    return [pathParam];
  }
  const pathname = request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const prefix = '/api/kangur/';
  if (!pathname.startsWith(prefix)) {
    return [];
  }
  const rest = pathname.slice(prefix.length);
  if (!rest) {
    return [];
  }
  return rest.split('/').filter(Boolean);
};
