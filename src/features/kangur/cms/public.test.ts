import { describe, expect, it } from 'vitest';

import * as kangurCmsPublic from './public';

describe('kangur cms public barrel', () => {
  it('exposes routing and widget metadata helpers used by CMS builders', () => {
    expect(kangurCmsPublic.buildKangurEmbeddedBasePath).toBeTypeOf('function');
    expect(kangurCmsPublic.getKangurWidgetLabel).toBeTypeOf('function');
    expect(kangurCmsPublic.KANGUR_WIDGET_OPTIONS).toBeDefined();
  });

  it('exposes representative runtime pages and hooks', () => {
    expect(kangurCmsPublic.KangurFeaturePage).toBeDefined();
    expect(kangurCmsPublic.Lessons).toBeDefined();
    expect(kangurCmsPublic.useKangurProgressState).toBeTypeOf('function');
    expect(kangurCmsPublic.useOptionalKangurRouting).toBeTypeOf('function');
  });

  it('exposes representative widget entries used by CMS rendering', () => {
    expect(kangurCmsPublic.KangurLessonsCatalogWidget).toBeDefined();
    expect(kangurCmsPublic.KangurGameQuestionWidget).toBeDefined();
    expect(kangurCmsPublic.KangurParentDashboardHeroWidget).toBeDefined();
  });
});
