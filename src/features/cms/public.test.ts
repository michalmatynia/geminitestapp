import { describe, expect, it } from 'vitest';

import * as cmsPublic from './public';

describe('cms public barrel', () => {
  it('exposes the admin CMS home and builder pages used by app routes', () => {
    expect(cmsPublic.CmsHomePage).toBeDefined();
    expect(cmsPublic.PageBuilderPage).toBeDefined();
    expect(cmsPublic.PageBuilderSettingsPage).toBeDefined();
    expect(cmsPublic.CmsEditorLayout).toBeDefined();
  });

  it('exposes the admin CMS page and slug routes used by app routes', () => {
    expect(cmsPublic.PagesPage).toBeDefined();
    expect(cmsPublic.CreatePagePage).toBeDefined();
    expect(cmsPublic.EditPagePage).toBeDefined();
    expect(cmsPublic.SlugsPage).toBeDefined();
    expect(cmsPublic.CreateSlugPage).toBeDefined();
    expect(cmsPublic.EditSlugPage).toBeDefined();
  });

  it('exposes the admin CMS theme and zone pages used by app routes', () => {
    expect(cmsPublic.ThemesPage).toBeDefined();
    expect(cmsPublic.CreateThemePage).toBeDefined();
    expect(cmsPublic.EditThemePage).toBeDefined();
    expect(cmsPublic.ZonesPage).toBeDefined();
  });
});
