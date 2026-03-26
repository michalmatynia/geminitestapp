import { describe, expect, it } from 'vitest';

import type { Page } from '@/shared/contracts/cms';
import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';

const makeCmsPage = (overrides: Partial<Page> = {}): Page => ({
  id: 'page-1',
  name: 'Test Page',
  status: 'published',
  themeId: null,
  showMenu: true,
  components: [
    {
      type: 'section',
      order: 1,
      content: {
        zone: 'template',
        settings: {},
        blocks: [
          {
            id: 'b1',
            type: 'Heading',
            settings: { headingText: 'Welcome to Kangur' },
          },
          {
            id: 'b2',
            type: 'Text',
            settings: { textContent: 'Learn math the fun way.' },
          },
        ],
        sectionId: 'sec-1',
        parentSectionId: null,
      },
    },
  ],
  slugs: [{ id: 'slug-1', slug: 'test-page', isDefault: true, createdAt: '', updatedAt: '' }],
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('buildKangurKnowledgeGraph', () => {
  it('builds a Kangur website-help graph from context roots and tutor content', () => {
    const snapshot = buildKangurKnowledgeGraph();
    const gameHelpFlow = snapshot.nodes.find((node) => node.id === 'flow:kangur:game-help');
    const gameLibraryPage = snapshot.nodes.find((node) => node.id === 'page:kangur-games-library');
    const gameLibraryRootEdge = snapshot.edges.find(
      (edge) =>
        edge.kind === 'HAS_REFERENCE' &&
        edge.from === 'root:kangur:gameLibraryContext' &&
        edge.to === 'page:kangur-games-library'
    );

    expect(snapshot.graphKey).toBe('kangur-website-help-v1');
    expect(gameHelpFlow).toMatchObject({
      title: 'Games and practice help',
      route: '/game',
    });
    expect(gameLibraryPage).toBeUndefined();
    expect(gameLibraryRootEdge).toBeUndefined();
    expect(snapshot.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'app:kangur',
          kind: 'app',
        }),
        expect.objectContaining({
          id: 'flow:kangur:sign-in',
          kind: 'flow',
        }),
        expect.objectContaining({
          id: 'anchor:kangur:login',
          route: '/',
          anchorId: 'kangur-primary-nav-login',
        }),
        expect.objectContaining({
          id: 'root:kangur:lessonContext',
          kind: 'context_root',
        }),
        expect.objectContaining({
          id: 'page:kangur-lessons',
          kind: 'page',
          title: 'Lekcje',
          route: '/lessons',
          triggerPhrases: expect.arrayContaining(['gdzie są lekcje']),
        }),
        expect.objectContaining({
          id: 'page:kangur-tests',
          kind: 'page',
          title: 'Testy',
          route: '/tests',
          triggerPhrases: expect.arrayContaining(['gdzie są testy', 'wróć do testów']),
        }),
        expect.objectContaining({
          id: 'guide:native:lesson-overview',
          kind: 'guide',
          surface: 'lesson',
          route: '/lessons',
          sourceCollection: 'kangur_ai_tutor_native_guides',
          sourceRecordId: 'lesson-overview',
          sourcePath: 'entry:lesson-overview',
          contentIdPrefixes: ['lesson-', 'lesson:list'],
          semanticText: expect.stringContaining('Ekran lekcji prowadzi ucznia'),
        }),
        expect.objectContaining({
          id: 'action:native:lesson-overview:lesson-open-library',
          kind: 'action',
          route: '/lessons',
          sourceCollection: 'kangur_ai_tutor_native_guides',
          sourceRecordId: 'lesson-overview',
          sourcePath: 'entry:lesson-overview.followUpAction:lesson-open-library',
        }),
        expect.objectContaining({
          id: 'guide:native:auth-login-action',
          kind: 'guide',
          route: '/',
          anchorId: 'kangur-primary-nav-login',
        }),
        expect.objectContaining({
          id: 'guide:native:test-question',
          kind: 'guide',
          route: '/tests',
          anchorId: undefined,
        }),
        expect.objectContaining({
          id: 'guide:page-content:game-home-leaderboard',
          kind: 'guide',
          route: '/game',
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-leaderboard',
          sourcePath: 'entry:game-home-leaderboard',
          anchorId: 'kangur-game-home-leaderboard',
        }),
      ])
    );
    expect(snapshot.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'HAS_FLOW',
          from: 'app:kangur',
          to: 'flow:kangur:sign-in',
        }),
        expect.objectContaining({
          kind: 'USES_ANCHOR',
          from: 'flow:kangur:sign-in',
          to: 'anchor:kangur:login',
        }),
        expect.objectContaining({
          kind: 'USES_ANCHOR',
          from: 'flow:kangur:create-account',
          to: 'anchor:kangur:login',
        }),
        expect.objectContaining({
          kind: 'HAS_REFERENCE',
          from: 'root:kangur:lessonContext',
          to: 'page:kangur-lessons',
        }),
        expect.objectContaining({
          kind: 'LEADS_TO',
          from: 'guide:native:lesson-overview',
          to: 'action:native:lesson-overview:lesson-open-library',
        }),
        expect.objectContaining({
          kind: 'LEADS_TO',
          from: 'guide:native:auth-login-action',
          to: 'anchor:kangur:login',
        }),
        expect.objectContaining({
          kind: 'EXPLAINS',
          from: 'guide:page-content:game-home-leaderboard',
          to: 'guide:native:shared-leaderboard',
        }),
      ])
    );
    expect(snapshot.nodes.some((node) => node.id === 'anchor:kangur:create-account')).toBe(false);
  });

  it('respects the requested locale on generated nodes', () => {
    const snapshot = buildKangurKnowledgeGraph({ locale: 'en' });
    const loginAnchor = snapshot.nodes.find((node) => node.id === 'anchor:kangur:login');

    expect(snapshot.locale).toBe('en');
    expect(loginAnchor?.locale).toBe('en');
  });

  it('uses the provided page-content store instead of only the repo defaults', () => {
    const snapshot = buildKangurKnowledgeGraph({
      pageContentStore: {
        locale: 'pl',
        version: 1,
        entries: [
          {
            id: 'game-home-actions',
            pageKey: 'Game',
            screenKey: 'home',
            surface: 'game',
            route: '/game',
            componentId: 'home-actions',
            widget: 'KangurGameHomeActionsWidget',
            sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
            title: 'Akcje z Mongo',
            summary: 'To jest zyc na zywo summary z page-content store.',
            body: 'To jest zyc na zywo body z page-content store.',
            anchorIdPrefix: 'kangur-game-home-actions',
            focusKind: 'home_actions',
            contentIdPrefixes: ['game:home'],
            nativeGuideIds: ['shared-home-actions'],
            triggerPhrases: ['akcje z mongo'],
            tags: ['page-content', 'mongo-live'],
            notes: 'Live Mongo-backed entry.',
            enabled: true,
            sortOrder: 10,
          },
        ],
      },
    });
    const pageContentNode = snapshot.nodes.find(
      (node) => node.id === 'guide:page-content:game-home-actions'
    );

    expect(pageContentNode).toMatchObject({
      title: 'Akcje z Mongo',
      summary: 'To jest zyc na zywo summary z page-content store.',
      sourceCollection: 'kangur_page_content',
      sourceRecordId: 'game-home-actions',
      semanticText: expect.stringContaining('To jest zyc na zywo body z page-content store.'),
      tags: expect.arrayContaining(['mongo-live']),
    });
  });

  it('attaches canonical source references to Mongo-backed content nodes', () => {
    const snapshot = buildKangurKnowledgeGraph();

    expect(snapshot.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anchor:kangur:login',
          sourceCollection: 'kangur_ai_tutor_content',
          sourceRecordId: 'pl',
          sourcePath: 'common.signInLabel',
        }),
        expect.objectContaining({
          id: 'faq:kangur:guest-intro',
          sourceCollection: 'kangur_ai_tutor_content',
          sourceRecordId: 'pl',
          sourcePath: 'guestIntro.initial',
        }),
      ])
    );
  });

  it('creates cms-page nodes for published CMS pages with meaningful text', () => {
    const snapshot = buildKangurKnowledgeGraph({
      cmsPages: [
        makeCmsPage({
          id: 'cms-about',
          name: 'O nas',
          seoTitle: 'O Kangurze — Nauka matematyki',
          seoDescription: 'Poznaj platformę Kangur do nauki matematyki.',
          slugs: [{ id: 's1', slug: 'o-nas', isDefault: true, createdAt: '', updatedAt: '' }],
        }),
      ],
    });

    const cmsNode = snapshot.nodes.find((n) => n.id === 'cms-page:cms-about');
    expect(cmsNode).toMatchObject({
      kind: 'page',
      title: 'O Kangurze — Nauka matematyki',
      summary: 'Poznaj platformę Kangur do nauki matematyki.',
      source: 'cms_pages',
      sourceCollection: 'cms_pages',
      sourceRecordId: 'cms-about',
      route: '/o-nas',
      tags: expect.arrayContaining(['cms', 'cms-page', 'website']),
      triggerPhrases: expect.arrayContaining(['o nas', 'o nas']),
    });
    expect(cmsNode?.semanticText).toContain('Welcome to Kangur');
    expect(cmsNode?.semanticText).toContain('Learn math the fun way.');

    const cmsEdge = snapshot.edges.find((e) => e.to === 'cms-page:cms-about');
    expect(cmsEdge).toMatchObject({
      kind: 'RELATED_TO',
      from: 'app:kangur',
    });
  });

  it('skips draft CMS pages', () => {
    const snapshot = buildKangurKnowledgeGraph({
      cmsPages: [makeCmsPage({ id: 'cms-draft', status: 'draft' })],
    });

    expect(snapshot.nodes.find((n) => n.id === 'cms-page:cms-draft')).toBeUndefined();
  });

  it('skips CMS pages with insufficient text content', () => {
    const snapshot = buildKangurKnowledgeGraph({
      cmsPages: [
        makeCmsPage({
          id: 'cms-empty',
          name: 'X',
          seoTitle: undefined,
          seoDescription: undefined,
          components: [],
        }),
      ],
    });

    expect(snapshot.nodes.find((n) => n.id === 'cms-page:cms-empty')).toBeUndefined();
  });

  it('uses page name as title when seoTitle is missing', () => {
    const snapshot = buildKangurKnowledgeGraph({
      cmsPages: [makeCmsPage({ id: 'cms-notitle', seoTitle: undefined })],
    });

    const cmsNode = snapshot.nodes.find((n) => n.id === 'cms-page:cms-notitle');
    expect(cmsNode?.title).toBe('Test Page');
  });
});
