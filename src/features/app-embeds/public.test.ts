import { describe, expect, it } from 'vitest';

import * as appEmbedsPublic from './public';

describe('app-embeds public barrel', () => {
  it('continues exposing the admin page and provider surface', () => {
    expect(appEmbedsPublic).toHaveProperty('AdminAppEmbedsPage');
    expect(appEmbedsPublic).toHaveProperty('AppEmbedsProvider');
    expect(appEmbedsPublic).toHaveProperty('useAppEmbeds');
  });

  it('continues exposing embed constants', () => {
    expect(appEmbedsPublic).toHaveProperty('APP_EMBED_OPTIONS');
  });
});
