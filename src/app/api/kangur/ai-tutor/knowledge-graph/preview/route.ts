export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  kangurAiTutorKnowledgeGraphPreviewRequestSchema,
  postKangurAiTutorKnowledgeGraphPreviewHandler,
} from './handler';

export const POST = apiHandler(postKangurAiTutorKnowledgeGraphPreviewHandler, {
  source: 'kangur.ai-tutor.knowledge-graph.preview.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurAiTutorKnowledgeGraphPreviewRequestSchema,
  requireAuth: true,
});
