import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https: wss: ws:",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Keep dev artifacts separate from production builds to avoid lock/cache races
  // when `next build` and `next dev` are triggered in parallel.
  distDir: process.env.NEXT_DIST_DIR || (isDev ? '.next-dev' : '.next'),
  compress: true, // Ensure gzip compression is enabled
  output: "standalone", // Docker-friendly build output
  outputFileTracingRoot: __dirname,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    // Default proxy body clone limit (~10MB) is too low for multi-image product forms.
    // Raise it so multipart requests don't fail before route handlers read formData().
    proxyClientMaxBodySize: "50mb",
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'date-fns',
      'lodash',
    ],
  },
  serverExternalPackages: [
    '@prisma/client',
    'bcrypt',
    // Turbopack struggles to bundle Playwright assets (ttf/html) pulled via playwright-core internals.
    // Keep Playwright external on the server bundle.
    'playwright',
    'playwright-core',
    // MongoDB driver pulls in Node built-ins that Turbopack currently struggles to bundle.
    'mongodb',
  ],
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // Force a single three.js runtime even when transitive deps (e.g. stats-gl) ship nested copies.
      'stats-gl/node_modules/three': path.resolve(__dirname, 'node_modules/three'),
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['stats-gl/node_modules/three'] = path.resolve(__dirname, 'node_modules/three');
    return config;
  },
  images: {
    qualities: [75, 90],
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
        source: "/admin/products/constructor",
        destination: "/admin/products/settings",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "0",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=15552000; includeSubDomains",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
