import { describe, expect, it } from 'vitest';

import type { SelectorRegistryProbeSession } from '@/shared/contracts/integrations/selector-registry';
import {
  buildSelectorRegistryProbeTemplateFingerprint,
  formatSelectorRegistryProbeTemplateLabel,
} from '@/shared/lib/browser-execution/selector-registry-probe-template';

import {
  buildSelectorRegistryProbeSessionClusters,
  normalizeProbeTemplatePath,
} from './selectorRegistryProbeSessionClustering';

const buildSession = (
  id: string,
  sourceUrl: string,
  updatedAt: string,
  roles: Array<'content_price' | 'content_title'>
): SelectorRegistryProbeSession => ({
  id,
  namespace: 'amazon',
  profile: 'amazon',
  sourceUrl,
  sourceTitle: `Session ${id}`,
  scope: 'main_content',
  sameOriginOnly: true,
  linkDepth: 0,
  maxPages: 1,
  scannedPages: 1,
  visitedUrls: [sourceUrl],
  pages: [],
  suggestionCount: roles.length,
  suggestions: roles.map((role, index) => ({
    suggestionId: `${id}:${role}:${index}`,
    pageUrl: sourceUrl,
    pageTitle: `Session ${id}`,
    tag: role === 'content_price' ? 'span' : 'h1',
    id: null,
    classes: [],
    textPreview: role,
    role: null,
    attrs: {},
    boundingBox: { x: 0, y: 0, width: 10, height: 10 },
    candidates: {
      css: role === 'content_price' ? '.price' : '.title',
      xpath: null,
      role: null,
      text: role,
      testId: null,
    },
    repeatedSiblingCount: 0,
    childLinkCount: 0,
    childImageCount: 0,
    classificationRole: role,
    draftTargetHints: [],
    confidence: 0.9,
    evidence: ['signal'],
  })),
  templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
    sourceUrl,
    suggestions: roles.map((role, index) => ({
      suggestionId: `${id}:${role}:${index}`,
      pageUrl: sourceUrl,
      pageTitle: `Session ${id}`,
      tag: role === 'content_price' ? 'span' : 'h1',
      id: null,
      classes: [],
      textPreview: role,
      role: null,
      attrs: {},
      boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      candidates: {
        css: role === 'content_price' ? '.price' : '.title',
        xpath: null,
        role: null,
        text: role,
        testId: null,
      },
      repeatedSiblingCount: 0,
      childLinkCount: 0,
      childImageCount: 0,
      classificationRole: role,
      draftTargetHints: [],
      confidence: 0.9,
      evidence: ['signal'],
    })),
  }),
  archivedAt: null,
  createdAt: updatedAt,
  updatedAt,
});

describe('selectorRegistryProbeSessionClustering', () => {
  it('normalizes numeric path segments into a stable template path', () => {
    expect(normalizeProbeTemplatePath('https://www.amazon.com/item-2/detail/12345')).toBe(
      '/item-:n/detail/:n'
    );
  });

  it('formats probe template labels from persisted fingerprints', () => {
    expect(
      formatSelectorRegistryProbeTemplateLabel({
        host: 'www.amazon.com',
        normalizedPath: '/item-:n',
      })
    ).toBe('www.amazon.com/item-:n');
  });

  it('clusters repeated product pages by normalized path and role signature', () => {
    const clusters = buildSelectorRegistryProbeSessionClusters([
      buildSession('a', 'https://www.amazon.com/item-2', '2026-04-18T08:00:00.000Z', [
        'content_title',
        'content_price',
      ]),
      buildSession('b', 'https://www.amazon.com/item-3', '2026-04-18T09:00:00.000Z', [
        'content_title',
        'content_price',
      ]),
      buildSession('c', 'https://www.amazon.com/search', '2026-04-18T07:00:00.000Z', [
        'content_title',
      ]),
    ]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toEqual(
      expect.objectContaining({
        label: 'www.amazon.com/item-:n',
        sessionCount: 2,
        suggestionCount: 4,
        roleSignature: ['content_price', 'content_title'],
      })
    );
    expect(clusters[0].sessions.map((session) => session.id)).toEqual(['b', 'a']);
    expect(clusters[1]).toEqual(
      expect.objectContaining({
        label: 'www.amazon.com/search',
        sessionCount: 1,
      })
    );
  });
});
