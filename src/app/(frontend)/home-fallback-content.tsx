import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/features/products/public';
import type { ProductWithImages } from '@/features/products/public';

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

type SocialLink = {
  id: string;
  label: string;
  href: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  fallback: string;
};

const normalizeSocialUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const buildSocialLinks = (
  theme: SocialThemeSettings | null | undefined,
): SocialLink[] => {
  if (!theme) return [];
  const links: SocialLink[] = [];
  const addLink = (
    link: Omit<SocialLink, 'href'> & { href: string | null },
  ) => {
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

function SocialLinks({
  theme,
}: {
  theme: SocialThemeSettings | null | undefined;
}) {
  const links = buildSocialLinks(theme);
  if (!links.length) return null;

  return (
    <nav className='flex items-center gap-2' aria-label='Social media'>
      {links.map((link) => {
        const Icon = link.Icon;
        return (
          <a
            key={link.id}
            href={link.href}
            className='inline-flex size-8 items-center justify-center rounded-full border border-gray-800 text-gray-400 transition hover:border-gray-600 hover:text-gray-100'
            target='_blank'
            rel='noreferrer'
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
  );
}

function MountainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='m8 3 4 8 5-5 5 15H2L8 3z' />
    </svg>
  );
}

export function HomeFallbackContent({
  showFallbackHeader,
  products,
  themeSettings,
}: {
  showFallbackHeader: boolean;
  products: ProductWithImages[];
  themeSettings: SocialThemeSettings;
}): React.JSX.Element {
  return (
    <div className='flex min-h-screen flex-col'>
      {showFallbackHeader ? (
        <header className='flex h-14 items-center px-4 lg:px-6'>
          <Link
            href='#'
            className='flex items-center justify-center'
            prefetch={false}
          >
            <MountainIcon className='size-6' />
            <span className='sr-only'>Acme Inc</span>
          </Link>
          <nav className='ml-auto flex gap-4 sm:gap-6'>
            <Link
              href='/admin'
              className='text-sm font-medium underline-offset-4 hover:underline'
              prefetch={false}
            >
              Admin
            </Link>
          </nav>
        </header>
      ) : null}

      <div className='flex-1'>
        <section className='w-full py-12'>
          <div className='container px-4 md:px-6'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {products.map((product: ProductWithImages) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {showFallbackHeader ? (
        <footer className='flex w-full shrink-0 flex-col items-center gap-3 border-t border-gray-800 px-4 py-6 sm:flex-row md:px-6'>
          <p className='text-xs text-gray-400'>
            &copy; 2024 Acme Inc. All rights reserved.
          </p>
          <div className='flex flex-col items-center gap-3 sm:ml-auto sm:flex-row sm:items-center'>
            <nav className='flex gap-4 sm:gap-6'>
              <Link
                href='#'
                className='text-xs underline-offset-4 hover:underline'
                prefetch={false}
              >
                Terms of Service
              </Link>
              <Link
                href='#'
                className='text-xs underline-offset-4 hover:underline'
                prefetch={false}
              >
                Privacy
              </Link>
            </nav>
            <SocialLinks theme={themeSettings} />
          </div>
        </footer>
      ) : null}
    </div>
  );
}
