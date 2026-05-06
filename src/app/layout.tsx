/**
 * Root Layout Component
 * 
 * Top-level layout for the Next.js application providing global setup.
 * Handles:
 * - Global provider configuration and context setup
 * - Internationalization and locale management
 * - Accessibility features and skip navigation
 * - Font loading and typography configuration
 * - Metadata and viewport settings
 * - CSS imports and global styling
 */

// Root layout component for the Next.js application
// Handles global providers, metadata, and accessibility setup
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { RootClientShell } from './_providers/RootClientShell';
import { loadSiteMessages } from '@/i18n/messages';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { cn } from '@/shared/utils/ui-utils';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';
import { AccessibilityProvider } from '@/shared/providers/AccessibilityProvider';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';

import type { Metadata, Viewport } from 'next';

import './fonts.css';
import './globals.css';
import '../../apps/studiq-web/src/app/kangur/kangur.css';

// Generate metadata for SEO and social sharing
export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const routeTranslations = await getTranslations({ locale, namespace: 'Routes' });
  const metadataTranslations = await getTranslations({ locale, namespace: 'Metadata' });
  const siteTitle = routeTranslations('siteTitle');

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: metadataTranslations('siteDescription'),
    applicationName: siteTitle,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const messagesPromise = loadSiteMessages(locale);
  const liteSettingsPromise = getLiteSettingsForHydration();

  const [messages, liteSettings] = await Promise.all([messagesPromise, liteSettingsPromise]);

  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;

  const fontSetId =
    liteSettings.find((s) => s.key === APP_FONT_SET_SETTING_KEY)?.value ?? 'system';
  const liteSettingsEntries = liteSettings.map(
    (setting) => [setting.key, setting.value] as const
  );

  const commonMessages = messages['Common'] as Record<string, unknown> | undefined;
  const skipToMainContentLabel =
    commonMessages !== undefined &&
    commonMessages !== null &&
    typeof commonMessages['skipToMainContent'] === 'string'
      ? (commonMessages['skipToMainContent'])
      : 'Skip to main content';

  const routeMessages = messages['Routes'] as Record<string, unknown> | undefined;
  const siteTitle =
    routeMessages !== undefined &&
    routeMessages !== null &&
    typeof routeMessages['siteTitle'] === 'string'
      ? (routeMessages['siteTitle'])
      : 'Gemini App';

  return (
    <html lang={locale !== '' ? locale : 'en'} data-app-font-set={fontSetId} suppressHydrationWarning>
      <head>
        <title>{siteTitle}</title>
      </head>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        {sanitizedLiteSettingsScript !== null ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <AppIntlProvider locale={locale} messages={messages}>
          <AccessibilityProvider>
            <SkipToContentLink>{skipToMainContentLabel}</SkipToContentLink>
            <main id='main-content' className='min-h-screen' role='main'>
              <h1 className='sr-only'>{siteTitle}</h1>
              <div id='app-content' className='min-h-screen'>
                <Suspense fallback={<div className='min-h-screen' aria-busy='true' />}>
                  <RootClientShell initialLiteSettings={liteSettingsEntries}>
                    {children}
                  </RootClientShell>
                </Suspense>
              </div>
            </main>
          </AccessibilityProvider>
        </AppIntlProvider>
      </body>
    </html>
  );
}
