'use client';

import {
  createContext,
  useContext,
  type JSX,
  type ReactNode,
} from 'react';
import { SITE_CONTENT_DEFAULTS, type SiteContent } from '@/data/siteContent';

const SiteContentContext = createContext<SiteContent>(SITE_CONTENT_DEFAULTS);

export function SiteContentProvider({
  content,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}): JSX.Element {
  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
