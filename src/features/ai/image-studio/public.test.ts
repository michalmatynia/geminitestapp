import { describe, expect, it } from 'vitest';

import * as imageStudioPublic from './public';

describe('image studio public barrel', () => {
  it('keeps the shared image studio hooks and preview exports available', () => {
    expect(imageStudioPublic.useStudioProjects).toBeDefined();
    expect(imageStudioPublic.getImageStudioSlotImageSrc).toBeDefined();
    expect(imageStudioPublic.SplitVariantPreview).toBeDefined();
    expect(imageStudioPublic.CenterPreviewProvider).toBeDefined();
    expect(imageStudioPublic.useCenterPreviewContext).toBeDefined();
  });
});
