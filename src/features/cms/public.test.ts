import { describe, expect, it } from 'vitest';

import * as cmsPublic from './public';

describe('cms public barrel', () => {
  it('exposes the app-facing CMS route entrypoints used by admin wrappers', () => {
    expect(cmsPublic.CmsHomePage).toBeDefined();
    expect(cmsPublic.PageBuilderPage).toBeDefined();
    expect(cmsPublic.PageBuilderSettingsPage).toBeDefined();
    expect(cmsPublic.CmsEditorLayout).toBeDefined();
    expect(cmsPublic.PagesPage).toBeDefined();
    expect(cmsPublic.CreatePagePage).toBeDefined();
    expect(cmsPublic.EditPagePage).toBeDefined();
    expect(cmsPublic.SlugsPage).toBeDefined();
    expect(cmsPublic.CreateSlugPage).toBeDefined();
    expect(cmsPublic.EditSlugPage).toBeDefined();
    expect(cmsPublic.ThemesPage).toBeDefined();
    expect(cmsPublic.CreateThemePage).toBeDefined();
    expect(cmsPublic.EditThemePage).toBeDefined();
    expect(cmsPublic.ZonesPage).toBeDefined();
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

  it('continues exposing builder and runtime helpers through the root barrel', () => {
    expect(cmsPublic.useCmsPages).toBeTypeOf('function');
    expect(cmsPublic.resolveCmsStorefrontAppearance).toBeTypeOf('function');
    expect(cmsPublic.CmsPageContext).toBeDefined();
    expect(cmsPublic.MediaStylesProvider).toBeDefined();
  });
});
