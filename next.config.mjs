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
  output: "standalone", // Docker-friendly build output
  experimental: {
    // Default proxy body clone limit (~10MB) is too low for multi-image product forms.
    // Raise it so multipart requests don't fail before route handlers read formData().
    proxyClientMaxBodySize: "50mb",
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
  turbopack: {},
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
        destination: "/admin/products/builder",
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
