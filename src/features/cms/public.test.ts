import { describe, expect, it } from 'vitest';

import * as cmsPublic from './public';

describe('cms public barrel', () => {
  it('keeps admin CMS route pages out of the shared barrel', () => {
    expect(cmsPublic).not.toHaveProperty('CmsHomePage');
    expect(cmsPublic).not.toHaveProperty('PageBuilderPage');
    expect(cmsPublic).not.toHaveProperty('PageBuilderSettingsPage');
    expect(cmsPublic).not.toHaveProperty('CmsEditorLayout');
    expect(cmsPublic).not.toHaveProperty('PagesPage');
    expect(cmsPublic).not.toHaveProperty('CreatePagePage');
    expect(cmsPublic).not.toHaveProperty('EditPagePage');
    expect(cmsPublic).not.toHaveProperty('SlugsPage');
    expect(cmsPublic).not.toHaveProperty('CreateSlugPage');
    expect(cmsPublic).not.toHaveProperty('EditSlugPage');
    expect(cmsPublic).not.toHaveProperty('ThemesPage');
    expect(cmsPublic).not.toHaveProperty('CreateThemePage');
    expect(cmsPublic).not.toHaveProperty('EditThemePage');
    expect(cmsPublic).not.toHaveProperty('ZonesPage');
  });

  it('continues exposing shared CMS runtime and builder primitives', () => {
    expect(cmsPublic.CmsPageShell).toBeDefined();
    expect(cmsPublic.CmsPageRenderer).toBeDefined();
    expect(cmsPublic.CmsRuntimePageRenderer).toBeDefined();
    expect(cmsPublic.CmsStorefrontAppearanceProvider).toBeDefined();
    expect(cmsPublic.useOptionalCmsStorefrontAppearance).toBeDefined();
    expect(cmsPublic.CmsBuilderLeftPanel).toBeDefined();
    expect(cmsPublic.ComponentSettingsPanel).toBeDefined();
    expect(cmsPublic.MediaLibraryPanel).toBeDefined();
    expect(cmsPublic.PageBuilderProvider).toBeDefined();
    expect(cmsPublic.CmsDomainSelector).toBeDefined();
  });
});
