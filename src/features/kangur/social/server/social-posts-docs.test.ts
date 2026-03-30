import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  buildKangurDocContext,
  resolveKangurDocAbsolutePath,
} from './social-posts-docs';

describe('resolveKangurDocAbsolutePath', () => {
  it('normalizes docs-prefixed Kangur markdown paths', () => {
    expect(resolveKangurDocAbsolutePath('docs/kangur/README.md')).toBe(
      path.resolve(process.cwd(), 'docs', 'kangur', 'README.md')
    );
    expect(resolveKangurDocAbsolutePath('/kangur/README.md')).toBe(
      path.resolve(process.cwd(), 'docs', 'kangur', 'README.md')
    );
  });

  it('rejects path traversal and unsupported extensions', () => {
    expect(resolveKangurDocAbsolutePath('../outside.md')).toBeNull();
    expect(resolveKangurDocAbsolutePath('docs/kangur/image.png')).toBeNull();
  });
});

describe('buildKangurDocContext', () => {
  it('strips localhost URLs from documentation excerpts used for social generation', async () => {
    const { context } = await buildKangurDocContext([
      {
        id: 'studiq-application-mobile-runtime',
        title: 'StudiQ application',
        summary: 'Mobile runtime layers and shared API surface.',
        docPath: 'docs/kangur/studiq-application.md',
        audience: 'admin',
        sectionsCovered: ['Mobile runtime layers'],
      } as never,
    ]);

    expect(context).toContain('[local development URL removed]');
    expect(context).not.toContain('http://localhost:3000');
    expect(context).not.toContain('10.0.2.2:3000');
  });
});
