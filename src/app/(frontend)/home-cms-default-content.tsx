import { Sparkles } from 'lucide-react';
import Link from 'next/link';

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
            CMS Ready
          </p>
          <h1 className='mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl'>
            Welcome to {defaultSlug}
          </h1>
          <p className='mx-auto mt-3 max-w-xl text-sm text-[var(--cms-appearance-muted-text)] sm:text-base'>
            Your CMS homepage is set but it does not have any content blocks yet. Start building in
            the admin panel to replace this placeholder with your custom layout.
          </p>
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            <Link
              href='/admin'
              className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              Open CMS editor
            </Link>
            <Link
              href='/'
              className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
              prefetch={false}
            >
              Preview storefront
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
