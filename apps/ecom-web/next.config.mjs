/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Main app served locally in development
      { protocol: 'http',  hostname: 'localhost', port: '3000', pathname: '/api/files/**' },
      { protocol: 'http',  hostname: 'localhost', port: '3001', pathname: '/api/files/**' },
      // Any HTTPS host (covers staging / production deployments)
      { protocol: 'https', hostname: '**',        pathname: '/api/files/**' },
    ],
  },
};

export default nextConfig;
