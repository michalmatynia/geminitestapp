import { describe, it, expect, vi } from 'vitest';
import { applyDefaultFlagToSlugs } from '@/features/cms/services/cms-slug-service';
import type { Slug } from '@/shared/contracts/cms';

describe('CmsSlugService', () => {
  it('should apply the isDefault flag correctly to slug records', () => {
    const slugs: Slug[] = [
      { id: 's1', name: 'Slug 1' } as any,
      { id: 's2', name: 'Slug 2' } as any,
    ];
    const links = [
      { slugId: 's1', isDefault: true },
      { slugId: 's2', isDefault: false },
    ] as any;

    const result = applyDefaultFlagToSlugs(slugs, links);
    
    expect(result[0].isDefault).toBe(true);
    expect(result[1].isDefault).toBe(false);
  });

  it('should default isDefault to false if no link is provided', () => {
    const slugs: Slug[] = [{ id: 's1', name: 'Slug 1' } as any];
    const links: any[] = [];

    const result = applyDefaultFlagToSlugs(slugs, links);
    
    expect(result[0].isDefault).toBe(false);
  });
});
