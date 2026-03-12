import { describe, expect, it } from 'vitest';

import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';

describe('buildKangurKnowledgeGraph', () => {
  it('builds a Kangur website-help graph from context roots and tutor content', () => {
    const snapshot = buildKangurKnowledgeGraph();

    expect(snapshot.graphKey).toBe('kangur-website-help-v1');
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
          triggerPhrases: expect.arrayContaining(['gdzie sa lekcje']),
        }),
        expect.objectContaining({
          id: 'page:kangur-tests',
          kind: 'page',
          title: 'Testy',
          route: '/tests',
          triggerPhrases: expect.arrayContaining(['gdzie sa testy', 'wroc do testow']),
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
  });

  it('respects the requested locale on generated nodes', () => {
    const snapshot = buildKangurKnowledgeGraph({ locale: 'en' });
    const loginAnchor = snapshot.nodes.find((node) => node.id === 'anchor:kangur:login');

    expect(snapshot.locale).toBe('en');
    expect(loginAnchor?.locale).toBe('en');
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
});
