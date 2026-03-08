import { createRequire } from 'node:module';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { fixFactoryMetaSourceText } = require('../../../scripts/query/fix-factory-meta.cjs') as {
  fixFactoryMetaSourceText: (
    source: string,
    relFilePath: string,
    scriptKind?: ts.ScriptKind
  ) => string;
};

describe('fix-factory-meta script', () => {
  it('adds a generated description when meta.description is missing', () => {
    const output = fixFactoryMetaSourceText(
      `
      createListQueryV2({
        queryKey: ['products'],
        queryFn: async () => [],
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          domain: 'products',
        },
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(output).toContain("description: 'Loads products.',");
  });

  it('rewrites legacy generated descriptions to the newer style', () => {
    const output = fixFactoryMetaSourceText(
      `
      createListQueryV2({
        queryKey: ['products'],
        queryFn: async () => [],
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          domain: 'products',
          description: 'Tracks list requests for products.',
        },
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(output).toContain("description: 'Loads products.',");
    expect(output).not.toContain('Tracks list requests for products.');
  });

  it('cleans malformed standalone comma lines before applying edits', () => {
    const output = fixFactoryMetaSourceText(
      `
      createListQueryV2({
        queryKey: ['products'],
        queryFn: async () => [],
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          tags: ['products'],
          ,
          domain: 'products',
        },
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(output).not.toContain('\n          ,\n');
    expect(output).toContain("description: 'Loads products.',");
  });

  it('does not insert synthetic top-level query keys for multi-query factories', () => {
    const output = fixFactoryMetaSourceText(
      `
      createMultiQueryV2({
        queries: [
          {
            queryKey: ['products', 'one'],
            queryFn: async () => [],
            meta: {
              source: 'products.hooks.one',
              operation: 'list',
              resource: 'products',
              domain: 'products',
            },
          },
        ] as const,
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    const queryKeyMatches = output.match(/queryKey:/g) ?? [];
    expect(output).not.toContain("['factory-meta'");
    expect(queryKeyMatches).toHaveLength(1);
  });

  it('adds descriptions inside mapped multi-query descriptors and removes the dead top-level queryKey', () => {
    const output = fixFactoryMetaSourceText(
      `
      createMultiQueryV2({
        queryKey: ['legacy-group'],
        queries: ids.map((id) => ({
          queryKey: ['products', id],
          queryFn: async () => [],
          meta: {
            source: 'products.hooks.useMultiProducts',
            operation: 'detail',
            resource: 'products',
            domain: 'products',
          },
        })),
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(output).not.toContain("queryKey: ['legacy-group']");
    expect(output).toContain("description: 'Loads products.',");
  });

  it('preserves custom descriptions that are already concrete', () => {
    const source = `
      createListQueryV2({
        queryKey: ['products'],
        queryFn: async () => [],
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          domain: 'products',
          description: 'Loads products for the current filters.',
        },
      });
      `;

    const output = fixFactoryMetaSourceText(
      source,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(output).toContain('Loads products for the current filters.');
    expect(output).toBe(source);
  });
});
