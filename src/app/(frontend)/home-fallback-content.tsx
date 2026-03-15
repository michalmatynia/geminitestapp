import {
  ArrowUpRight,
  ChevronDown,
  Check,
  Facebook,
  Instagram,
  Layers,
  LayoutGrid,
  Linkedin,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Twitter,
  Youtube,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  CmsStorefrontAppearanceButtons,
  type CmsAppearanceTone,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import ProductCard from '@/features/products/components/ProductCard';
import type { ProductWithImages } from '@/shared/contracts/products';

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

function SectionDivider({ label }: { label: string }): React.JSX.Element {
  const lineStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--cms-appearance-page-border) 40%, transparent)',
  };
  return (
    <div className='w-full py-5'>
      <div className='container px-4 md:px-6'>
        <div className='flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--cms-appearance-muted-text)]'>
          <span className='h-px flex-1' style={lineStyle} aria-hidden='true' />
          <span className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1'>
            {label}
          </span>
          <span className='h-px flex-1' style={lineStyle} aria-hidden='true' />
        </div>
      </div>
    </div>
  );
}

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
  const appearanceToneValue = appearanceTone;
  const socialLinks = React.useMemo(() => buildSocialLinks(themeSettings), [themeSettings]);
  const hasProducts = products.length > 0;
  const heroStyle = {
    '--hero-accent': appearanceToneValue?.accent ?? 'var(--cms-appearance-page-text)',
    '--hero-border': appearanceToneValue?.border ?? 'var(--cms-appearance-page-border)',
    '--hero-text': appearanceToneValue?.text ?? 'var(--cms-appearance-page-text)',
  } as React.CSSProperties;
  const heroGlowStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(1200px circle at 0% 0%, color-mix(in srgb, var(--hero-accent) 28%, transparent) 0%, transparent 60%), radial-gradient(900px circle at 100% 12%, color-mix(in srgb, var(--hero-accent) 18%, transparent) 0%, transparent 55%)',
  };
  const heroGridStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(to right, color-mix(in srgb, var(--hero-border) 32%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--hero-border) 32%, transparent) 1px, transparent 1px)',
    backgroundSize: '42px 42px',
  };
  const headerStyle: React.CSSProperties = {
    backgroundColor:
      'color-mix(in srgb, var(--cms-appearance-page-background) 90%, transparent)',
  };
  const highlightItems = [
    {
      title: 'Editorial-first layout',
      description: 'Blend storytelling and commerce with hero, highlights, and product grids.',
      Icon: Sparkles,
    },
    {
      title: 'Theme-aware surfaces',
      description: 'Every section respects your CMS appearance palette and display modes.',
      Icon: ShieldCheck,
    },
    {
      title: 'Product-forward merchandising',
      description: 'Keep attention on the catalog with clean, image-led cards.',
      Icon: LayoutGrid,
    },
  ];
  const setupSteps = [
    'Upload your logo and brand colors.',
    'Add featured products with imagery.',
    'Share your storefront link.',
  ];
  const impactStats = [
    {
      label: 'Launch kit',
      value: '3 steps',
      description: 'From brand setup to live link.',
      Icon: Layers,
    },
    {
      label: 'Appearance modes',
      value: '4 styles',
      description: 'Default, dawn, sunset, dark.',
      Icon: Palette,
    },
    {
      label: 'Conversion focus',
      value: 'Always on',
      description: 'Clear CTAs and product grids.',
      Icon: TrendingUp,
    },
  ];
  const featuredProducts = products.slice(0, 3);
  const collections = [
    {
      title: 'Seasonal edit',
      description: 'A focused set of seasonal picks.',
      emphasis: '12 pieces',
    },
    {
      title: 'Essentials',
      description: 'Core items that anchor the catalog.',
      emphasis: 'Always on',
    },
    {
      title: 'Studio picks',
      description: 'Best-in-class picks from the team.',
      emphasis: 'New weekly',
    },
    {
      title: 'Limited release',
      description: 'Small-batch drops with story.',
      emphasis: 'Limited',
    },
    {
      title: 'New arrivals',
      description: 'Fresh products ready to ship.',
      emphasis: 'Updated daily',
    },
  ];

  return (
    <div className='flex min-h-screen flex-col' style={heroStyle}>
      {showFallbackHeader ? (
        <header
          className='sticky top-0 z-30 border-b border-[var(--cms-appearance-page-border)]/60 backdrop-blur'
          style={headerStyle}
        >
          <div className='container flex h-16 items-center justify-between px-4 md:px-6'>
            <Link href='/' className='flex items-center gap-3' prefetch={false}>
              <span className='cms-appearance-subtle-surface flex size-10 items-center justify-center rounded-full border'>
                <MountainIcon className='size-5' />
              </span>
              <span className='font-heading text-lg tracking-tight'>Storefront</span>
            </Link>
            <nav className='hidden items-center gap-4 text-sm font-medium md:flex' aria-label='Primary'>
              <Link href='#signature' prefetch={false} className='hover:underline'>
                Signature
              </Link>
              <Link href='#highlights' prefetch={false} className='hover:underline'>
                Highlights
              </Link>
              <Link href='#collections' prefetch={false} className='hover:underline'>
                Collections
              </Link>
              <Link href='#products' prefetch={false} className='hover:underline'>
                Products
              </Link>
              <Link href='/admin' prefetch={false} className='hover:underline'>
                Admin
              </Link>
            </nav>
            <div className='flex items-center gap-3'>
              <CmsStorefrontAppearanceButtons
                label='Homepage appearance'
                tone={appearanceToneValue}
              />
              <Link
                href='/admin'
                className='hidden items-center gap-1 rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] md:inline-flex'
                prefetch={false}
              >
                Configure
                <ArrowUpRight className='size-3' aria-hidden='true' />
              </Link>
            </div>
          </div>
          <div className='border-t border-[var(--cms-appearance-page-border)]/60 md:hidden'>
            <nav
              className='container flex items-center gap-2 overflow-x-auto px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]'
              aria-label='Section navigation'
            >
              <Link href='#signature' prefetch={false} className='rounded-full border px-3 py-1'>
                Signature
              </Link>
              <Link href='#highlights' prefetch={false} className='rounded-full border px-3 py-1'>
                Highlights
              </Link>
              <Link href='#collections' prefetch={false} className='rounded-full border px-3 py-1'>
                Collections
              </Link>
              <Link href='#products' prefetch={false} className='rounded-full border px-3 py-1'>
                Products
              </Link>
              <Link href='/admin' prefetch={false} className='rounded-full border px-3 py-1'>
                Admin
              </Link>
            </nav>
          </div>
        </header>
      ) : null}

      <div className='flex-1'>
        <section className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 -z-10'>
            <div className='absolute inset-0 opacity-80' style={heroGlowStyle} aria-hidden='true' />
            <div
              className='absolute inset-0 opacity-40 mix-blend-multiply'
              style={heroGridStyle}
              aria-hidden='true'
            />
          </div>
          <div className='container grid gap-8 px-4 py-14 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20'>
            <div className='flex flex-col justify-center gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4'>
              <span className='cms-appearance-subtle-surface inline-flex w-fit items-center gap-2 rounded-full border border-[var(--cms-appearance-page-border)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--hero-text)]'>
                Launch-ready
              </span>
              <div className='space-y-3'>
                <h1 className='font-heading text-4xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-6xl'>
                  A modern storefront that feels tailored{' '}
                  <span className='relative inline-flex'>
                    from the first visit
                    <span
                      className='absolute inset-x-0 -bottom-2 h-3 rounded-full opacity-60'
                      style={{
                        background:
                          'linear-gradient(90deg, color-mix(in srgb, var(--hero-accent) 24%, transparent), color-mix(in srgb, var(--hero-accent) 8%, transparent))',
                      }}
                      aria-hidden='true'
                    />
                  </span>
                  .
                </h1>
                <p className='max-w-xl text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
                  Highlight your best products, give every collection a story, and keep the look
                  aligned with your CMS theme without extra layout work.
                </p>
              </div>
              <div className='flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cms-appearance-muted-text)]'>
                {['Story-led', 'Fast setup', 'Theme aware'].map((pill) => (
                  <span
                    key={pill}
                    className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 transition hover:-translate-y-0.5 hover:text-[var(--cms-appearance-page-text)]'
                  >
                    {pill}
                  </span>
                ))}
              </div>
              <div className='flex flex-wrap gap-3'>
                <Link
                  href='#products'
                  className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg'
                  prefetch={false}
                >
                  Explore the catalog
                </Link>
                <Link
                  href='/admin'
                  className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5'
                  prefetch={false}
                >
                  Open admin
                </Link>
              </div>
              <div className='flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cms-appearance-muted-text)]'>
                {[
                  { label: 'Launch kit', value: `${setupSteps.length} steps` },
                  { label: 'Edits ready', value: `${collections.length} edits` },
                  { label: 'Theme modes', value: '4' },
                ].map((stat) => (
                  <div key={stat.label} className='flex items-baseline gap-2'>
                    <span className='text-[var(--cms-appearance-page-text)]'>{stat.value}</span>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className='grid gap-3 sm:grid-cols-3'>
                {setupSteps.map((step) => (
                  <div
                    key={step}
                    className='cms-appearance-subtle-surface flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-sm text-[var(--cms-appearance-page-text)]'
                  >
                    <span className='mt-0.5 inline-flex size-6 items-center justify-center rounded-full border'>
                      <Check className='size-4' aria-hidden='true' />
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className='flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:delay-150'>
              <div className='cms-appearance-subtle-surface rounded-3xl border p-6 shadow-sm'>
                <div className='flex items-center gap-3'>
                  <span className='cms-appearance-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
                    <Sparkles className='size-5' aria-hidden='true' />
                  </span>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                      Featured stack
                    </p>
                    <p className='text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                      Curate collections with confidence.
                    </p>
                  </div>
                </div>
                <p className='mt-4 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  Use the CMS appearance controls to keep each section consistent, then spotlight
                  the products that deserve attention.
                </p>
                <div className='mt-6 flex flex-wrap gap-2'>
                  {['Lookbook', 'Studio picks', 'Seasonal edit'].map((tag) => (
                    <span
                      key={tag}
                      className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className='cms-appearance-surface rounded-3xl border p-6 shadow-sm'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                  Storefront focus
                </p>
                <p className='mt-2 text-2xl font-semibold leading-tight text-[var(--cms-appearance-page-text)]'>
                  Design for discovery, then let the catalog do the rest.
                </p>
                <p className='mt-3 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  Pair editorial sections with product cards to guide visitors toward what you want
                  to sell most.
                </p>
              </div>
            </div>
          </div>
          <div className='flex justify-center pb-6'>
            <Link
              href='#signature'
              prefetch={false}
              className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)] transition hover:text-[var(--cms-appearance-page-text)]'
            >
              Scroll
              <ChevronDown className='size-4' aria-hidden='true' />
            </Link>
          </div>
        </section>

        <SectionDivider label='Editorial' />

        <section id='signature' className='w-full py-12'>
          <div className='container px-4 md:px-6'>
            <div className='grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
              <div className='space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                  Signature edit
                </p>
                <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
                  Bring a sense of direction to every collection.
                </h2>
                <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
                  Use this editorial band to spotlight new releases, seasonal edits, or staff
                  picks. It keeps the focus tight while the catalog grows.
                </p>
                <div className='grid gap-3 sm:grid-cols-3'>
                  {impactStats.map(({ label, value, description, Icon }) => (
                    <div
                      key={label}
                      className='cms-appearance-subtle-surface rounded-2xl border px-4 py-3'
                    >
                      <div className='flex items-center justify-between'>
                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                          {label}
                        </p>
                        <Icon className='size-4 text-[var(--cms-appearance-muted-text)]' aria-hidden='true' />
                      </div>
                      <p className='mt-2 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                        {value}
                      </p>
                      <p className='text-xs text-[var(--cms-appearance-muted-text)]'>
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className='grid gap-4 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:delay-150'>
                {featuredProducts.length ? (
                  featuredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className='border-[var(--cms-appearance-page-border)]/60 shadow-sm'
                    />
                  ))
                ) : (
                  <>
                    {['Curated set', 'Limited release'].map((label) => (
                      <div
                        key={label}
                        className='cms-appearance-subtle-surface flex flex-col gap-4 rounded-3xl border p-5'
                      >
                        <div className='rounded-2xl border border-[var(--cms-appearance-page-border)]/60 bg-[color-mix(in srgb,var(--cms-appearance-page-background) 80%, transparent)] p-6 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                          {label}
                        </div>
                        <div className='space-y-2'>
                          <div className='h-3 w-3/4 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 40%, transparent)]' />
                          <div className='h-3 w-1/2 rounded-full bg-[color-mix(in srgb,var(--cms-appearance-page-border) 30%, transparent)]' />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <SectionDivider label='Highlights' />

        <section id='highlights' className='relative w-full py-12'>
          <div
            className='pointer-events-none absolute inset-0 -z-10 opacity-50'
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 50%, transparent 100%)',
            }}
            aria-hidden='true'
          />
          <div className='container px-4 md:px-6'>
            <div className='flex flex-col gap-3 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
              <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                Highlights
              </p>
              <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
                Everything you need to make the homepage feel complete.
              </h2>
              <p className='mx-auto max-w-2xl text-sm leading-relaxed text-[var(--cms-appearance-muted-text)] sm:text-base'>
                The fallback layout balances storytelling with shopping, so you can launch while
                your CMS pages are still coming together.
              </p>
            </div>
            <div className='mt-10 grid gap-6 md:grid-cols-3'>
              {highlightItems.map(({ title, description, Icon }) => (
                <div
                  key={title}
                  className='cms-appearance-surface rounded-3xl border p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4'
                >
                  <span className='cms-appearance-subtle-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
                    <Icon className='size-5' aria-hidden='true' />
                  </span>
                  <h3 className='mt-4 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                    {title}
                  </h3>
                  <p className='mt-2 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider label='Collections' />

        <section id='collections' className='w-full py-12'>
          <div className='container px-4 md:px-6'>
            <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                  Collections
                </p>
                <h2 className='font-heading text-3xl font-semibold tracking-tight'>
                  Build a narrative around your catalog.
                </h2>
                <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  Create small edits and spotlight them with scrollable cards.
                </p>
              </div>
              <Link
                href='#products'
                className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
                prefetch={false}
              >
                View all products
                <ArrowUpRight className='size-4' aria-hidden='true' />
              </Link>
            </div>
            <div className='mt-7 flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory'>
              {collections.map((collection, index) => {
                const tint = 12 + index * 6;
                return (
                  <div
                    key={collection.title}
                    className='cms-appearance-subtle-surface w-[230px] shrink-0 snap-start rounded-3xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3'
                    style={{
                      backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--hero-accent) ${tint}%, transparent), transparent 65%)`,
                    }}
                  >
                    <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                      {collection.emphasis}
                    </p>
                    <h3 className='mt-3 text-lg font-semibold text-[var(--cms-appearance-page-text)]'>
                      {collection.title}
                    </h3>
                    <p className='mt-2 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                      {collection.description}
                    </p>
                    <Link
                      href='#products'
                      className='mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
                      prefetch={false}
                    >
                      Explore
                      <ArrowUpRight className='size-3' aria-hidden='true' />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <SectionDivider label='Catalog' />

        <section id='products' className='relative w-full py-12'>
          <div
            className='pointer-events-none absolute inset-0 -z-10 opacity-60'
            style={{
              background:
                'radial-gradient(900px circle at 10% 10%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 0%, transparent 60%)',
            }}
            aria-hidden='true'
          />
          <div className='container px-4 md:px-6'>
            <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'>
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                  Products
                </p>
                <h2 className='font-heading text-3xl font-semibold tracking-tight'>
                  Featured catalog
                </h2>
                <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  Keep your best items front and center with a clean, image-first grid.
                </p>
              </div>
              <Link
                href='/admin'
                className='inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--hero-text)]'
                prefetch={false}
              >
                Manage inventory
                <ArrowUpRight className='size-4' aria-hidden='true' />
              </Link>
            </div>
            <div className='mt-7'>
              {hasProducts ? (
                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {products.map((product: ProductWithImages) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className='cms-appearance-subtle-surface flex flex-col items-start gap-4 rounded-3xl border p-6 text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                  <p>
                    Your products will appear here once you add them in the admin panel. Start by
                    creating a few featured items and uploading imagery.
                  </p>
                  <Link
                    href='/admin'
                    className='cms-appearance-button-primary inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]'
                    prefetch={false}
                  >
                    Add products
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className='w-full py-12'>
          <div className='container px-4 md:px-6'>
            <div className='cms-appearance-surface relative overflow-hidden rounded-3xl border p-8 shadow-sm'>
              <div
                className='pointer-events-none absolute inset-0 opacity-60'
                style={{
                  backgroundImage:
                    'radial-gradient(700px circle at 20% 0%, color-mix(in srgb, var(--hero-accent) 12%, transparent) 0%, transparent 65%), radial-gradient(500px circle at 90% 80%, color-mix(in srgb, var(--hero-accent) 10%, transparent) 0%, transparent 60%)',
                }}
                aria-hidden='true'
              />
              <div className='relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
                <div className='space-y-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cms-appearance-muted-text)]'>
                    Next steps
                  </p>
                  <h2 className='font-heading text-3xl font-semibold tracking-tight sm:text-[2.3rem]'>
                    Want a fully custom homepage?
                  </h2>
                  <p className='text-sm leading-relaxed text-[var(--cms-appearance-muted-text)]'>
                    Build a CMS landing page and swap this fallback for bespoke layouts whenever
                    you are ready.
                  </p>
                </div>
                <Link
                  href='/admin'
                  className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
                  prefetch={false}
                >
                  Design in CMS
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showFallbackHeader ? (
        <footer className='flex w-full shrink-0 flex-col gap-6 border-t border-[var(--cms-appearance-page-border)] px-4 py-8 md:px-6'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-2'>
              <p className='font-heading text-lg'>Storefront</p>
              <p className='cms-appearance-muted-text text-xs'>
                Curated commerce powered by your CMS appearance settings.
              </p>
            </div>
            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
              <nav className='flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.2em]'>
                <Link href='#signature' className='hover:underline' prefetch={false}>
                  Signature
                </Link>
                <Link href='#highlights' className='hover:underline' prefetch={false}>
                  Highlights
                </Link>
                <Link href='#collections' className='hover:underline' prefetch={false}>
                  Collections
                </Link>
                <Link href='#products' className='hover:underline' prefetch={false}>
                  Products
                </Link>
                <Link href='/admin' className='hover:underline' prefetch={false}>
                  Admin
                </Link>
              </nav>
              {socialLinks.length ? (
                <nav className='flex items-center gap-2' aria-label='Social media'>
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
            &copy; 2024 Acme Inc. All rights reserved.
          </p>
        </footer>
      ) : null}
    </div>
  );
}
