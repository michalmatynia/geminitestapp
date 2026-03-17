/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { contextRegistryEngine } from '../index';
import {
  KANGUR_RECENT_FEATURES_ENTITY_TYPE,
  KANGUR_RECENT_FEATURES_REF_ID,
} from '../../services/runtime-providers/kangur-recent-features';

describe('contextRegistryEngine runtime provider smoke', () => {
  it('resolves runtime:kangur:recent-features through the server engine', async () => {
    const result = await contextRegistryEngine.resolveRefs({
      refs: [{ id: KANGUR_RECENT_FEATURES_REF_ID, kind: 'runtime_document' }],
      depth: 0,
      maxNodes: 4,
    });

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: KANGUR_RECENT_FEATURES_REF_ID,
          entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
        }),
      ])
    );

    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'page:kangur-recent-features' }),
      ])
    );
  });
});
