import { describe, expect, it } from 'vitest';

import { loadKangurSiteMessages, loadSiteMessages } from './messages';

describe('loadKangurSiteMessages', () => {
  it('keeps only Common and Kangur-root namespaces', async () => {
    const fullMessages = await loadSiteMessages('en');
    const kangurMessages = await loadKangurSiteMessages('en');
    const kangurKeys = Object.keys(kangurMessages);

    expect(kangurKeys.length).toBeGreaterThan(0);
    expect(kangurKeys.every((key) => key === 'Common' || key.startsWith('Kangur'))).toBe(true);
    expect(kangurMessages).toMatchObject({
      Common: fullMessages.Common,
      KangurGamePage: fullMessages.KangurGamePage,
    });
    expect(kangurMessages).not.toHaveProperty('Admin');
  });
});
