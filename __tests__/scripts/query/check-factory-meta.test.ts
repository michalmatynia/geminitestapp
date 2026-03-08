import { createRequire } from 'node:module';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  inspectFactoryMetaSourceFile,
  inspectForbiddenManualQueryExecutionSourceFile,
} = require('../../../scripts/query/check-factory-meta.cjs') as {
  inspectFactoryMetaSourceFile: (
    source: string,
    relFilePath: string,
    scriptKind: ts.ScriptKind
  ) => Array<{ file: string; line: number; callName: string; message: string }>;
  inspectForbiddenManualQueryExecutionSourceFile: (
    source: string,
    relFilePath: string,
    scriptKind: ts.ScriptKind
  ) => Array<{ file: string; line: number; callName: string; message: string }>;
};

describe('check-factory-meta script', () => {
  it('allows raw manual query execution in the helper implementation file', () => {
    const issues = inspectForbiddenManualQueryExecutionSourceFile(
      `
      queryClient.fetchQuery({});
      queryClient.prefetchQuery({});
      queryClient.ensureQueryData({});
      `,
      'src/shared/lib/query-factories-v2.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([]);
  });

  it('flags raw fetchQuery outside the helper implementation file', () => {
    const issues = inspectForbiddenManualQueryExecutionSourceFile(
      'queryClient.fetchQuery({ queryKey: ["products"] });',
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([
      expect.objectContaining({
        file: 'src/features/products/hooks/useProductsQuery.ts',
        callName: 'fetchQuery',
      }),
    ]);
  });

  it('flags raw prefetchQuery outside the helper implementation file', () => {
    const issues = inspectForbiddenManualQueryExecutionSourceFile(
      'client.prefetchQuery({ queryKey: ["products"] });',
      'e2e/features/products/prefetch-helper.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([
      expect.objectContaining({
        file: 'e2e/features/products/prefetch-helper.ts',
        callName: 'prefetchQuery',
      }),
    ]);
  });

  it('flags raw ensureQueryData outside the helper implementation file', () => {
    const issues = inspectForbiddenManualQueryExecutionSourceFile(
      'client.ensureQueryData({ queryKey: ["products"] });',
      'scripts/query/tmp-check.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([
      expect.objectContaining({
        file: 'scripts/query/tmp-check.ts',
        callName: 'ensureQueryData',
      }),
    ]);
  });

  it('flags low-signal placeholder descriptions in factory metadata', () => {
    const issues = inspectFactoryMetaSourceFile(
      `
      createListQueryV2({
        queryKey: ['products'],
        queryFn: async () => [],
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          domain: 'products',
          description: 'Loads list.',
        },
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([
      expect.objectContaining({
        file: 'src/features/products/hooks/useProductsQuery.ts',
        callName: 'createListQueryV2',
        message: expect.stringContaining('too generic'),
      }),
    ]);
  });

  it('allows concrete resource-specific descriptions in factory metadata', () => {
    const issues = inspectFactoryMetaSourceFile(
      `
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
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([]);
  });

  it('allows multi-query factories without a top-level queryKey', () => {
    const issues = inspectFactoryMetaSourceFile(
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
              description: 'Loads the first products batch.',
            },
          },
          {
            queryKey: ['products', 'two'],
            queryFn: async () => [],
            meta: {
              source: 'products.hooks.two',
              operation: 'list',
              resource: 'products',
              domain: 'products',
              description: 'Loads the second products batch.',
            },
          },
        ] as const,
      });
      `,
      'src/features/products/hooks/useProductsQuery.ts',
      ts.ScriptKind.TS
    );

    expect(issues).toEqual([]);
  });

  it('flags top-level queryKey on multi-query factories and missing nested descriptions', () => {
    const issues = inspectFactoryMetaSourceFile(
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

    expect(issues).toEqual([
      expect.objectContaining({
        callName: 'createMultiQueryV2',
        message: expect.stringContaining('top-level `queryKey`'),
      }),
      expect.objectContaining({
        callName: 'createMultiQueryV2',
        message: expect.stringContaining('missing `description` in multi-query descriptor'),
      }),
    ]);
  });
});
