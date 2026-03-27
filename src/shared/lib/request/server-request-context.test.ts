import { describe, expect, it } from 'vitest';

import {
  readServerRequestHeaders,
  readServerRequestPathname,
  runWithServerRequestContext,
} from './server-request-context';

describe('server request context', () => {
  it('returns null values outside a request context', () => {
    expect(readServerRequestPathname()).toBeNull();
    expect(readServerRequestHeaders()).toBeNull();
  });

  it('exposes pathname and headers within a request context', () => {
    const requestHeaders = new Headers({
      'x-app-request-pathname': '/en/kangur',
      'x-test-header': 'ok',
    });

    runWithServerRequestContext(
      {
        pathname: '/en/kangur',
        requestUrl: '/en/kangur',
        headers: requestHeaders,
      },
      () => {
        expect(readServerRequestPathname()).toBe('/en/kangur');
        expect(readServerRequestHeaders()).toBe(requestHeaders);
        expect(readServerRequestHeaders()?.get('x-test-header')).toBe('ok');
      }
    );
  });
});
