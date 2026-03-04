/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { AdvancedApiConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { AdvancedApiErrorRoute } from './config';
import { parseJsonWithTemplates, toStringRecord, toNumberArray } from './utils';

export const parseErrorRoutes = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): AdvancedApiErrorRoute[] =>
  (parseJsonWithTemplates as any)(config.errorRoutesJson, nodeInputs, [], reportAiPathsError, {
    action: 'parseAdvancedApiErrorRoutes',
    nodeId,
  }).filter((entry: unknown): entry is AdvancedApiErrorRoute => {
    if (!entry || typeof entry !== 'object') return false;
    const record = entry as AdvancedApiErrorRoute;
    return (
      record.when === 'status' ||
      record.when === 'status_range' ||
      record.when === 'body_regex' ||
      record.when === 'timeout' ||
      record.when === 'network'
    );
  });

export const evaluateErrorRoute = (
  routes: AdvancedApiErrorRoute[],
  payload: {
    status: number;
    responseText: string;
    timedOut: boolean;
    networkError: boolean;
  }
): AdvancedApiErrorRoute | null => {
  for (const route of routes) {
    if (route.when === 'status') {
      if (typeof route.status === 'number' && Math.trunc(route.status) === payload.status) {
        return route;
      }
      continue;
    }
    if (route.when === 'status_range') {
      if (
        typeof route.minStatus === 'number' &&
        typeof route.maxStatus === 'number' &&
        payload.status >= route.minStatus &&
        payload.status <= route.maxStatus
      ) {
        return route;
      }
      continue;
    }
    if (route.when === 'body_regex') {
      if (typeof route.pattern !== 'string' || route.pattern.trim().length === 0) {
        continue;
      }
      try {
        const regex = new RegExp(route.pattern, route.flags ?? '');
        if (regex.test(payload.responseText)) {
          return route;
        }
      } catch {
        // Ignore malformed regex and continue checking other routes.
      }
      continue;
    }
    if (route.when === 'timeout' && payload.timedOut) {
      return route;
    }
    if (route.when === 'network' && payload.networkError) {
      return route;
    }
  }
  return null;
};

export const resolveRetryStatuses = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): Set<number> => {
  const parsed = (parseJsonWithTemplates as any)(
    config.retryOnStatusJson,
    nodeInputs,
    [],
    reportAiPathsError,
    { action: 'parseAdvancedApiRetryStatuses', nodeId }
  );
  return new Set<number>(toNumberArray(parsed));
};

export const parseOutputMappings = (
  config: AdvancedApiConfig,
  nodeInputs: RuntimePortValues,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  nodeId: string
): Record<string, string> =>
  toStringRecord(
    (parseJsonWithTemplates as any)(config.outputMappingsJson, nodeInputs, {}, reportAiPathsError, {
      action: 'parseAdvancedApiOutputMappings',
      nodeId,
    })
  );
