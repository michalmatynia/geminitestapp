/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['gsap', '@gsap/react', 'three'],
  },
};

export default nextConfig;
