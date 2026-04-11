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
        '',
        'function formatWindow(window: { currentStartMs: number }) {',
        '  return window.currentStartMs;',
        '}',
        '',
        'export default async function Layout() {',
        '  return fallbackScript;',
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
        "import { readLocation } from '@/features/example/runtime';",
        '',
        'export default function Page() {',
        '  return <div>{readLocation()}</div>;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/features/example/runtime.ts',
      [
        'export function readLocation() {',
        '  return window.location.href;',
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
        file: 'src/features/example/runtime.ts',
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
});
