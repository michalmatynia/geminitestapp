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
        child_process: false,
      };
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
