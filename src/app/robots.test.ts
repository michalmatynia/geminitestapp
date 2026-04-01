import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots metadata route', () => {
  it('keeps crawlers away from internal and dynamic application surfaces', () => {
    const metadata = robots();
    const primaryRule = Array.isArray(metadata.rules) ? metadata.rules[0] : metadata.rules;

    expect(primaryRule).toMatchObject({
      userAgent: '*',
      allow: ['/'],
    });
    expect(primaryRule?.disallow).toEqual(
      expect.arrayContaining(['/admin/', '/api/', '/auth/', '/login', '/preview/'])
    );
  });
});
