'use client';

import { useEffect } from 'react';

type HtmlLangSyncProps = {
  locale: string;
};

export function HtmlLangSync({ locale }: HtmlLangSyncProps): null {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
