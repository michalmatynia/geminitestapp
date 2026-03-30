'use client';

import { createNavigation } from 'next-intl/navigation';

import { siteRouting } from './routing';

export const { Link, getPathname, permanentRedirect, redirect, usePathname, useRouter } =
  createNavigation(siteRouting);
