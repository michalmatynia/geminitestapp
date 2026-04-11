import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  analyzeClientBoundaries,
  analyzeClientBoundaryFile,
  auditClientBoundaries,
} from './lib/client-boundary-audit.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'client-boundaries-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('client boundary audit', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags missing use client for custom hooks and dynamic ssr false', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/admin/page.tsx',
      [
        "import { MediaLibraryPanel } from '@/features/cms/components/MediaLibraryPanel';",
        '',
        'export default function Page() {',
        '  return <MediaLibraryPanel />;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/cms/components/MediaLibraryPanel.tsx',
      [
        "import dynamic from 'next/dynamic';",
        "import { useToast } from '@/shared/ui/primitives.public';",
        '',
        'const FileManager = dynamic(() => import(\'@/features/files/public\'), { ssr: false });',
        '',
        'export function MediaLibraryPanel() {',
        '  const { toast } = useToast();',
        '  void toast;',
        '  return <FileManager />;',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeClientBoundaries({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'missing-use-client:custom-hook',
          file: 'src/features/cms/components/MediaLibraryPanel.tsx',
        }),
        expect.objectContaining({
          ruleId: 'missing-use-client:dynamic-ssr-false',
          file: 'src/features/cms/components/MediaLibraryPanel.tsx',
        }),
      ])
    );
  });

  it('flags wrapper modules around NextIntlClientProvider', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/layout.tsx',
      [
        "import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';",
        '',
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        "  return <AppIntlProvider locale='en'>{children}</AppIntlProvider>;",
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/shared/providers/AppIntlProvider.tsx',
      [
        "import { NextIntlClientProvider } from 'next-intl';",
        '',
        'export function AppIntlProvider(props: { children: React.ReactNode; locale: string }) {',
        '  return <NextIntlClientProvider {...props} />;',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeClientBoundaries({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'missing-use-client:next-intl-client-provider',
          file: 'src/shared/providers/AppIntlProvider.tsx',
        }),
      ])
    );
  });

  it('flags app router error entrypoints that omit use client', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/admin/error.tsx',
      [
        'export default function ErrorFallback() {',
        '  return <div>Something went wrong.</div>;',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeClientBoundaries({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'missing-use-client:app-router-error-entrypoint',
          file: 'src/app/admin/error.tsx',
        }),
      ])
    );
  });

  it('flags missing use client for imported strict context factories', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/admin/page.tsx',
      [
        "import { CategoryFormContext } from '@/features/products/components/settings/CategoryFormContext';",
        '',
        'export default function Page() {',
        '  return <CategoryFormContext.Provider value={null} />;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/shared/lib/react/createStrictContext.ts',
      [
        "'use client';",
        '',
        "import { createContext, useContext } from 'react';",
        '',
        'export function createStrictContext() {',
        '  const Context = createContext(null);',
        '  return {',
        '    Context,',
        '    useStrictContext() {',
        '      return useContext(Context);',
        '    },',
        '  };',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/products/components/settings/CategoryFormContext.tsx',
      [
        "import { createStrictContext } from '@/shared/lib/react/createStrictContext';",
        '',
        'export const CategoryFormContext = createStrictContext();',
        '',
      ].join('\n')
    );

    const report = analyzeClientBoundaries({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'missing-use-client:context-factory',
          file: 'src/features/products/components/settings/CategoryFormContext.tsx',
        }),
      ])
    );
  });

  it('does not flag server components that only render imported client components', () => {
    const file = analyzeClientBoundaryFile({
      root: '/repo',
      absolutePath: '/repo/src/app/page.tsx',
      content: [
        "import { Search } from '@/components/Search';",
        '',
        'export default function Page() {',
        '  return <Search />;',
        '}',
        '',
      ].join('\n'),
    });

    expect(file.reasons).toEqual([]);
    expect(file.isRemovableCandidate).toBe(false);
  });

  it('ignores browser-like text and locally scoped window variables', () => {
    const file = analyzeClientBoundaryFile({
      root: '/repo',
      absolutePath: '/repo/src/app/layout.tsx',
      content: [
        'const fallbackScript = Promise.resolve(\'window.__BOOTSTRAP__=null;\');',
        'const isBrowser = typeof window !== \'undefined\';',
        '',
        'function formatWindow(window: { currentStartMs: number }) {',
        '  return window.currentStartMs;',
        '}',
        '',
        'export default async function Layout() {',
        '  return isBrowser ? fallbackScript : Promise.resolve(null);',
        '}',
        '',
      ].join('\n'),
    });

    expect(file.reasons).toEqual([]);
  });

  it('flags actual browser globals but ignores test-only support files', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/page.tsx',
      [
        "import { RuntimeWidget } from '@/features/example/runtime';",
        '',
        'export default function Page() {',
        '  return <RuntimeWidget />;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/example/runtime.tsx',
      [
        'export function RuntimeWidget() {',
        '  return <div>{window.location.href}</div>;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/example/__tests__/runtimeMockComponents.tsx',
      [
        'export function RuntimeMock() {',
        '  return <button onClick={() => undefined}>Click</button>;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/example/helper.test-support.ts',
      [
        'export function buildTestWindow(window: { value: number }) {',
        '  return window.value;',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeClientBoundaries({ root });

    expect(report.issues).toEqual([
      expect.objectContaining({
        ruleId: 'missing-use-client:browser-api',
        file: 'src/features/example/runtime.tsx',
      }),
    ]);
  });

  it('reports use client files without signals as review candidates', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/products/pages/AdminProductsPageView.tsx',
      [
        "'use client';",
        '',
        "import { ProductListPanel } from '@/features/products/components/ProductListPanel';",
        '',
        'export function AdminProductsPageView() {',
        '  return <ProductListPanel />;',
        '}',
        '',
      ].join('\n')
    );

    const audit = auditClientBoundaries({ root });

    expect(audit.removableCandidates).toEqual([
      expect.objectContaining({
        relativePath: 'src/features/products/pages/AdminProductsPageView.tsx',
      }),
    ]);
  });

  it('does not report strict context modules as removable candidates', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/shared/lib/react/createStrictContext.ts',
      [
        "'use client';",
        '',
        "import { createContext, useContext } from 'react';",
        '',
        'export function createStrictContext() {',
        '  const Context = createContext(null);',
        '  return {',
        '    Context,',
        '    useStrictContext() {',
        '      return useContext(Context);',
        '    },',
        '  };',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/products/components/settings/CategoryFormContext.tsx',
      [
        "'use client';",
        '',
        "import { createStrictContext } from '@/shared/lib/react/createStrictContext';",
        '',
        'export const CategoryFormContext = createStrictContext();',
        '',
      ].join('\n')
    );

    const audit = auditClientBoundaries({ root });

    expect(audit.removableCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: 'src/features/products/components/settings/CategoryFormContext.tsx',
        }),
      ])
    );
  });

  it('does not report app router error entrypoints as removable candidates', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/admin/error.tsx',
      [
        "'use client';",
        '',
        'export default function ErrorFallback() {',
        '  return <div>Something went wrong.</div>;',
        '}',
        '',
      ].join('\n')
    );

    const audit = auditClientBoundaries({ root });

    expect(audit.removableCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: 'src/app/admin/error.tsx',
        }),
      ])
    );
  });
});
