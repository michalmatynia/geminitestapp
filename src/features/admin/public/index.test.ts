import { describe, expect, it } from 'vitest';

import * as adminPublic from './index';

describe('admin public barrel', () => {
  it('continues exposing the admin layout surface', () => {
    expect(adminPublic).toHaveProperty('AdminLayout');
    expect(adminPublic).toHaveProperty('AdminRouteLoading');
    expect(adminPublic).toHaveProperty('AdminLayoutProvider');
  });

  it('continues exposing admin navigation and favorites runtime helpers', () => {
    expect(adminPublic).toHaveProperty('buildAdminNav');
    expect(adminPublic).toHaveProperty('flattenAdminNav');
    expect(adminPublic).toHaveProperty('ADMIN_MENU_FAVORITES_KEY');
    expect(adminPublic).toHaveProperty('AdminFavoritesRuntimeProvider');
  });
});
