import { describe, expect, it } from 'vitest';

import { kangurSocialPostSchema } from '@/shared/contracts/kangur-social-posts';

describe('kangur-social-posts contract', () => {
  it('allows more than 12 attached images on a social post', () => {
    const post = kangurSocialPostSchema.parse({
      id: 'post-1',
      titlePl: '',
      titleEn: '',
      bodyPl: '',
      bodyEn: '',
      combinedBody: '',
      status: 'draft',
      imageAssets: Array.from({ length: 13 }, (_, index) => ({
        id: `asset-${index + 1}`,
        url: `/asset-${index + 1}.png`,
      })),
      imageAddonIds: ['addon-1', 'addon-2', 'addon-3'],
    });

    expect(post.imageAssets).toHaveLength(13);
    expect(post.imageAddonIds).toEqual(['addon-1', 'addon-2', 'addon-3']);
  });

  it('preserves the saved image-analysis failure reason and defaults it to null', () => {
    const postWithError = kangurSocialPostSchema.parse({
      id: 'post-1',
      titlePl: '',
      titleEn: '',
      bodyPl: '',
      bodyEn: '',
      combinedBody: '',
      status: 'draft',
      visualAnalysisStatus: 'failed',
      visualAnalysisError: 'The selected screenshots could not be loaded.',
    });

    const postWithoutError = kangurSocialPostSchema.parse({
      id: 'post-2',
      titlePl: '',
      titleEn: '',
      bodyPl: '',
      bodyEn: '',
      combinedBody: '',
      status: 'draft',
    });

    expect(postWithError.visualAnalysisError).toBe(
      'The selected screenshots could not be loaded.'
    );
    expect(postWithoutError.visualAnalysisError).toBeNull();
  });
});
