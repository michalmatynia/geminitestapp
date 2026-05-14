import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFileTracingRoot = process.env.VERCEL
  ? __dirname
  : path.join(__dirname, '../../');

const buildUploadsRemotePattern = (baseUrl) => {
  const raw = baseUrl?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: '/uploads/**',
    };
  } catch {
    return null;
  }
};

const fileUploadBaseUrls = [
  'https://sparksofsindri.com',
  'https://qubrick.io',
  process.env.NEXT_PUBLIC_FILE_BASE_URL,
  process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL,
  process.env.NEXT_PUBLIC_MAIN_APP_URL,
  ...(process.env.NODE_ENV === 'production' ? [] : [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]),
];

const fileUploadsRemotePatterns = fileUploadBaseUrls.reduce((patterns, baseUrl) => {
  const pattern = buildUploadsRemotePattern(baseUrl);
  if (!pattern) return patterns;
  const patternKey = `${pattern.protocol}://${pattern.hostname}:${pattern.port ?? ''}${pattern.pathname}`;
  const alreadyConfigured = patterns.some((existingPattern) => {
    const existingPatternKey = `${existingPattern.protocol}://${existingPattern.hostname}:${existingPattern.port ?? ''}${existingPattern.pathname}`;
    return existingPatternKey === patternKey;
  });
  return alreadyConfigured ? patterns : [...patterns, pattern];
}, []);

const fileUploadImageSources = fileUploadBaseUrls.reduce((sources, baseUrl) => {
  const raw = baseUrl?.trim();
  if (!raw) return sources;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return sources;

    const source = url.origin;
    return sources.includes(source) ? sources : [...sources, source];
  } catch {
    return sources;
  }
}, []);

const scriptSrc = [
  "script-src 'self' 'unsafe-inline' https://geowidget.inpost.pl https://js.stripe.com https://www.paypal.com",
  ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"]),
].join(' ');

const imageSrc = [
  "img-src 'self' data: blob:",
  'https://*.googleapis.com',
  'https://*.gstatic.com',
  'https://geowidget.inpost.pl',
  'https://www.paypalobjects.com',
  ...fileUploadImageSources,
].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  imageSrc,
  "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://geowidget.inpost.pl",
  scriptSrc,
  "connect-src 'self' https://secure.snd.payu.com https://geowidget.inpost.pl https://qubrick.io https://sparksofsindri.com https://api.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-src 'self' https://geowidget.inpost.pl https://geowidget-app.inpost.pl https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self "https://geowidget.inpost.pl")' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // HSTS — only send on production (Vercel sets HTTPS; locally we run HTTP)
  ...(process.env.VERCEL ? [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  ] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot,
  experimental: {
    optimizePackageImports: ['gsap', '@gsap/react'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      ...fileUploadsRemotePatterns,
      // Main app served locally in development
      { protocol: 'http',  hostname: 'localhost', port: '3000', pathname: '/api/files/**' },
      { protocol: 'http',  hostname: 'localhost', port: '3001', pathname: '/api/files/**' },
      // Any HTTPS host (covers staging / production deployments)
      { protocol: 'https', hostname: '**',        pathname: '/api/files/**' },
    ],
  },
};

export default nextConfig;
