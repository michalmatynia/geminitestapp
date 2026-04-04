import { describe, expect, it } from 'vitest';

import * as cmsIndex from './index';

describe('cms index barrel', () => {
  it('continues exposing the CMS admin page entrypoints', () => {
    expect(cmsIndex).toHaveProperty('CmsHomePage');
    expect(cmsIndex).toHaveProperty('PageBuilderPage');
    expect(cmsIndex).toHaveProperty('PagesPage');
    expect(cmsIndex).toHaveProperty('CreatePagePage');
    expect(cmsIndex).toHaveProperty('EditPagePage');
    expect(cmsIndex).toHaveProperty('SlugsPage');
    expect(cmsIndex).toHaveProperty('CreateSlugPage');
    expect(cmsIndex).toHaveProperty('EditSlugPage');
    expect(cmsIndex).toHaveProperty('ThemesPage');
    expect(cmsIndex).toHaveProperty('CreateThemePage');
    expect(cmsIndex).toHaveProperty('EditThemePage');
    expect(cmsIndex).toHaveProperty('ZonesPage');
  });
});
