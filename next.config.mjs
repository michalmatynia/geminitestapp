import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
// VERCEL=1 is set automatically by Vercel on all build/deploy containers.
// output:'standalone' is only needed for Docker/self-hosted deploys; enabling
// it on Vercel adds unnecessary filesystem work (tracing + copying node_modules)
// that contributes to the 45-minute build timeout.
const isVercel = Boolean(process.env.VERCEL);
// Turbopack builds do not emit output file tracing manifests yet, so standalone
// output will fail to copy traced files. Use webpack builds when standalone
// artifacts are required (see npm run build:webpack).
const isTurbopack =
  Boolean(process.env.TURBOPACK) &&
  process.env.TURBOPACK !== '0' &&
  process.env.TURBOPACK !== 'false';
const requestedDevBundler =
  typeof process.env.NEXT_DEV_BUNDLER === 'string'
    ? process.env.NEXT_DEV_BUNDLER.trim().toLowerCase()
    : '';
const isPlaywrightBrokerRuntime = Boolean(
  process.env.PLAYWRIGHT_RUNTIME_LEASE_KEY || process.env.PLAYWRIGHT_RUNTIME_AGENT_ID
);
const explicitBuildCpus = Number.parseInt(process.env.NEXT_BUILD_CPUS ?? '', 10);
// Webpack page-data generation becomes unreliable on the default Vercel builder
// when it fans out work, so cap at 1 worker for webpack. Turbopack handles its
// own parallelism in its Rust runtime and should use the default CPU count.
const buildWorkerCpuLimit = Number.isFinite(explicitBuildCpus)
  ? Math.max(1, explicitBuildCpus)
  : isTurbopack
    ? undefined
    : 1;
const optimizePackageImports = [
  'lucide-react',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-label',
  '@radix-ui/react-menu',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  'date-fns',
  'lodash',
  'react-syntax-highlighter',
  'three',
  '@react-three/drei',
  '@react-three/fiber',
  '@react-three/postprocessing',
  'postprocessing',
  'papaparse',
  'gsap',
  'zod',
  'framer-motion',
];
const outputFileTracingExcludes = {
  // These directories hold local runtime artifacts and user data. When server code
  // references them via process.cwd(), @vercel/nft can conservatively trace the
  // entire directory tree, which explodes Vercel function size.
  '/*': [
    './public/uploads/**/*',
    './mongo/backups/**/*',
    './tmp/**/*',
    './playwright-debug/**/*',
    './test-results/**/*',
    './node_modules/.cache/**/*',
  ],
  '/api/ai-paths/playwright/[runId]/artifacts/[file]': ['./test-results/**/*'],
};
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https: wss: ws:",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join('; ');
const distPackageJsonAsset = '{"type":"commonjs"}';

