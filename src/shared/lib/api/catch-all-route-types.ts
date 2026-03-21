import type { NextRequest } from 'next/server';

import type { StringRecordDto } from '@/shared/contracts/base';

export type CatchAllRouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type CatchAllRouteParams = StringRecordDto;
export type CatchAllRoutePathParams = { path?: string[] | string };
export type CatchAllRouteHandler<P extends CatchAllRouteParams = CatchAllRouteParams> = (
  request: NextRequest,
  context: { params: P | Promise<P> }
) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch-all route modules define their own param shapes.
export type CatchAllRouteModule = Partial<Record<CatchAllRouteMethod, CatchAllRouteHandler<any>>>;
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
