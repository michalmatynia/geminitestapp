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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
