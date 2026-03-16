export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import { kangurAiTutorContentSchema } from '@/shared/contracts/kangur-ai-tutor-content';
import { kangurAiTutorNativeGuideStoreSchema } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { kangurKnowledgeGraphPreviewRequestSchema } from '@/shared/contracts';
import { kangurPageContentStoreSchema } from '@/shared/contracts/kangur-page-content';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurAiTutorChatHandler } from '../chat/handler';
import {
  getKangurAiTutorContentHandler,
  postKangurAiTutorContentHandler,
  querySchema as contentQuerySchema,
} from '../content/handler';
import { getKangurAiTutorGuestIntroHandler } from '../guest-intro/handler';
import {
  getKangurAiTutorNativeGuideHandler,
  postKangurAiTutorNativeGuideHandler,
  querySchema as nativeGuideQuerySchema,
} from '../native-guide/handler';
import { postKangurAiTutorKnowledgeGraphPreviewHandler } from '../knowledge-graph/preview/handler';
import {
  getKangurPageContentHandler,
  postKangurPageContentHandler,
  querySchema as pageContentQuerySchema,
} from '../page-content/handler';
import { getKangurAiTutorUsageHandler } from '../usage/handler';

type RouteContext = {
  params: {
    action?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;

const getHandlers: Record<string, SimpleRouteHandler> = {
  content: apiHandler(getKangurAiTutorContentHandler, {
    source: 'kangur.ai-tutor.content.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
    querySchema: contentQuerySchema,
    requireAuth: true,
  }),
  'guest-intro': apiHandler(getKangurAiTutorGuestIntroHandler, {
    source: 'kangur.ai-tutor.guest-intro.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
  }),
  'native-guide': apiHandler(getKangurAiTutorNativeGuideHandler, {
    source: 'kangur.ai-tutor.native-guide.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
    querySchema: nativeGuideQuerySchema,
    requireAuth: true,
  }),
  'page-content': apiHandler(getKangurPageContentHandler, {
    source: 'kangur.ai-tutor.page-content.GET',
    querySchema: pageContentQuerySchema,
  }),
  usage: apiHandler(getKangurAiTutorUsageHandler, {
    source: 'kangur.ai-tutor.usage.GET',
    service: 'kangur.api',
    successLogging: 'off',
  }),
};

const postHandlers: Record<string, SimpleRouteHandler> = {
  chat: apiHandler(postKangurAiTutorChatHandler, {
    source: 'kangur.ai-tutor.chat.POST',
    service: 'kangur.api',
    successLogging: 'off',
  }),
  content: apiHandler(postKangurAiTutorContentHandler, {
    source: 'kangur.ai-tutor.content.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurAiTutorContentSchema,
    requireAuth: true,
  }),
  'native-guide': apiHandler(postKangurAiTutorNativeGuideHandler, {
    source: 'kangur.ai-tutor.native-guide.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurAiTutorNativeGuideStoreSchema,
    requireAuth: true,
  }),
  'page-content': apiHandler(postKangurPageContentHandler, {
    source: 'kangur.ai-tutor.page-content.POST',
    bodySchema: kangurPageContentStoreSchema,
  }),
  'knowledge-graph/preview': apiHandler(postKangurAiTutorKnowledgeGraphPreviewHandler, {
    source: 'kangur.ai-tutor.knowledge-graph.preview.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurKnowledgeGraphPreviewRequestSchema,
    requireAuth: true,
  }),
};

const knownActions = new Set([...Object.keys(getHandlers), ...Object.keys(postHandlers)]);

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: string[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const resolveAction = (
  raw: string[] | undefined
): { key: string; hasExtraSegments: boolean } => {
  if (!raw || raw.length === 0) {
    return { key: '', hasExtraSegments: false };
  }
  return { key: raw.join('/'), hasExtraSegments: raw.length > 2 };
};

export const GET = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { key, hasExtraSegments } = resolveAction(context.params.action);
  if (hasExtraSegments || key.length === 0) {
    return Promise.resolve(notFound());
  }
  const handler = getHandlers[key];
  if (!handler) {
    if (knownActions.has(key)) {
      return Promise.resolve(methodNotAllowed(['POST']));
    }
    return Promise.resolve(notFound());
  }
  return handler(request);
};

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { key, hasExtraSegments } = resolveAction(context.params.action);
  if (hasExtraSegments || key.length === 0) {
    return Promise.resolve(notFound());
  }
  const handler = postHandlers[key];
  if (!handler) {
    if (knownActions.has(key)) {
      return Promise.resolve(methodNotAllowed(['GET']));
    }
    return Promise.resolve(notFound());
  }
  return handler(request);
};
