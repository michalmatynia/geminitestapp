import 'server-only';

import { cmsService } from '@/features/cms/services/cms-service';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import type { Page } from '@/shared/contracts/cms';

import {
  buildKangurKnowledgeGraph,
  type BuildKangurKnowledgeGraphOptions,
} from './build-kangur-knowledge-graph';

type LoadKangurKnowledgeGraphSourcesInput = {
  locale?: string;
  cmsPages?: Page[];
};

export const loadKangurKnowledgeGraphSources = async (
  input: LoadKangurKnowledgeGraphSourcesInput = {}
): Promise<BuildKangurKnowledgeGraphOptions> => {
  const locale = input.locale?.trim() || 'pl';
  const cmsPagesPromise =
    input.cmsPages !== undefined ? Promise.resolve(input.cmsPages) : cmsService.getPages();
  const [tutorContent, nativeGuideStore, pageContentStore, cmsPages] = await Promise.all([
    getKangurAiTutorContent(locale),
    getKangurAiTutorNativeGuideStore(locale),
    getKangurPageContentStore(locale),
    cmsPagesPromise,
  ]);

  return {
    locale,
    tutorContent,
    nativeGuideStore,
    pageContentStore,
    cmsPages,
  };
};

export const buildKangurKnowledgeGraphFromRepositories = async (
  input: LoadKangurKnowledgeGraphSourcesInput = {}
) => buildKangurKnowledgeGraph(await loadKangurKnowledgeGraphSources(input));
