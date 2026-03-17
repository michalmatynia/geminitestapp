/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  KANGUR_RECENT_FEATURES_CONTEXT_ROOT_IDS,
  KANGUR_RECENT_FEATURES_DOC_PATH,
  KANGUR_RECENT_FEATURES_ENTITY_TYPE,
  KANGUR_RECENT_FEATURES_PROVIDER_ID,
  KANGUR_RECENT_FEATURES_REF_ID,
  kangurRecentFeaturesContextProvider,
} from '../runtime-providers/kangur-recent-features';

const makeRef = () => ({
  id: KANGUR_RECENT_FEATURES_REF_ID,
  kind: 'runtime_document' as const,
  providerId: KANGUR_RECENT_FEATURES_PROVIDER_ID,
  entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
});

describe('kangurRecentFeaturesContextProvider', () => {
  it('returns a runtime document derived from the canonical recent-features doc', async () => {
    const docs = await kangurRecentFeaturesContextProvider.resolveRefs([makeRef()]);

    expect(docs).toHaveLength(1);
    const doc = docs[0];

    expect(doc).toEqual(
      expect.objectContaining({
        id: KANGUR_RECENT_FEATURES_REF_ID,
        kind: 'runtime_document',
        entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
      })
    );

    expect(doc.provenance).toEqual(
      expect.objectContaining({
        source: KANGUR_RECENT_FEATURES_DOC_PATH,
        persisted: true,
      })
    );

    expect(doc.relatedNodeIds).toEqual(
      expect.arrayContaining([...KANGUR_RECENT_FEATURES_CONTEXT_ROOT_IDS])
    );

    expect(doc.facts).toEqual(
      expect.objectContaining({
        docPath: KANGUR_RECENT_FEATURES_DOC_PATH,
      })
    );

    const factsSection = doc.sections.find((section) => section.kind === 'facts');
    expect(factsSection?.items?.[0]).toEqual(
      expect.objectContaining({
        docPath: KANGUR_RECENT_FEATURES_DOC_PATH,
      })
    );

    const textSection = doc.sections.find((section) => section.kind === 'text');
    expect(textSection?.text).toBeTruthy();
    expect(doc.summary.length).toBeGreaterThan(0);
  });
});
