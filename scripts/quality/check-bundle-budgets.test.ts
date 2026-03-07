import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeBundleBudgets } from './lib/check-bundle-budgets.mjs';

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-budgets-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativeFile: string, contents: string) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

const writeSizedChunk = (root: string, relativeFile: string, size: number) => {
  writeFile(root, relativeFile, 'x'.repeat(size));
};

const writeBuildArtifacts = ({
  root,
  routeKey = '/(admin)/admin/example/page',
  route = '/admin/example',
  serverAppPath = 'app/(admin)/admin/example/page.js',
  routeChunks = ['static/chunks/example.js'],
}: {
  root: string;
  routeKey?: string;
  route?: string;
  serverAppPath?: string;
  routeChunks?: string[];
}) => {
  writeFile(
    root,
    '.next/build-manifest.json',
    JSON.stringify(
      {
        polyfillFiles: ['static/chunks/polyfills.js'],
        rootMainFiles: ['static/chunks/main-app.js'],
        pages: { '/_app': [] },
      },
      null,
      2
    )
  );
  writeFile(root, '.next/app-path-routes-manifest.json', JSON.stringify({ [routeKey]: route }, null, 2));
  writeFile(
    root,
    '.next/server/app-paths-manifest.json',
    JSON.stringify({ [routeKey]: serverAppPath }, null, 2)
  );
  writeFile(
    root,
    `.next/server/${serverAppPath.replace(/\.js$/, '_client-reference-manifest.js')}`,
    `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[${JSON.stringify(
      routeKey
    )}]={moduleLoading:{prefix:"/_next/"},clientModules:{entry:{id:1,name:"default",chunks:${JSON.stringify(
      routeChunks
    )},async:false}},ssrModuleMapping:{},edgeSSRModuleMapping:{},entryCSSFiles:{},rscModuleMapping:{},edgeRscModuleMapping:{}};`
  );
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe('analyzeBundleBudgets', () => {
  it('passes routes that stay within shared and route budgets', () => {
    const root = createTempRoot();
    writeBuildArtifacts({ root });
    writeSizedChunk(root, '.next/static/chunks/polyfills.js', 40);
    writeSizedChunk(root, '.next/static/chunks/main-app.js', 60);
    writeSizedChunk(root, '.next/static/chunks/example.js', 180);

    const report = analyzeBundleBudgets({
      root,
      buildDir: path.join(root, '.next'),
      config: {
        sharedBase: { maxBytes: 200, maxChunkCount: 3 },
        routes: [
          {
            id: 'example',
            name: 'Example',
            route: '/admin/example',
            maxTotalBytes: 320,
            maxRouteBytes: 220,
            maxChunkCount: 4,
          },
        ],
      },
    });

    expect(report.summary.errorCount).toBe(0);
    expect(report.base.bytes).toBe(100);
    expect(report.routes[0]).toEqual(
      expect.objectContaining({
        status: 'pass',
        totalBytes: 280,
        routeBytes: 180,
        chunkCount: 3,
      })
    );
  });

  it('fails when required build artifacts are missing', () => {
    const root = createTempRoot();
    const report = analyzeBundleBudgets({
      root,
      buildDir: path.join(root, '.next'),
      config: { sharedBase: { maxBytes: 100, maxChunkCount: 2 }, routes: [] },
    });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'bundle-build-artifact-missing' }),
      ])
    );
  });

  it('fails routes that exceed byte and chunk budgets', () => {
    const root = createTempRoot();
    writeBuildArtifacts({
      root,
      routeChunks: ['static/chunks/example-a.js', 'static/chunks/example-b.js'],
    });
    writeSizedChunk(root, '.next/static/chunks/polyfills.js', 50);
    writeSizedChunk(root, '.next/static/chunks/main-app.js', 50);
    writeSizedChunk(root, '.next/static/chunks/example-a.js', 240);
    writeSizedChunk(root, '.next/static/chunks/example-b.js', 220);

    const report = analyzeBundleBudgets({
      root,
      buildDir: path.join(root, '.next'),
      config: {
        sharedBase: { maxBytes: 120, maxChunkCount: 2 },
        routes: [
          {
            id: 'example',
            name: 'Example',
            route: '/admin/example',
            maxTotalBytes: 500,
            maxRouteBytes: 400,
            maxChunkCount: 3,
          },
        ],
      },
    });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'bundle-route-total-bytes-exceeded' }),
        expect.objectContaining({ ruleId: 'bundle-route-specific-bytes-exceeded' }),
        expect.objectContaining({ ruleId: 'bundle-route-chunk-count-exceeded' }),
      ])
    );
    expect(report.routes[0]?.status).toBe('fail');
  });

  it('resolves URL-encoded chunk paths from client manifests', () => {
    const root = createTempRoot();
    writeBuildArtifacts({
      root,
      routeKey: '/(frontend)/[...slug]/page',
      route: '/[...slug]',
      serverAppPath: 'app/(frontend)/[...slug]/page.js',
      routeChunks: ['static/chunks/app/(frontend)/%5B...slug%5D/page-slug.js'],
    });
    writeSizedChunk(root, '.next/static/chunks/polyfills.js', 30);
    writeSizedChunk(root, '.next/static/chunks/main-app.js', 40);
    writeSizedChunk(root, '.next/static/chunks/app/(frontend)/[...slug]/page-slug.js', 120);

    const report = analyzeBundleBudgets({
      root,
      buildDir: path.join(root, '.next'),
      config: {
        sharedBase: { maxBytes: 100, maxChunkCount: 3 },
        routes: [
          {
            id: 'catch-all',
            name: 'Catch All',
            route: '/[...slug]',
            maxTotalBytes: 220,
            maxRouteBytes: 160,
            maxChunkCount: 4,
          },
        ],
      },
    });

    expect(report.summary.errorCount).toBe(0);
    expect(report.routes[0]?.largestRouteChunks).toEqual([
      expect.objectContaining({
        path: 'static/chunks/app/(frontend)/[...slug]/page-slug.js',
        bytes: 120,
      }),
    ]);
  });
});
