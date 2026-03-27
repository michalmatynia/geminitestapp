import { ArrowUpRight, ChevronLeft, LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import {
  getCmsMenuSettings,
  getCmsThemeSettings,
  resolveCmsDomainFromHeaders,
} from '@/features/cms/server';
import { Link as LocaleLink } from '@/i18n/navigation';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { normalizeSiteLocale, resolveLocalizedText } from '@/shared/lib/i18n/site-locale';
import { productService } from '@/shared/lib/products/services/productService';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';
import { MissingImagePlaceholder } from '@/shared/ui';

import type { JSX } from 'react';

export async function ProductPublicPage({
  params,
  locale,
}: {
  params: { id: string };
  locale?: string;
}): Promise<JSX.Element> {
  const { id } = params;
  const resolvedLocale = normalizeSiteLocale(locale);
  const productTranslations = await getTranslations({
    locale: resolvedLocale,
    namespace: 'Product',
  });
  const localeSuffix = resolvedLocale.split('-')[0] ?? resolvedLocale;
  const product = await productService.getProductById(id);

  if (!product) {
    notFound();
  }

  const resolveText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value : null;

  const resolveLocaleField = (record: Record<string, unknown>, baseKey: string): string | null => {
    const key = `${baseKey}_${localeSuffix}`;
    return resolveText(record[key]);
  };

  const title =
    resolveLocalizedText(product.name, resolvedLocale) ??
    resolveLocaleField(product as Record<string, unknown>, 'name') ??
    resolveText(product.name_en) ??
    resolveText(product.name_pl) ??
    resolveText(product.name_de) ??
    productTranslations('fallbackTitle');

  const imageUrls = [
    ...(product.images ?? [])
      .map((image) => image.imageFile?.filepath ?? null)
      .filter((value): value is string => Boolean(value)),
    ...(product.imageLinks ?? []),
  ].filter((value, index, array) => array.indexOf(value) === index);
  const mainImage = imageUrls[0] ?? null;
  const secondaryImages = imageUrls.slice(1, 5);

  const priceLabel =
    typeof product.price === 'number'
      ? new Intl.NumberFormat(
        resolvedLocale === 'pl' ? 'pl-PL' : resolvedLocale === 'de' ? 'de-DE' : 'en-US',
        {
          style: 'currency',
          currency: 'USD',
        }
      ).format(product.price)
      : '—';

  const description =
    resolveLocalizedText(product.description, resolvedLocale) ??
    resolveLocaleField(product as Record<string, unknown>, 'description') ??
    resolveText(product.description_en) ??
    resolveText(product.description_pl) ??
    resolveText(product.description_de) ??
    '';

  const categoryLabel =
    (product.category
      ? resolveLocaleField(product.category as Record<string, unknown>, 'name')
      : null) ??
    product.category?.name_en ??
    product.category?.name_pl ??
    product.category?.name_de ??
    product.category?.name ??
    null;
  const stockLabel =
    typeof product.stock === 'number'
      ? productTranslations('available', { count: product.stock > 0 ? product.stock : 0 })
      : null;
  const details = [
    { label: productTranslations('sku'), value: product.sku },
    { label: productTranslations('category'), value: categoryLabel },
    { label: productTranslations('availability'), value: stockLabel },
    { label: productTranslations('supplier'), value: product.supplierName },
  ].filter((item) => Boolean(item.value));
  const tags = (product.tags ?? [])
    .map((tag) => tag.tag?.name ?? '')
    .filter((tag) => tag.trim().length > 0);

  const hdrs = await readOptionalRequestHeaders();
  const domain = await resolveCmsDomainFromHeaders(hdrs);
  const [themeSettings, menuSettings] = await Promise.all([
    getCmsThemeSettings(),
    getCmsMenuSettings(domain.id, resolvedLocale),
  ]);
  const colorSchemes = buildColorSchemeMap(themeSettings);

  return (
    <CmsPageShell menu={menuSettings} theme={themeSettings} colorSchemes={colorSchemes}>
      <div className='relative overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 -z-10 opacity-70'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage:
                'radial-gradient(900px circle at 0% 0%, color-mix(in srgb, var(--cms-appearance-page-accent) 18%, transparent) 0%, transparent 55%), radial-gradient(800px circle at 100% 0%, color-mix(in srgb, var(--cms-appearance-page-accent) 12%, transparent) 0%, transparent 50%)',
            }}
            aria-hidden='true'
          />
        </div>
        <div className='page-container px-4 py-12 md:px-6 lg:py-16'>
          <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
            <LocaleLink
              href='/'
              prefetch={false}
              className='inline-flex items-center gap-1 hover:underline'
            >
              <ChevronLeft className='size-3' aria-hidden='true' />
              {productTranslations('storefront')}
            </LocaleLink>
            <span>/</span>
            <span className='text-[var(--cms-appearance-page-text)]'>{title}</span>
          </div>

          <div className='mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]'>
            <div className='space-y-4'>
              <div className='cms-appearance-surface overflow-hidden rounded-3xl border shadow-sm'>
                <div className='relative aspect-[4/3] w-full'>
                  {mainImage ? (
                    <Image
                      src={mainImage}
                      alt={productTranslations('imageAlt', { title })}
                      fill
                      className='object-cover'
                      sizes='(min-width: 1024px) 55vw, 100vw'
                      priority
                    />
                  ) : (
                    <MissingImagePlaceholder className='h-full w-full' />
                  )}
                </div>
              </div>
              {secondaryImages.length ? (
                <div className='grid grid-cols-4 gap-3'>
                  {secondaryImages.map((image) => (
                    <div
                      key={image}
                      className='cms-appearance-subtle-surface relative aspect-square overflow-hidden rounded-2xl border'
                    >
                      <Image
                        src={image}
                        alt={productTranslations('thumbnailAlt', { title })}
                        fill
                        className='object-cover'
                        sizes='120px'
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className='flex flex-col gap-6'>
              <div className='flex flex-wrap gap-2'>
                {tags.length ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]'
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className='inline-flex items-center gap-2 rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]'>
                    <Sparkles className='size-3' aria-hidden='true' />
                    {productTranslations('featured')}
                  </span>
                )}
              </div>

              <div className='space-y-3'>
                <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
                  {title}
                </h1>
                <div className='flex flex-wrap items-end gap-3'>
                  <p className='text-3xl font-semibold'>{priceLabel}</p>
                  {product.priceComment ? (
                    <p className='text-sm text-[var(--cms-appearance-muted-text)]'>
                      {product.priceComment}
                    </p>
                  ) : null}
                </div>
              </div>

              {description ? (
                <p className='text-base text-[var(--cms-appearance-muted-text)] sm:text-lg'>
                  {description}
                </p>
              ) : (
                <p className='text-base text-[var(--cms-appearance-muted-text)] sm:text-lg'>
                  {productTranslations('noDescription')}
                </p>
              )}

              {details.length ? (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {details.map((detail) => (
                    <div
                      key={detail.label}
                      className='cms-appearance-subtle-surface rounded-2xl border px-4 py-3'
                    >
                      <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
                        {detail.label}
                      </p>
                      <p className='mt-1 text-sm font-medium text-[var(--cms-appearance-page-text)]'>
                        {detail.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className='flex flex-wrap gap-3'>
                <LocaleLink
                  href='/'
                  className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold'
                  prefetch={false}
                >
                  {productTranslations('backToStorefront')}
                </LocaleLink>
                <Link
                  href='/admin'
                  className='cms-appearance-button-primary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold'
                  prefetch={false}
                >
                  {productTranslations('editInAdmin')}
                  <ArrowUpRight className='size-4' aria-hidden='true' />
                </Link>
              </div>

              <div className='grid gap-4 sm:grid-cols-3'>
                {[
                  {
                    title: productTranslations('themeAlignedTitle'),
                    description: productTranslations('themeAlignedDescription'),
                    Icon: Sparkles,
                  },
                  {
                    title: productTranslations('catalogReadyTitle'),
                    description: productTranslations('catalogReadyDescription'),
                    Icon: LayoutGrid,
                  },
                  {
                    title: productTranslations('confidentDisplayTitle'),
                    description: productTranslations('confidentDisplayDescription'),
                    Icon: ShieldCheck,
                  },
                ].map(({ title: itemTitle, description: itemDescription, Icon }) => (
                  <div key={itemTitle} className='cms-appearance-surface rounded-2xl border p-4'>
                    <div className='flex items-center gap-3'>
                      <span className='cms-appearance-subtle-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
                        <Icon className='size-5' aria-hidden='true' />
                      </span>
                      <div>
                        <p className='text-sm font-semibold'>{itemTitle}</p>
                        <p className='text-xs text-[var(--cms-appearance-muted-text)]'>
                          {itemDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CmsPageShell>
  );
}
