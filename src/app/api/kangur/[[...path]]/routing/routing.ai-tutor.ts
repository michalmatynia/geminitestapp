import { type NextRequest } from 'next/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  kangurAiTutorContentSchema,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  kangurAiTutorNativeGuideStoreSchema,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import {
  kangurPageContentStoreSchema,
} from '@/shared/contracts/kangur-page-content';
import {
  kangurKnowledgeGraphPreviewRequestSchema,
  kangurKnowledgeGraphSyncRequestSchema,
} from '@/shared/contracts';
import { postKangurAiTutorChatHandler } from '@/app/api/kangur/ai-tutor/chat/handler';
import { GET_handler as getKangurAiTutorChatHistoryHandler } from '@/app/api/kangur/ai-tutor/chat/history-handler';
import { GET_handler as getKangurAiTutorChatAdminHistoryHandler } from '@/app/api/kangur/ai-tutor/chat/admin-history/handler';
import {
  getKangurAiTutorContentHandler,
  postKangurAiTutorContentHandler,
  querySchema as contentQuerySchema,
} from '@/app/api/kangur/ai-tutor/content/handler';
import { getKangurAiTutorGuestIntroHandler } from '@/app/api/kangur/ai-tutor/guest-intro/handler';
import {
  getKangurAiTutorNativeGuideHandler,
  postKangurAiTutorNativeGuideHandler,
  querySchema as nativeGuideQuerySchema,
} from '@/app/api/kangur/ai-tutor/native-guide/handler';
import { postKangurAiTutorKnowledgeGraphPreviewHandler } from '@/app/api/kangur/ai-tutor/knowledge-graph/preview/handler';
import {
  getKangurPageContentHandler,
  postKangurPageContentHandler,
  querySchema as pageContentQuerySchema,
} from '@/app/api/kangur/ai-tutor/page-content/handler';
import {
  getKangurAiTutorUsageHandler,
  querySchema as usageQuerySchema,
} from '@/app/api/kangur/ai-tutor/usage/handler';
import { POST_handler as postKangurAiTutorFollowUpHandler } from '@/app/api/kangur/ai-tutor/follow-up/handler';
import { POST_handler as postKangurNativeGuideGenerationHandler } from '@/app/api/kangur/ai-tutor/admin/native-guide-generation/handler';
import { GET_handler as getKangurAiTutorExperimentsHandler, PUT_handler as putKangurAiTutorExperimentsHandler } from '@/app/api/kangur/ai-tutor/experiments/handler';
import { GET_handler as getKangurKnowledgeGraphStatusHandler, querySchema as knowledgeGraphQuerySchema } from '@/app/api/kangur/knowledge-graph/status/handler';
import { POST_handler as postKangurKnowledgeGraphSyncHandler } from '@/app/api/kangur/knowledge-graph/sync/handler';
import { handleGetPost, methodNotAllowed, SimpleRouteHandler } from './routing.utils';

export const aiTutorChatHandler: SimpleRouteHandler = apiHandler(postKangurAiTutorChatHandler, {
  source: 'kangur.ai-tutor.chat.POST',
  service: 'kangur.api',
});

export const aiTutorChatHistoryHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorChatHistoryHandler, {
  source: 'kangur.ai-tutor.chat-history.GET',
  service: 'kangur.api',
});

export const aiTutorChatAdminHistoryHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorChatAdminHistoryHandler, {
  source: 'kangur.ai-tutor.chat.admin-history.GET',
  service: 'kangur.api',
});

export const aiTutorContentGetHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorContentHandler, {
  source: 'kangur.ai-tutor.content.GET',
  service: 'kangur.api',
  querySchema: contentQuerySchema,
});

export const aiTutorContentPostHandler: SimpleRouteHandler = apiHandler(postKangurAiTutorContentHandler, {
  source: 'kangur.ai-tutor.content.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurAiTutorContentSchema,
});

export const aiTutorGuestIntroHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorGuestIntroHandler, {
  source: 'kangur.ai-tutor.guest-intro.GET',
  service: 'kangur.api',
});

export const aiTutorNativeGuideGetHandler: SimpleRouteHandler = apiHandler(
  getKangurAiTutorNativeGuideHandler,
  {
    source: 'kangur.ai-tutor.native-guide.GET',
    service: 'kangur.api',
    querySchema: nativeGuideQuerySchema,
  }
);

export const aiTutorNativeGuidePostHandler: SimpleRouteHandler = apiHandler(
  postKangurAiTutorNativeGuideHandler,
  {
    source: 'kangur.ai-tutor.native-guide.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurAiTutorNativeGuideStoreSchema,
  }
);