const ensureFileCopy = async (sourcePath, targetPath) => {
  try {
    await copyFile(sourcePath, targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
};

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  ...(isDev
    ? {
        allowedDevOrigins: ['127.0.0.1', '::1'],
      }
    : {}),
  // Keep dev artifacts separate from production builds to avoid lock/cache races
  // when `next build` and `next dev` are triggered in parallel.
  distDir: process.env.NEXT_DIST_DIR || (isDev ? '.next-dev' : '.next'),
  compress: true, // Ensure gzip compression is enabled
  outputFileTracingExcludes,
  // Standalone output is needed for Docker/self-hosted deploys (see Dockerfile).
  // On Vercel, Vercel manages deployment itself and standalone output only adds
  // expensive file-tracing work that can push builds past the 45-minute limit.
  ...(isVercel || isTurbopack
    ? {}
    : {
        output: 'standalone',
        outputFileTracingRoot: __dirname,
      }),
  // Skip TypeScript type-checking during `next build` — already enforced in CI.
  // Saves ~5-10 minutes on a 5926-file project.
  typescript: { ignoreBuildErrors: true },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // Webpack page-data workers fan out aggressively and trigger OOM on Vercel;
    // cap at 1 for webpack. Turbopack handles parallelism in Rust and should
    // use the default CPU count for faster builds.
    ...(isDev || buildWorkerCpuLimit === undefined ? {} : { cpus: buildWorkerCpuLimit }),
    // Default proxy body clone limit (~10MB) is too low for multi-image product forms.
    // Raise it so multipart requests don't fail before route handlers read formData().
    proxyClientMaxBodySize: '50mb',
    // Turbopack production builds keep their own persistent cache under distDir/cache.
    // Enable it for the isolated Turbopack lane so repeated stabilization runs and
    // cached CI/Vercel builds can reuse prior work instead of recompiling the full graph.
    ...(isTurbopack ? { turbopackFileSystemCacheForBuild: true } : {}),
    // Turbopack is more stable in this repo when it resolves packages normally
    // instead of rewriting import graphs through optimizePackageImports.
    ...(isTurbopack ? {} : { optimizePackageImports }),
  },
  serverExternalPackages: [
    'bcrypt',
    'bullmq',
    '@grpc/grpc-js',
    'ioredis',
    // Keep Node-only OpenTelemetry SDK/exporters external so webpack doesn't try
    // to bundle optional gRPC internals into instrumentation builds.
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-logs-otlp-grpc',
    '@opentelemetry/exporter-logs-otlp-http',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/otlp-grpc-exporter-base',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-logs',
    '@opentelemetry/sdk-node',
    // Turbopack struggles to bundle Playwright assets (ttf/html) pulled via playwright-core internals.
    // Keep Playwright external on the server bundle.
    'playwright',
    'playwright-core',
    // MongoDB driver pulls in Node built-ins that Turbopack currently struggles to bundle.
    'mongodb',
    // Native image processing is Node-only and should stay external in server builds.
    'sharp',
    // instrumentation-winston lazily requires this optional transport at runtime.
    '@opentelemetry/winston-transport',
    // Node-only IMAP/mail-parsing libraries with native bindings — bundling them
    // inflates webpack memory usage significantly on constrained builders.
    'imapflow',
    'mailparser',
  ],
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@docs': path.resolve(__dirname, 'docs'),
      // Force a single three.js runtime even when transitive deps (e.g. stats-gl) ship nested copies.
      'stats-gl/node_modules/three': path.resolve(__dirname, 'node_modules/three'),
    },
  },
  webpack: (config, { isServer, webpack }) => {
    config.optimization = config.optimization || {};
    config.optimization.moduleIds = 'deterministic';
    config.optimization.minimize = process.env.NODE_ENV === 'production';

    if (isDev && requestedDevBundler === 'webpack' && isPlaywrightBrokerRuntime) {
      // Brokered Playwright runtimes already isolate their dist dir. Keep webpack
      // cache in memory to avoid ENOSPC and partial on-disk cache writes during
      // accessibility/browser smoke runs on near-full local volumes.
      config.cache = { type: 'memory' };
    }

    // Prevent webpack dev server from triggering HMR rebuilds when files are
    // written to public/uploads/ (e.g. batch screenshot captures).
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.git/**', '**/public/uploads/**'],
    };

    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@docs'] = path.resolve(__dirname, 'docs');
    config.resolve.alias['three'] = path.resolve(__dirname, 'node_modules/three');
    config.resolve.alias['stats-gl/node_modules/three'] = path.resolve(
      __dirname,
      'node_modules/three'
    );
    config.resolve.alias['@opentelemetry/winston-transport'] = false;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js$/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    if (!isServer) {
      config.plugins ??= [];
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.thisCompilation.tap('CommonJsDistPackageJsonPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'CommonJsDistPackageJsonPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
              },
              () => {
                compilation.emitAsset(
                  'package.json',
                  new webpack.sources.RawSource(distPackageJsonAsset)
                );
              }
            );
          });
        },
      });
    } else {
      config.plugins ??= [];
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise('ProxyTraceCompatPlugin', async () => {
            const outputPath = compiler.outputPath;
            await ensureFileCopy(
              path.join(outputPath, 'middleware.js'),
              path.join(outputPath, 'proxy.js')
            );
            await ensureFileCopy(
              path.join(outputPath, 'middleware.js.nft.json'),
              path.join(outputPath, 'proxy.js.nft.json')
            );
          });
        },
      });
    }
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
    localPatterns: [
      // Allow signed/download-style local image URLs that use query params.
      { pathname: '/api/files/download' },
      // Keep the secure default for all other local paths: no query string.
      { pathname: '/**', search: '' },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/your_imagekit_id/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.cdn.baselinker.com',
      },
      {
        protocol: 'https',
        hostname: 'milkbardesigners.com',
        port: '',
        pathname: '/milkbardesigners.com/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin/products/constructor',
        destination: '/admin/products/settings',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=15552000; includeSubDomains',
                },
              ]),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
