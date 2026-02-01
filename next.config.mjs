/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Docker-friendly build output
  serverExternalPackages: [
    '@prisma/client',
    'bcrypt',
  ],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        path: false,
        child_process: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
      };
    }
    
    // Exclude playwright and other Node.js specific modules from client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'playwright-core': 'commonjs playwright-core',
        'playwright': 'commonjs playwright',
        'commander': 'commonjs commander',
      });
    }
    
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
        destination: "/admin/products/builder",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
