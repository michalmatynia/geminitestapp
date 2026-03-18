'use client';

import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { CmsAppearanceTone } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import type { ProductWithImages } from '@/shared/contracts/products';

import { HomeFallbackCollections } from './home-fallback-content.collections';
import { HomeFallbackFooter, type SocialLink } from './home-fallback-content.footer';
import { HomeFallbackHeader } from './home-fallback-content.header';
import { HomeFallbackHero } from './home-fallback-content.hero';
import { HomeFallbackHighlights } from './home-fallback-content.highlights';
import { HomeFallbackNextSteps } from './home-fallback-content.next-steps';
import { HomeFallbackProducts } from './home-fallback-content.products';
import { HomeFallbackSignature } from './home-fallback-content.signature';
import { SectionDivider } from './home-fallback-content.section-divider';

type SocialThemeSettings = {
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

const buildSocialLinks = (theme: SocialThemeSettings | null | undefined): SocialLink[] => {
  if (!theme) return [];
  const links: SocialLink[] = [];
  const addLink = (link: Omit<SocialLink, 'href'> & { href: string | null }) => {
    if (link.href) links.push({ ...link, href: link.href });
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

export function HomeFallbackContent({
  showFallbackHeader,
  products,
  themeSettings,
  appearanceTone,
}: {
  showFallbackHeader: boolean;
  products: ProductWithImages[];
  themeSettings: SocialThemeSettings;
  appearanceTone?: CmsAppearanceTone;
}): React.JSX.Element {
  const dividerTranslations = useTranslations('FallbackHome.Dividers');
  const socialLinks = React.useMemo(() => buildSocialLinks(themeSettings), [themeSettings]);
  const featuredProducts = products.slice(0, 3);

  return (
    <div className='flex min-h-screen flex-col'>
      {showFallbackHeader ? <HomeFallbackHeader appearanceTone={appearanceTone} /> : null}

      <div className='flex-1'>
        <HomeFallbackHero appearanceTone={appearanceTone} collectionCount={5} />

        <SectionDivider label={dividerTranslations('editorial')} />
        <HomeFallbackSignature featuredProducts={featuredProducts} />

        <SectionDivider label={dividerTranslations('highlights')} />
        <HomeFallbackHighlights />

        <SectionDivider label={dividerTranslations('collections')} />
        <HomeFallbackCollections />

        <SectionDivider label={dividerTranslations('catalog')} />
        <HomeFallbackProducts products={products} />

        <HomeFallbackNextSteps />
      </div>

      {showFallbackHeader ? <HomeFallbackFooter socialLinks={socialLinks} /> : null}
    </div>
  );
}
