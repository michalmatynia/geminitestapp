import { createRequire } from 'node:module';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  inspectForbiddenManualQueryExecutionSourceFile,
} = require('../../../scripts/query/check-factory-meta.cjs') as {
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
});
