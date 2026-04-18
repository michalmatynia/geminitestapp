import { ArrowUpRight, ChevronLeft, LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CmsPageShell } from '@/features/cms/public';
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
import { MissingImagePlaceholder } from '@/shared/ui/media.public';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { JSX, ReactNode } from 'react';

type ProductPageTranslations = Awaited<ReturnType<typeof getTranslations>>;

function resolveText(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function resolveLocaleField(record: Record<string, unknown>, baseKey: string, localeSuffix: string): string | null {
  const value = record[`${baseKey}_${localeSuffix}`];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function resolveProductTitle(product: ProductWithImages, locale: string, localeSuffix: string, t: ProductPageTranslations): string {
  return (
    resolveLocalizedText(product.name, locale) ??
    resolveLocaleField(product as unknown as Record<string, unknown>, 'name', localeSuffix) ??
    resolveText(product.name_en) ??
    resolveText(product.name_pl) ??
    resolveText(product.name_de) ??
    t('fallbackTitle')
  );
}

function resolveProductImages(product: ProductWithImages): { mainImage: string | null; secondaryImages: string[] } {
  const imageUrls = [
    ...product.images
      .map((image) => image.imageFile.filepath)
      .filter((value): value is string => value !== ''),
    ...(product.imageLinks ?? []),
  ].filter((value, index, array) => array.indexOf(value) === index);

  return {
    mainImage: imageUrls[0] ?? null,
    secondaryImages: imageUrls.slice(1, 5),
  };
}

function getLocaleCode(locale: string): string {
  if (locale === 'pl') return 'pl-PL';
  if (locale === 'de') return 'de-DE';
  return 'en-US';
}

function resolvePriceLabel(price: number | null, locale: string): string {
  if (typeof price !== 'number') return '—';
  return new Intl.NumberFormat(getLocaleCode(locale), { style: 'currency', currency: 'USD' }).format(price);
}

function resolveProductDescription(product: ProductWithImages, locale: string, localeSuffix: string): string {
  return (
    resolveLocalizedText(product.description, locale) ??
    resolveLocaleField(product as unknown as Record<string, unknown>, 'description', localeSuffix) ??
    resolveText(product.description_en) ??
    resolveText(product.description_pl) ??
    resolveText(product.description_de) ??
    ''
  );
}

function resolveCategoryLabel(product: ProductWithImages, localeSuffix: string): string | null {
  const category = product.category;
  if (category === undefined) return null;
  return (
    resolveLocaleField(category as unknown as Record<string, unknown>, 'name', localeSuffix) ??
    category.name_en ??
    category.name_pl ??
    category.name_de ??
    category.name
  );
}

function resolveDetails(product: ProductWithImages, categoryLabel: string | null, stockLabel: string | null, t: ProductPageTranslations): { label: string; value: string }[] {
  return [
    { label: t('sku'), value: product.sku },
    { label: t('category'), value: categoryLabel },
    { label: t('availability'), value: stockLabel },
    { label: t('supplier'), value: product.supplierName },
  ].filter((item): item is { label: string; value: string } => typeof item.value === 'string' && item.value !== '');
}

function ProductGallery({ mainImage, secondaryImages, title, t }: { mainImage: string | null; secondaryImages: string[]; title: string; t: ProductPageTranslations }): JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='cms-appearance-surface overflow-hidden rounded-3xl border shadow-sm'>
        <div className='relative aspect-[4/3] w-full'>
          {mainImage !== null ? (
            <Image
              src={mainImage}
              alt={t('imageAlt', { title })}
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
      {secondaryImages.length > 0 && (
        <div className='grid grid-cols-4 gap-3'>
          {secondaryImages.map((image) => (
            <div key={image} className='cms-appearance-subtle-surface relative aspect-square overflow-hidden rounded-2xl border'>
              <Image src={image} alt={t('thumbnailAlt', { title })} fill className='object-cover' sizes='120px' />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDetailsGrid({ details }: { details: { label: string; value: string }[] }): JSX.Element | null {
  if (details.length === 0) return null;
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {details.map((detail) => (
        <div key={detail.label} className='cms-appearance-subtle-surface rounded-2xl border px-4 py-3'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>{detail.label}</p>
          <p className='mt-1 text-sm font-medium text-[var(--cms-appearance-page-text)]'>{detail.value}</p>
        </div>
      ))}
    </div>
  );
}

function BadgeList({ tags, t }: { tags: string[]; t: ProductPageTranslations }): JSX.Element {
  if (tags.length > 0) {
    return (
      <div className='flex flex-wrap gap-2'>
        {tags.map((tag) => (
          <span key={tag} className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]'>{tag}</span>
        ))}
      </div>
    );
  }
  return (
    <div className='flex flex-wrap gap-2'>
      <span className='inline-flex items-center gap-2 rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]'>
        <Sparkles className='size-3' aria-hidden='true' />
        {t('featured')}
      </span>
    </div>
  );
}

function ProductBreadcrumbs({ title, t }: { title: string; t: ProductPageTranslations }): JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cms-appearance-muted-text)]'>
      <LocaleLink href='/' prefetch={false} className='inline-flex items-center gap-1 hover:underline'>
        <ChevronLeft className='size-3' aria-hidden='true' />
        {t('storefront')}
      </LocaleLink>
      <span>/</span>
      <span className='text-[var(--cms-appearance-page-text)]'>{title}</span>
    </div>
  );
}

async function resolveProductData(id: string, locale?: string): Promise<{ resolvedLocale: string; t: ProductPageTranslations; product: ProductWithImages; localeSuffix: string; title: string; mainImage: string | null; secondaryImages: string[] }> {
  const resolvedLocale = normalizeSiteLocale(locale);
  const t = await getTranslations({ locale: resolvedLocale, namespace: 'Product' });
  const product = await productService.getProductById(id);
  if (product === null) notFound();
  
  const localeSuffix = resolvedLocale.split('-')[0] ?? resolvedLocale;
  const title = resolveProductTitle(product, resolvedLocale, localeSuffix, t);
  const { mainImage, secondaryImages } = resolveProductImages(product);
  
  return { resolvedLocale, t, product, localeSuffix, title, mainImage, secondaryImages };
}

export async function ProductPublicPage({
  params,
  locale,
}: {
  params: { id: string };
  locale?: string;
}): Promise<JSX.Element> {
  const { id } = params;
  const { resolvedLocale, t, product, localeSuffix, title, mainImage, secondaryImages } = await resolveProductData(id, locale);

  const priceLabel = resolvePriceLabel(product.price, resolvedLocale);
  const description = resolveProductDescription(product, resolvedLocale, localeSuffix);
  const categoryLabel = resolveCategoryLabel(product, localeSuffix);
  const stockLabel = typeof product.stock === 'number' ? t('available', { count: product.stock > 0 ? product.stock : 0 }) : null;
  const details = resolveDetails(product, categoryLabel, stockLabel, t);
  const tags = product.tags.map((tg) => tg.tag?.name ?? '').filter((tag): tag is string => tag !== '');
  const requestHeaders = await readOptionalRequestHeaders();
  const cmsDomain = await resolveCmsDomainFromHeaders(requestHeaders);

  const [themeSettings, menuSettings] = await Promise.all([
    getCmsThemeSettings(),
    getCmsMenuSettings(cmsDomain.id, resolvedLocale),
  ]);

  return (
    <CmsPageShell menu={menuSettings} theme={themeSettings} colorSchemes={buildColorSchemeMap(themeSettings)}>
      <div className='relative overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 -z-10 opacity-70'>
          <div className='absolute inset-0' style={{ backgroundImage: 'radial-gradient(900px circle at 0% 0%, color-mix(in srgb, var(--cms-appearance-page-accent) 18%, transparent) 0%, transparent 55%), radial-gradient(800px circle at 100% 0%, color-mix(in srgb, var(--cms-appearance-page-accent) 12%, transparent) 0%, transparent 50%)' }} aria-hidden='true' />
        </div>
        <div className='page-container px-4 py-12 md:px-6 lg:py-16'>
          <ProductBreadcrumbs title={title} t={t} />

          <div className='mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]'>
            <ProductGallery mainImage={mainImage} secondaryImages={secondaryImages} title={title} t={t} />

            <div className='flex flex-col gap-6'>
              <BadgeList tags={tags} t={t} />
              <div className='space-y-3'>
                <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>{title}</h1>
                <div className='flex flex-wrap items-end gap-3'>
                  <p className='text-3xl font-semibold'>{priceLabel}</p>
                  {typeof product.priceComment === 'string' && product.priceComment !== '' && (
                    <p className='text-sm text-[var(--cms-appearance-muted-text)]'>{product.priceComment}</p>
                  )}
                </div>
              </div>
              <p className='text-base text-[var(--cms-appearance-muted-text)] sm:text-lg'>
                {typeof description === 'string' && description !== '' ? description : t('noDescription')}
              </p>
              <ProductDetailsGrid details={details} />
              <div className='flex flex-wrap gap-3'>
                <LocaleLink href='/' className='cms-appearance-button-outline inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold' prefetch={false}>{t('backToStorefront')}</LocaleLink>
                <Link href='/admin' className='cms-appearance-button-primary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold' prefetch={false}>{t('editInAdmin')}<ArrowUpRight className='size-4' aria-hidden='true' /></Link>
              </div>
              <div className='grid gap-4 sm:grid-cols-3'><FeaturesList t={t} /></div>
            </div>
          </div>
        </div>
      </div>
    </CmsPageShell>
  );
}

function FeaturesList({ t }: { t: ProductPageTranslations }): ReactNode {
  return [
    { title: t('themeAlignedTitle'), description: t('themeAlignedDescription'), Icon: Sparkles },
    { title: t('catalogReadyTitle'), description: t('catalogReadyDescription'), Icon: LayoutGrid },
    { title: t('confidentDisplayTitle'), description: t('confidentDisplayDescription'), Icon: ShieldCheck },
  ].map(({ title: itemTitle, description: itemDescription, Icon }) => (
    <div key={itemTitle} className='cms-appearance-surface rounded-2xl border p-4'>
      <div className='flex items-center gap-3'>
        <span className='cms-appearance-subtle-surface inline-flex size-10 items-center justify-center rounded-2xl border'>
          <Icon className='size-5' aria-hidden='true' />
        </span>
        <div>
          <p className='text-sm font-semibold'>{itemTitle}</p>
          <p className='text-xs text-[var(--cms-appearance-muted-text)]'>{itemDescription}</p>
        </div>
      </div>
    </div>
  ));
}
