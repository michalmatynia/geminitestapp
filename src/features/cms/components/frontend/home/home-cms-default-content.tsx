'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Link as LocaleLink } from '@/i18n/navigation';
import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import {
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/components/frontend/theme-styles';

export function HomeCmsDefaultContent(props: {
  themeSettings: Parameters<typeof getMediaStyleVars>[0];
  colorSchemes: React.ComponentProps<typeof CmsPageRenderer>['colorSchemes'];
  hasCmsContent: boolean;
  defaultSlug: string;
  rendererComponents: React.ComponentProps<typeof CmsPageRenderer>['components'];
}): React.JSX.Element {
  const translations = useTranslations('CmsHome');
  const { themeSettings, colorSchemes, hasCmsContent, defaultSlug, rendererComponents } = props;

  return hasCmsContent ? (
    <CmsPageRenderer
      components={rendererComponents}
      colorSchemes={colorSchemes}
      layout={{ fullWidth: Boolean(themeSettings.fullWidth) }}
      hoverEffect={themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined}
      hoverScale={themeSettings.enableAnimations ? themeSettings.hoverScale : undefined}
      mediaVars={getMediaStyleVars(themeSettings)}
      mediaStyles={getMediaInlineStyles(themeSettings)}
    />
  ) : (
    <section className='w-full py-16'>
      <div className='container px-4 md:px-6'>
        <div className='cms-appearance-subtle-surface rounded-3xl border p-8 text-center shadow-sm sm:p-12'>
          <span className='cms-appearance-surface mx-auto inline-flex size-12 items-center justify-center rounded-2xl border'>
            <Sparkles className='size-6' aria-hidden='true' />
          </span>
          <p className='mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
            {translations('readyEyebrow')}
          </p>
          <h1 className='mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl'>
            {translations('emptyTitle', { slug: defaultSlug })}
          </h1>
          <p className='mx-auto mt-3 max-w-xl text-sm text-[var(--cms-appearance-muted-text)] sm:text-base'>
            {translations('emptyDescription')}
          </p>
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            <Link
              href='/admin'
              className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              {translations('openEditor')}
            </Link>
            <LocaleLink
              href='/'
              className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              {translations('previewStorefront')}
            </LocaleLink>
          </div>
        </div>
      </div>
    </section>
  );
}
