import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import {
  enforceAiPathsActionRateLimit,
  isCollectionAllowed,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { aiPathsDbActionRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import {
  normalizeAiPathsCollectionMap,
  resolveAiPathsCollectionName,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  expandFilter,
  isProviderResolutionError,
  normalizeObjectId,
} from './handler.helpers';
import { handlers } from './actions';
import { type MongoActionContext } from './handler.mongo';

type AiPathsDbActionRequest = z.infer<typeof aiPathsDbActionRequestSchema>;

const resolveCollection = (requestedCollection: string, collectionMap: unknown): ReturnType<typeof resolveAiPathsCollectionName> => {
  const explicitCollectionMap = normalizeAiPathsCollectionMap(collectionMap);
  const resolution = resolveAiPathsCollectionName(
    requestedCollection.trim(),
    explicitCollectionMap
  );

  if (isCollectionAllowed(resolution.collection) === false) {
    throw internalError('Collection not allowlisted');
  }

  return resolution;
};

const assertMongoConfigured = (): void => {
  if (process.env['MONGODB_URI'] === undefined || process.env['MONGODB_URI'] === '') {
    throw internalError('MongoDB is not configured');
  }
};

const createMongoActionContext = (
  resolvedCollection: string,
  data: AiPathsDbActionRequest,
  collectionRef: MongoActionContext['collectionRef']
): MongoActionContext => ({
  provider: 'mongodb',
  requestedProvider: data.provider ?? 'auto',
  collectionRef,
  resolvedCollection,
  action: data.action,
  filter: data.filter ?? {},
  idType: data.idType,
  projection: data.projection,
  sort: data.sort,
  limit: data.limit ?? 20,
  distinctField: data.distinctField,
  pipeline: data.pipeline ?? [],
  document: data.document ?? {},
  documents: data.documents ?? [],
  update: data.update,
  upsert: Boolean(data.upsert),
  returnDocument: data.returnDocument ?? 'after',
});

const executeMongoAction = async (actionCtx: MongoActionContext): Promise<Record<string, unknown>> => {
  const handler = handlers[actionCtx.action];
  if (handler === undefined) {
    throw badRequestError('Unsupported action');
  }

  const normalizedFilter = expandFilter(
    normalizeObjectId(actionCtx.filter as Record<string, unknown>, actionCtx.idType),
    actionCtx.resolvedCollection
  );
  return await handler(actionCtx, normalizedFilter);
};

const executeAction = async (
  resolvedCollection: string,
  data: AiPathsDbActionRequest
): Promise<Record<string, unknown>> => {
  assertMongoConfigured();
  const mongo = await getMongoDb();
  const collectionRef = mongo.collection(resolvedCollection);
  return await executeMongoAction(createMongoActionContext(resolvedCollection, data, collectionRef));
};

const processAction = async (
  data: AiPathsDbActionRequest,
  resolution: ReturnType<typeof resolveAiPathsCollectionName>
): Promise<Record<string, unknown>> => {
  const result = await executeAction(resolution.collection, data);
  const finalResult: Record<string, unknown> = {
    ...result,
    collection: resolution.collection,
    requestedCollection: data.collection.trim(),
  };

  if (resolution.mappedFrom !== undefined && resolution.mappedFrom !== '') {
    finalResult['collectionMappedFrom'] = resolution.mappedFrom;
  }

  return finalResult;
};

export async function postAiPathsDbActionHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (isInternal === false) {
    await enforceAiPathsActionRateLimit(access, 'db-action');
  }

  const parsed = await parseJsonBody(req, aiPathsDbActionRequestSchema, {
    logPrefix: 'ai-paths.db-action',
  });
  if (parsed.ok === false) return parsed.response;

  const { data } = parsed;
  const resolution = resolveCollection(data.collection, data.collectionMap);

  try {
    const finalResult = await processAction(data, resolution);
    return NextResponse.json(finalResult);
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (isProviderResolutionError(error)) {
      if (error.code === 'provider_not_configured') {
        throw internalError(error.message);
      }
      throw badRequestError(error.message);
    }
    throw error;
  }
}


export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  return postAiPathsDbActionHandler(req, ctx);
}
