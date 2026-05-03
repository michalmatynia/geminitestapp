'use client';

import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useHomeFallback } from './home-fallback-content';
import {
  UI_CENTER_ROW_CLASSNAME,
  UI_STACK_RELAXED_CLASSNAME,
  UI_STACK_SPACED_CLASSNAME,
} from '@/shared/ui/layout';

export type SocialLink = {
  id: string;
  label: string;
  href: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  fallback: string;
};

export type SocialThemeSettings = {
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialYoutube?: string | null;
  socialTiktok?: string | null;
  socialTwitter?: string | null;
  socialSnapchat?: string | null;
  socialPinterest?: string | null;
  socialTumblr?: string | null;
  socialVimeo?: string | null;
  socialLinkedin?: string | null;
};

const normalizeSocialUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const buildSocialLinks = (theme: SocialThemeSettings | null | undefined): SocialLink[] => {
  if (!theme) return [];

  const links: SocialLink[] = [];
  const addLink = (link: Omit<SocialLink, 'href'> & { href: string | null }) => {
    if (link.href) {
      links.push({ ...link, href: link.href });
    }
  };

  addLink({
    id: 'facebook',
    label: 'Facebook',
    href: normalizeSocialUrl(theme.socialFacebook),
    Icon: Facebook,
    fallback: 'Fb',
  });
  addLink({
    id: 'instagram',
    label: 'Instagram',
    href: normalizeSocialUrl(theme.socialInstagram),
    Icon: Instagram,
    fallback: 'Ig',
  });
  addLink({
    id: 'youtube',
    label: 'YouTube',
    href: normalizeSocialUrl(theme.socialYoutube),
    Icon: Youtube,
    fallback: 'Yt',
  });
  addLink({
    id: 'tiktok',
    label: 'TikTok',
    href: normalizeSocialUrl(theme.socialTiktok),
    fallback: 'TT',
  });
  addLink({
    id: 'twitter',
    label: 'X / Twitter',
    href: normalizeSocialUrl(theme.socialTwitter),
    Icon: Twitter,
    fallback: 'X',
  });
  addLink({
    id: 'snapchat',
    label: 'Snapchat',
    href: normalizeSocialUrl(theme.socialSnapchat),
    fallback: 'SC',
  });
  addLink({
    id: 'pinterest',
    label: 'Pinterest',
    href: normalizeSocialUrl(theme.socialPinterest),
    fallback: 'P',
  });
  addLink({
    id: 'tumblr',
    label: 'Tumblr',
    href: normalizeSocialUrl(theme.socialTumblr),
    fallback: 'T',
  });
  addLink({
    id: 'vimeo',
    label: 'Vimeo',
    href: normalizeSocialUrl(theme.socialVimeo),
    fallback: 'V',
  });
  addLink({
    id: 'linkedin',
    label: 'LinkedIn',
    href: normalizeSocialUrl(theme.socialLinkedin),
    Icon: Linkedin,
    fallback: 'In',
  });

  return links;
};

export function HomeFallbackFooter({
  socialLinks,
}: {
  socialLinks: SocialLink[];
}): React.JSX.Element {
  const translations = useTranslations('FallbackHome.Footer');

  return (
    <footer className='flex w-full shrink-0 flex-col gap-6 border-t border-[var(--cms-appearance-page-border)] px-4 py-8 md:px-6'>
      <div className={`${UI_STACK_RELAXED_CLASSNAME} md:flex-row md:items-center md:justify-between`}>
        <div className='space-y-2'>
          <p className='font-heading text-lg'>{translations('brand')}</p>
          <p className='cms-appearance-muted-text text-xs'>
            {translations('description')}
          </p>
        </div>
        <div className={`${UI_STACK_SPACED_CLASSNAME} md:flex-row md:items-center`}>
          <nav
            className='flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.2em]'
            aria-label={translations('footerNavAria')}
          >
            <a href='#signature' className='hover:underline'>
              {translations('signature')}
            </a>
            <a href='#highlights' className='hover:underline'>
              {translations('highlights')}
            </a>
            <a href='#collections' className='hover:underline'>
              {translations('collections')}
            </a>
            <a href='#products' className='hover:underline'>
              {translations('products')}
            </a>
            <Link href='/admin' className='hover:underline' prefetch={false}>
              {translations('admin')}
            </Link>
          </nav>
          {socialLinks.length ? (
            <nav className={UI_CENTER_ROW_CLASSNAME} aria-label={translations('socialAria')}>
              {socialLinks.map((link) => {
                const Icon = link.Icon;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    className='cms-appearance-subtle-surface cms-appearance-muted-text inline-flex size-9 items-center justify-center rounded-full border transition hover:text-[var(--cms-appearance-page-text)]'
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={link.label}
                  >
                    {Icon ? (
                      <Icon className='size-4' aria-hidden='true' />
                    ) : (
                      <span className='text-[10px] font-semibold' aria-hidden='true'>
                        {link.fallback}
                      </span>
                    )}
                    <span className='sr-only'>{link.label}</span>
                  </a>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
      <p className='cms-appearance-muted-text text-xs'>
        {translations('copyright', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}

export function HomeFallbackFooterWithTheme(): React.JSX.Element {
  const { themeSettings } = useHomeFallback();
  const socialLinks = React.useMemo(() => buildSocialLinks(themeSettings), [themeSettings]);
  return <HomeFallbackFooter socialLinks={socialLinks} />;
}
