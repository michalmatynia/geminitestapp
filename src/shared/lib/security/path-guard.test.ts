import path from 'path';

import { describe, expect, it } from 'vitest';

import { getSecurePath } from './path-guard';

describe('getSecurePath', () => {
  it('resolves nested paths inside the allowed root', () => {
    const root = path.resolve('/tmp', 'secure-root');

    expect(getSecurePath(root, path.join('nested', 'file.txt'))).toBe(
      path.resolve(root, 'nested', 'file.txt')
    );
  });

  it('allows resolving the root directory itself', () => {
    const root = path.resolve('/tmp', 'secure-root');

    expect(getSecurePath(root, '.')).toBe(root);
  });

  it('rejects path traversal outside the allowed root', () => {
    const root = path.resolve('/tmp', 'secure-root');

    expect(() => getSecurePath(root, path.join('..', 'escape.txt'))).toThrow(
      'Invalid filesystem path access attempt'
    );
  });
});
