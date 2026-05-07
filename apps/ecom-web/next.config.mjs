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

const fileUploadsRemotePattern = buildUploadsRemotePattern(process.env.NEXT_PUBLIC_FILE_BASE_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(fileUploadsRemotePattern ? [fileUploadsRemotePattern] : []),
      // Main app served locally in development
      { protocol: 'http',  hostname: 'localhost', port: '3000', pathname: '/api/files/**' },
      { protocol: 'http',  hostname: 'localhost', port: '3001', pathname: '/api/files/**' },
      // Any HTTPS host (covers staging / production deployments)
      { protocol: 'https', hostname: '**',        pathname: '/api/files/**' },
    ],
  },
};

export default nextConfig;
