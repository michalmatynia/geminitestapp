import createMiddleware from 'next-intl/middleware';

import { siteRouting } from '@/i18n/routing';

export default createMiddleware(siteRouting);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
