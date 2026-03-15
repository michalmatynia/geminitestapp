import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
// VERCEL=1 is set automatically by Vercel on all build/deploy containers.
// output:'standalone' is only needed for Docker/self-hosted deploys; enabling
// it on Vercel adds unnecessary filesystem work (tracing + copying node_modules)
// that contributes to the 45-minute build timeout.
const isVercel = Boolean(process.env.VERCEL);
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
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
  // Keep dev artifacts separate from production builds to avoid lock/cache races
  // when `next build` and `next dev` are triggered in parallel.
  distDir: process.env.NEXT_DIST_DIR || (isDev ? '.next-dev' : '.next'),
  compress: true, // Ensure gzip compression is enabled
  // Standalone output is needed for Docker/self-hosted deploys (see Dockerfile).
  // On Vercel, Vercel manages deployment itself and standalone output only adds
  // expensive file-tracing work that can push builds past the 45-minute limit.
  ...(isVercel
    ? {}
    : {
        output: 'standalone',
        outputFileTracingRoot: __dirname,
        outputFileTracingExcludes: {
          '/api/ai-paths/playwright/[runId]/artifacts/[file]': ['./test-results/**/*'],
        },
      }),
  // Skip TypeScript type-checking during `next build` — already enforced in CI.
  // Saves ~5-10 minutes on a 5926-file project.
  typescript: { ignoreBuildErrors: true },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // Default proxy body clone limit (~10MB) is too low for multi-image product forms.
    // Raise it so multipart requests don't fail before route handlers read formData().
    proxyClientMaxBodySize: '50mb',
    // Limit worker processes to 1 — each worker inherits NODE_OPTIONS heap size.
    cpus: 1,
    // Run webpack in the main process instead of a separate worker.
    // Avoids spawning a second Node process that doubles heap usage on Vercel (8GB limit).
    webpackBuildWorker: false,
    optimizePackageImports: [
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
    ],
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

    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@docs'] = path.resolve(__dirname, 'docs');
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

export default nextConfig;
