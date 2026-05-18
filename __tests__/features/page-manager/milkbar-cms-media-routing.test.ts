import { describe, expect, it } from 'vitest';

import {
  getDrawingImageLinkValue,
  toLocalMilkbarCmsMediaPreviewUrl,
  toUploadPublicPath,
} from '@/features/page-manager/milkbardesigners/milkbar-cms-media-routing';

describe('milkbar CMS media routing', () => {
  it('serves local visualisation uploads through the local media API', () => {
    expect(toLocalMilkbarCmsMediaPreviewUrl('/uploads/cms/visualisation/drawing.webp')).toBe(
      '/api/cms/media/local/uploads/cms/visualisation/drawing.webp'
    );
    expect(getDrawingImageLinkValue('/uploads/cms/visualisation/drawing.webp')).toBe('');
  });

  it('keeps FastComet visualisation uploads as remote preview links', () => {
    const url = 'https://uploads.milkbardesigners.com/uploads/cms/visualisation/drawing.webp';

    expect(toLocalMilkbarCmsMediaPreviewUrl(url)).toBe(url);
    expect(getDrawingImageLinkValue(url)).toBe(url);
  });

  it('keeps remote visualisation URLs instead of routing them to local cache', () => {
    const url = 'https://cdn.example.com/uploads/cms/visualisation/drawing.webp';

    expect(toLocalMilkbarCmsMediaPreviewUrl(url)).toBe(url);
    expect(getDrawingImageLinkValue(url)).toBe(url);
  });

  it('routes loopback visualisation URLs through the local media API', () => {
    const url = 'http://localhost:3000/uploads/cms/visualisation/drawing.webp';

    expect(toLocalMilkbarCmsMediaPreviewUrl(url)).toBe(
      '/api/cms/media/local/uploads/cms/visualisation/drawing.webp'
    );
    expect(getDrawingImageLinkValue(url)).toBe('');
  });

  it('extracts upload public paths from absolute stored URLs', () => {
    expect(
      toUploadPublicPath(
        'https://uploads.milkbardesigners.com/uploads/cms/visualisation/drawing%201.webp'
      )
    ).toBe('/uploads/cms/visualisation/drawing 1.webp');
  });
});