export const pageContentGetHandler: SimpleRouteHandler = apiHandler(getKangurPageContentHandler, {
  source: 'kangur.ai-tutor.page-content.GET',
  service: 'kangur.api',
  querySchema: pageContentQuerySchema,
});

export const pageContentPostHandler: SimpleRouteHandler = apiHandler(postKangurPageContentHandler, {
  source: 'kangur.ai-tutor.page-content.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurPageContentStoreSchema,
});

export const aiTutorKnowledgeGraphPreviewHandler: SimpleRouteHandler = apiHandler(
  postKangurAiTutorKnowledgeGraphPreviewHandler,
  {
    source: 'kangur.ai-tutor.knowledge-graph.preview.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurKnowledgeGraphPreviewRequestSchema,
  }
);

export const aiTutorUsageHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorUsageHandler, {
  source: 'kangur.ai-tutor.usage.GET',
  service: 'kangur.api',
  querySchema: usageQuerySchema,
});

export const aiTutorFollowUpHandler: SimpleRouteHandler = apiHandler(postKangurAiTutorFollowUpHandler, {
  source: 'kangur.ai-tutor.follow-up.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const knowledgeGraphStatusHandler: SimpleRouteHandler = apiHandler(
  getKangurKnowledgeGraphStatusHandler,
  {
    source: 'kangur.knowledge-graph.status.GET',
    service: 'kangur.api',
    querySchema: knowledgeGraphQuerySchema,
  }
);

export const knowledgeGraphSyncHandler: SimpleRouteHandler = apiHandler(postKangurKnowledgeGraphSyncHandler, {
  source: 'kangur.knowledge-graph.sync.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurKnowledgeGraphSyncRequestSchema,
});

export const nativeGuideGenerationHandler: SimpleRouteHandler = apiHandler(postKangurNativeGuideGenerationHandler, {
  source: 'kangur.ai-tutor.admin.native-guide-generation.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const aiTutorExperimentsGetHandler: SimpleRouteHandler = apiHandler(getKangurAiTutorExperimentsHandler, {
  source: 'kangur.ai-tutor.experiments.GET',
  service: 'kangur.api',
});

export const aiTutorExperimentsPutHandler: SimpleRouteHandler = apiHandler(putKangurAiTutorExperimentsHandler, {
  source: 'kangur.ai-tutor.experiments.PUT',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const handleAiTutorRouting = (request: NextRequest, segments: string[]): Promise<Response> | null => {
  if (segments[0] === 'ai-tutor') {
    const sub = segments[1];
    if (sub === 'chat' && segments.length === 2) {
      return handleGetPost(request, aiTutorChatHistoryHandler, aiTutorChatHandler);
    }
    if (sub === 'chat' && segments[2] === 'admin-history' && segments.length === 3) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return aiTutorChatAdminHistoryHandler(request);
    }
    if (sub === 'content' && segments.length === 2) {
      return handleGetPost(request, aiTutorContentGetHandler, aiTutorContentPostHandler);
    }
    if (sub === 'guest-intro' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return aiTutorGuestIntroHandler(request);
    }
    if (sub === 'native-guide' && segments.length === 2) {
      return handleGetPost(request, aiTutorNativeGuideGetHandler, aiTutorNativeGuidePostHandler);
    }
    if (sub === 'page-content' && segments.length === 2) {
      return handleGetPost(request, pageContentGetHandler, pageContentPostHandler);
    }
    if (sub === 'knowledge-graph' && segments[2] === 'preview' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return aiTutorKnowledgeGraphPreviewHandler(request);
    }
    if (sub === 'usage' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return aiTutorUsageHandler(request);
    }
    if (sub === 'follow-up' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return aiTutorFollowUpHandler(request);
    }
    if (sub === 'experiments' && segments.length === 2) {
      if (request.method === 'GET') return aiTutorExperimentsGetHandler(request);
      if (request.method === 'PUT') return aiTutorExperimentsPutHandler(request);
      return methodNotAllowed(request, ['GET', 'PUT'], request.method);
    }
    if (sub === 'admin' && segments[2] === 'native-guide-generation' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return nativeGuideGenerationHandler(request);
    }
  }
  if (segments[0] === 'knowledge-graph') {
    if (segments[1] === 'status' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return knowledgeGraphStatusHandler(request);
    }
    if (segments[1] === 'sync' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return knowledgeGraphSyncHandler(request);
    }
  }
  return null;
};
