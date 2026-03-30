import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKangurAiTutorContentMock,
  getKangurAiTutorNativeGuideStoreMock,
  getKangurPageContentStoreMock,
  getPagesMock,
  buildKangurKnowledgeGraphMock,
} = vi.hoisted(() => ({
  getKangurAiTutorContentMock: vi.fn(),
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  getKangurPageContentStoreMock: vi.fn(),
  getPagesMock: vi.fn(),
  buildKangurKnowledgeGraphMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  getKangurPageContentStore: getKangurPageContentStoreMock,
}));

vi.mock('@/features/cms/services/cms-service', () => ({
  cmsService: {
    getPages: getPagesMock,
  },
}));

vi.mock('./build-kangur-knowledge-graph', () => ({
  buildKangurKnowledgeGraph: buildKangurKnowledgeGraphMock,
}));

import {
  buildKangurKnowledgeGraphFromRepositories,
  loadKangurKnowledgeGraphSources,
} from './source-loader';

describe('knowledge graph source loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurAiTutorContentMock.mockResolvedValue({ locale: 'pl', common: {} });
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue({ locale: 'pl', version: 1, entries: [] });
    getKangurPageContentStoreMock.mockResolvedValue({ locale: 'pl', version: 1, entries: [] });
    getPagesMock.mockResolvedValue([{ id: 'cms-page-1', name: 'Page one' }]);
    buildKangurKnowledgeGraphMock.mockReturnValue({
      graphKey: 'kangur-website-help-v1',
      locale: 'pl',
      generatedAt: '2026-03-29T12:00:00.000Z',
      nodes: [],
      edges: [],
    });
  });

  it('loads Mongo-backed Kangur graph sources for the requested locale', async () => {
    await expect(loadKangurKnowledgeGraphSources({ locale: 'en' })).resolves.toEqual({
      locale: 'en',
      tutorContent: { locale: 'pl', common: {} },
      nativeGuideStore: { locale: 'pl', version: 1, entries: [] },
      pageContentStore: { locale: 'pl', version: 1, entries: [] },
      cmsPages: [{ id: 'cms-page-1', name: 'Page one' }],
    });

    expect(getKangurAiTutorContentMock).toHaveBeenCalledWith('en');
    expect(getKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith('en');
    expect(getKangurPageContentStoreMock).toHaveBeenCalledWith('en');
    expect(getPagesMock).toHaveBeenCalledTimes(1);
  });

  it('reuses provided CMS pages and builds the snapshot from loaded repository content', async () => {
    const cmsPages = [{ id: 'cms-page-provided', name: 'Provided page' }];

    await expect(
      buildKangurKnowledgeGraphFromRepositories({ locale: 'de', cmsPages })
    ).resolves.toEqual({
      graphKey: 'kangur-website-help-v1',
      locale: 'pl',
      generatedAt: '2026-03-29T12:00:00.000Z',
      nodes: [],
      edges: [],
    });

    expect(getPagesMock).not.toHaveBeenCalled();
    expect(buildKangurKnowledgeGraphMock).toHaveBeenCalledWith({
      locale: 'de',
      tutorContent: { locale: 'pl', common: {} },
      nativeGuideStore: { locale: 'pl', version: 1, entries: [] },
      pageContentStore: { locale: 'pl', version: 1, entries: [] },
      cmsPages,
    });
  });
});
