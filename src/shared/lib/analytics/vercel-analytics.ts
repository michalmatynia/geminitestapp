const ENABLE_VERCEL_ANALYTICS =
  process.env['NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS'] === 'true' ||
  (process.env['NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS'] !== 'false' &&
    Boolean(process.env['VERCEL_URL']));

export const shouldRenderVercelAnalytics = (): boolean => ENABLE_VERCEL_ANALYTICS;
