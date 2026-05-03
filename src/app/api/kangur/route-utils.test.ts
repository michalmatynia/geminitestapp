import { describe, expect, it } from 'vitest';

import { resolveKangurApiPathSegments } from './route-utils';

describe('resolveKangurApiPathSegments', () => {
  it('uses the request URL when the path param is missing', () => {
    const request = {
      url: 'http://localhost/api/kangur/auth/me',
      nextUrl: new URL('http://localhost/api/kangur/auth/me'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual(['auth', 'me']);
  });

  it('returns the provided path array when available', () => {
    const request = {
      url: 'http://localhost/api/kangur/auth/me',
      nextUrl: new URL('http://localhost/api/kangur/auth/me'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: { path: ['auth', 'me'] } });
    expect(segments).toEqual(['auth', 'me']);
  });

  it('wraps a single string path param into a segment array', () => {
    const request = {
      url: 'http://localhost/api/kangur/scores',
      nextUrl: new URL('http://localhost/api/kangur/scores'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: { path: 'scores' } });
    expect(segments).toEqual(['scores']);
  });

  it('ignores an empty string path param and falls back to the URL', () => {
    const request = {
      url: 'http://localhost/api/kangur/duels/lobby',
      nextUrl: new URL('http://localhost/api/kangur/duels/lobby'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: { path: '' } });
    expect(segments).toEqual(['duels', 'lobby']);
  });

  it('handles a trailing slash in the URL', () => {
    const request = {
      url: 'http://localhost/api/kangur/auth/me/',
      nextUrl: new URL('http://localhost/api/kangur/auth/me/'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual(['auth', 'me']);
  });

  it('falls back to request.url when nextUrl is unavailable', () => {
    const request = {
      url: 'http://localhost/api/kangur/duels/lobby?limit=12',
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual(['duels', 'lobby']);
  });

  it('handles nested duels lobby stream paths', () => {
    const request = {
      url: 'http://localhost/api/kangur/duels/lobby/stream',
      nextUrl: new URL('http://localhost/api/kangur/duels/lobby/stream'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual(['duels', 'lobby', 'stream']);
  });

  it('accepts the browser-facing kangur-api prefix', () => {
    const request = {
      url: 'http://localhost/kangur-api/lesson-sections?subject=maths',
      nextUrl: new URL('http://localhost/kangur-api/lesson-sections?subject=maths'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual(['lesson-sections']);
  });

  it('returns an empty array when URL does not match the API prefix', () => {
    const request = {
      url: 'http://localhost/health',
      nextUrl: new URL('http://localhost/health'),
    } as Request;
    const segments = resolveKangurApiPathSegments(request, { params: {} });
    expect(segments).toEqual([]);
  });
});
