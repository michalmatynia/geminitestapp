/* eslint-disable @typescript-eslint/no-unnecessary-condition,@typescript-eslint/no-unused-vars,@typescript-eslint/strict-boolean-expressions,complexity,consistent-return,max-lines,max-lines-per-function,no-nested-ternary,no-param-reassign,no-void */
'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type JSX } from 'react';
import {
  HOME_CONTENT_DEFAULTS,
  type HomeContent,
  type HomeCategoriesContent,
  type HomeCategoryCardContent,
  type HomeCategorySelectorType,
  type HomeEditorialContent,
  type HomeEditorialReportContent,
  type HomeFeaturedContent,
  type HomeHeroContent,
  type HomeHeroStatContent,
  type HomeManifestoContent,
  type HomeRecentlyViewedContent,
} from '@/data/homeContent';
import {
  SITE_CONTENT_DEFAULTS,
  type SiteAnnouncementContent,
  type SiteAuthContent,
  type SiteBackToTopContent,
  type SiteCartContent,
  type SiteCollectionCardContent,
  type SiteContent,
  type SiteCookieConsentContent,
  type SiteFooterColumnContent,
  type SiteFooterContent,
  type SiteLinkContent,
  type SiteNavContent,
  type SiteNewsletterContent,
  type SiteNotFoundContent,
  type SiteQuickViewContent,
  type SiteSearchContent,
  type SiteSocialLinkContent,
} from '@/data/siteContent';
import {
  ABOUT_CONTENT_DEFAULTS,
  type AboutArtisanContent,
  type AboutClosingContent,
  type AboutContent,
  type AboutHeroContent,
  type AboutMilestoneContent,
  type AboutOriginContent,
  type AboutStatContent,
  type AboutValueContent,
} from '@/data/aboutContent';
import {
  VALUES_CONTENT_DEFAULTS,
  type ValuesClosingContent,
  type ValuesCommitmentContent,
  type ValuesContent,
  type ValuesHeroContent,
  type ValuesMaterialContent,
  type ValuesStatContent,
} from '@/data/valuesContent';
import {
  STORIES_PAGE_CONTENT_DEFAULTS,
  type StoriesDetailContent,
  type StoriesIndexContent,
  type StoriesPageContent,
} from '@/data/storiesPageContent';
import {
  LOOKBOOK_PAGE_CONTENT_DEFAULTS,
  type LookbookArchiveContent,
  type LookbookCtaContent,
  type LookbookMastheadContent,
  type LookbookPageContent,
} from '@/data/lookbookPageContent';
import {
  CONTACT_CONTENT_DEFAULTS,
  type ContactContent,
  type ContactFormContent,
  type ContactHeroContent,
  type ContactHoursContent,
  type ContactInfoContent,
  type ContactSuccessContent,
} from '@/data/contactContent';
import {
  WISHLIST_CONTENT_DEFAULTS,
  type WishlistContent,
} from '@/data/wishlistContent';
import {
  CHECKOUT_CONTENT_DEFAULTS,
  type CheckoutContent,
  type CheckoutFieldContent,
  type CheckoutShippingCarrier,
  type CheckoutShippingMethodContent,
  type CheckoutStepContent,
  type CheckoutSummaryContent,
  type ShippingZone,
} from '@/data/checkoutContent';
import {
  PRODUCTS_CONTENT_DEFAULTS,
  type ProductsCollectionContent,
  type ProductsContent,
  type ProductsDetailContent,
  type ProductsPriceRangeContent,
  type ProductsSizeGuideRowContent,
  type ProductsSortOptionContent,
} from '@/data/productsContent';
import {
  ACCOUNT_CONTENT_DEFAULTS,
  type AccountAdminContent,
  type AccountContent,
  type AccountHeaderContent,
  type AccountOrdersContent,
  type AccountOverviewContent,
  type AccountPreferenceContent,
  type AccountSettingsContent,
  type AccountSidebarContent,
  type AccountSignedOutContent,
  type AccountStatContent,
  type AccountTabContent,
} from '@/data/accountContent';
import type { Story } from '@/data/stories';
import type { Editorial } from '@/data/lookbook';
import { getHomeCategoryCardHref } from '@/lib/homeCategoryLinks';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type EcomLocale } from '@/lib/locales';

interface CmsResponse {
  ok?: boolean;
  content?: HomeContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface SiteCmsResponse {
  ok?: boolean;
  content?: SiteContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface AboutCmsResponse {
  ok?: boolean;
  content?: AboutContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface ValuesCmsResponse {
  ok?: boolean;
  content?: ValuesContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface StoriesCmsResponse {
  ok?: boolean;
  stories?: Story[];
  story?: Story;
  error?: string;
  errors?: string[];
}

interface LookbookCmsResponse {
  ok?: boolean;
  entries?: Editorial[];
  entry?: Editorial;
  error?: string;
  errors?: string[];
}

interface StoriesPageCmsResponse {
  ok?: boolean;
  content?: StoriesPageContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface LookbookPageCmsResponse {
  ok?: boolean;
  content?: LookbookPageContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface ContactCmsResponse {
  ok?: boolean;
  content?: ContactContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface WishlistCmsResponse {
  ok?: boolean;
  content?: WishlistContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface CheckoutCmsResponse {
  ok?: boolean;
  content?: CheckoutContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface ProductsCmsResponse {
  ok?: boolean;
  content?: ProductsContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface AccountCmsResponse {
  ok?: boolean;
  content?: AccountContent;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
  errors?: string[];
}

interface DeleteCmsResponse {
  ok?: boolean;
  locale?: EcomLocale;
  deleted?: boolean;
  error?: string;
}

interface LogoUploadResponse {
  ok?: boolean;
  url?: string;
  logoAlt?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  error?: string;
}

type CatalogOption = {
  name: string;
  count: number;
};

interface CatalogOptionsResponse {
  categories?: CatalogOption[];
  themes?: CatalogOption[];
  error?: string;
}

const CATEGORY_SELECTOR_TYPES: Array<{ value: HomeCategorySelectorType; label: string }> = [
  { value: 'all', label: 'All products' },
  { value: 'category', label: 'Product categories' },
  { value: 'theme', label: 'Product themes' },
  { value: 'custom', label: 'Custom URL' },
];

const fieldStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  fontWeight: 300,
  outline: 'none',
};

const labelStyle: CSSProperties = {
  color: 'var(--muted)',
  marginBottom: '0.45rem',
  display: 'block',
};

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function statsToText(stats: HomeHeroStatContent[]): string {
  return stats.map((stat) => `${stat.value} | ${stat.label}`).join('\n');
}

function textToStats(value: string): HomeHeroStatContent[] {
  return splitLines(value)
    .map((line) => {
      const [valuePart, ...labelParts] = line.split('|');
      return {
        value: valuePart.trim(),
        label: labelParts.join('|').trim(),
      };
    })
    .filter((stat) => stat.value || stat.label);
}

function categoryCardsToText(cards: HomeCategoryCardContent[]): string {
  return cards
    .map((card) => `${card.id} | ${card.label} | ${card.sublabel} | ${card.tag} | ${card.href} | ${card.imageUrl} | ${card.selectorType} | ${card.selectorValues.join(', ')} | ${card.fallbackCount} | ${card.visible ? 'visible' : 'hidden'}`)
    .join('\n');
}

function parseCategorySelectorType(value: string): HomeCategorySelectorType {
  const normalized = value.trim().toLowerCase();
  return CATEGORY_SELECTOR_TYPES.some((option) => option.value === normalized)
    ? normalized as HomeCategorySelectorType
    : 'custom';
}

function parseCategoryFallbackCount(value: string): number {
  const count = Number(value.trim());
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

function isNumericText(value: string | undefined): boolean {
  const normalized = value?.trim() ?? '';
  return normalized !== '' && Number.isFinite(Number(normalized));
}

function textToCategoryCards(value: string): HomeCategoryCardContent[] {
  return splitLines(value)
    .map((line) => {
      const parts = line.split('|');
      const [id = '', label = '', sublabel = '', tag = '', href = ''] = parts;
      const usesLegacyExpandedOrder =
        parts.length >= 9 &&
        isNumericText(parts[5]) &&
        !isNumericText(parts[8]);
      const imageUrl = parts.length >= 9
        ? usesLegacyExpandedOrder ? parts[6] ?? '' : parts[5] ?? ''
        : '';
      const selectorType = parts.length >= 9
        ? usesLegacyExpandedOrder ? parts[7] ?? 'custom' : parts[6] ?? 'custom'
        : 'custom';
      const selectorValues = parts.length >= 9
        ? usesLegacyExpandedOrder ? parts[8] ?? '' : parts[7] ?? ''
        : '';
      const fallbackCount = parts.length >= 9 && !usesLegacyExpandedOrder ? parts[8] ?? '0' : parts[5] ?? '0';

      return {
        id: id.trim(),
        label: label.trim(),
        sublabel: sublabel.trim(),
        tag: tag.trim(),
        visible: (parts[9] ?? 'visible').trim().toLowerCase() !== 'hidden',
        href: href.trim(),
        imageUrl: imageUrl.trim(),
        selectorType: parseCategorySelectorType(selectorType),
        selectorValues: textToSelectorValues(selectorValues),
        fallbackCount: parseCategoryFallbackCount(fallbackCount),
      };
    })
    .filter((card) => card.id || card.label || card.sublabel || card.tag);
}

function selectorValuesToText(values: string[]): string {
  return values.join('\n');
}

function textToSelectorValues(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeHomeCategoryCard(index: number): HomeCategoryCardContent {
  return {
    id: `selector-${index + 1}`,
    label: 'New selector',
    sublabel: 'Category · Theme',
    tag: 'Selector',
    visible: true,
    href: '/products',
    imageUrl: '',
    selectorType: 'custom',
    selectorValues: [],
    fallbackCount: 0,
  };
}

function makeHomeEditorialReport(index: number): HomeEditorialReportContent {
  return {
    id: `report-${index + 1}`,
    tag: 'Universe Report',
    title: 'New report',
    excerpt: '',
    body: '',
    imageUrl: '',
    visible: true,
    href: '/lore-drops',
  };
}

function getHomeCategoryCardTarget(
  card: HomeCategoryCardContent,
  catalogCategories: CatalogOption[] = [],
): string {
  return getHomeCategoryCardHref(card, catalogCategories);
}

function reportsToText(reports: HomeEditorialReportContent[]): string {
  return reports
    .map((report) => {
      const body = report.body.replace(/\n/g, '\\n');
      return [
        report.id,
        report.tag,
        report.title,
        report.excerpt,
        report.href,
        report.imageUrl,
        report.visible ? 'visible' : 'hidden',
        body,
      ].join(' | ');
    })
    .join('\n');
}

function textToReports(value: string): HomeEditorialReportContent[] {
  return splitLines(value)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length <= 4) {
        const [tag = '', title = '', excerpt = '', href = ''] = parts;
        return {
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          tag,
          title,
          excerpt,
          body: excerpt,
          imageUrl: '',
          visible: true,
          href,
        };
      }
      const isLegacyVisibleField = (parts[5]?.toLowerCase() === 'visible' || parts[5]?.toLowerCase() === 'hidden');
      const [
        id = '',
        tag = '',
        title = '',
        excerpt = '',
        href = '',
        imageUrl = '',
        visible = 'visible',
        body = '',
      ] = parts;
      if (isLegacyVisibleField) {
        return {
          id,
          tag,
          title,
          excerpt,
          imageUrl: '',
          body: parts[6]?.replace(/\\n/g, '\n') ?? (excerpt || ''),
          visible: parts[5]?.toLowerCase() !== 'hidden',
          href,
        };
      }
      return {
        id,
        tag,
        title,
        excerpt,
        imageUrl,
        body: body.replace(/\\n/g, '\n') || excerpt,
        visible: visible.toLowerCase() !== 'hidden',
        href,
      };
    })
    .filter((report) => report.tag || report.title || report.excerpt);
}

function linksToText(links: SiteLinkContent[]): string {
  return links.map((link) => `${link.label} | ${link.href}`).join('\n');
}

function textToLinks(value: string): SiteLinkContent[] {
  return splitLines(value)
    .map((line) => {
      const [label = '', href = ''] = line.split('|');
      return {
        label: label.trim(),
        href: href.trim(),
      };
    })
    .filter((link) => link.label || link.href);
}

function socialsToText(socials: SiteSocialLinkContent[]): string {
  return socials.map((social) => `${social.name} | ${social.icon} | ${social.href}`).join('\n');
}

function textToSocials(value: string): SiteSocialLinkContent[] {
  return splitLines(value)
    .map((line) => {
      const [name = '', icon = '', href = ''] = line.split('|');
      return {
        name: name.trim(),
        icon: icon.trim(),
        href: href.trim(),
      };
    })
    .filter((social) => social.name || social.icon || social.href);
}

function footerColumnsToText(columns: SiteFooterColumnContent[]): string {
  return columns
    .flatMap((column) => column.links.map((link) => `${column.heading} | ${link.label} | ${link.href}`))
    .join('\n');
}

function textToFooterColumns(value: string): SiteFooterColumnContent[] {
  const byHeading = new Map<string, SiteLinkContent[]>();
  for (const line of splitLines(value)) {
    const [heading = '', label = '', href = ''] = line.split('|');
    const trimmedHeading = heading.trim();
    const trimmedLabel = label.trim();
    const trimmedHref = href.trim();
    if (!trimmedHeading || (!trimmedLabel && !trimmedHref)) continue;
    const links = byHeading.get(trimmedHeading) ?? [];
    links.push({ label: trimmedLabel, href: trimmedHref });
    byHeading.set(trimmedHeading, links);
  }

  return Array.from(byHeading.entries()).map(([heading, links]) => ({ heading, links }));
}

function collectionCardsToText(cards: SiteCollectionCardContent[]): string {
  return cards.map((card) => `${card.slug} | ${card.label} | ${card.href} | ${card.gradient}`).join('\n');
}

function textToCollectionCards(value: string): SiteCollectionCardContent[] {
  return splitLines(value)
    .map((line) => {
      const [slug = '', label = '', href = '', ...gradientParts] = line.split('|');
      return {
        slug: slug.trim(),
        label: label.trim(),
        href: href.trim(),
        gradient: gradientParts.join('|').trim(),
      };
    })
    .filter((card) => card.slug || card.label || card.href || card.gradient);
}

function aboutStatsToText(stats: AboutStatContent[]): string {
  return stats.map((stat) => `${stat.value} | ${stat.label} | ${stat.sub}`).join('\n');
}

function textToAboutStats(value: string): AboutStatContent[] {
  return splitLines(value)
    .map((line) => {
      const [statValue = '', label = '', sub = ''] = line.split('|');
      return {
        value: statValue.trim(),
        label: label.trim(),
        sub: sub.trim(),
      };
    })
    .filter((stat) => stat.value || stat.label || stat.sub);
}

function milestonesToText(milestones: AboutMilestoneContent[]): string {
  return milestones.map((milestone) => `${milestone.year} | ${milestone.event}`).join('\n');
}

function textToMilestones(value: string): AboutMilestoneContent[] {
  return splitLines(value)
    .map((line) => {
      const [year = '', ...eventParts] = line.split('|');
      return {
        year: year.trim(),
        event: eventParts.join('|').trim(),
      };
    })
    .filter((milestone) => milestone.year || milestone.event);
}

function artisansToText(artisans: AboutArtisanContent[]): string {
  return artisans.map((artisan) => `${artisan.name} | ${artisan.role} | ${artisan.location} | ${artisan.note}`).join('\n');
}

function textToArtisans(value: string): AboutArtisanContent[] {
  return splitLines(value)
    .map((line) => {
      const [name = '', role = '', location = '', ...noteParts] = line.split('|');
      return {
        name: name.trim(),
        role: role.trim(),
        location: location.trim(),
        note: noteParts.join('|').trim(),
      };
    })
    .filter((artisan) => artisan.name || artisan.role || artisan.location || artisan.note);
}

function aboutValuesToText(values: AboutValueContent[]): string {
  return values.map((value) => `${value.number} | ${value.title} | ${value.body}`).join('\n');
}

function textToAboutValues(value: string): AboutValueContent[] {
  return splitLines(value)
    .map((line) => {
      const [number = '', title = '', ...bodyParts] = line.split('|');
      return {
        number: number.trim(),
        title: title.trim(),
        body: bodyParts.join('|').trim(),
      };
    })
    .filter((item) => item.number || item.title || item.body);
}

function valuesStatsToText(stats: ValuesStatContent[]): string {
  return stats.map((stat) => `${stat.value} | ${stat.label}`).join('\n');
}

function textToValuesStats(value: string): ValuesStatContent[] {
  return splitLines(value)
    .map((line) => {
      const [statValue = '', label = ''] = line.split('|');
      return {
        value: statValue.trim(),
        label: label.trim(),
      };
    })
    .filter((stat) => stat.value || stat.label);
}

function valuesMaterialsToText(materials: ValuesMaterialContent[]): string {
  return materials.map((material) => `${material.name} | ${material.origin} | ${material.desc}`).join('\n');
}

function textToValuesMaterials(value: string): ValuesMaterialContent[] {
  return splitLines(value)
    .map((line) => {
      const [name = '', origin = '', ...descParts] = line.split('|');
      return {
        name: name.trim(),
        origin: origin.trim(),
        desc: descParts.join('|').trim(),
      };
    })
    .filter((material) => material.name || material.origin || material.desc);
}

function valuesCommitmentsToText(commitments: ValuesCommitmentContent[]): string {
  return commitments.map((commitment) => `${commitment.title} | ${commitment.body}`).join('\n');
}

function textToValuesCommitments(value: string): ValuesCommitmentContent[] {
  return splitLines(value)
    .map((line) => {
      const [title = '', ...bodyParts] = line.split('|');
      return {
        title: title.trim(),
        body: bodyParts.join('|').trim(),
      };
    })
    .filter((commitment) => commitment.title || commitment.body);
}

function contactHoursToText(hours: ContactHoursContent[]): string {
  return hours.map((row) => `${row.label} | ${row.value} | ${row.muted ? 'muted' : 'active'}`).join('\n');
}

function textToContactHours(value: string): ContactHoursContent[] {
  return splitLines(value)
    .map((line) => {
      const [label = '', hourValue = '', muted = ''] = line.split('|');
      return {
        label: label.trim(),
        value: hourValue.trim(),
        muted: muted.trim().toLowerCase() === 'muted' || muted.trim().toLowerCase() === 'true',
      };
    })
    .filter((row) => row.label || row.value);
}

function isTruthyToken(value: string): boolean {
  const token = value.trim().toLowerCase();
  return token === 'true' || token === 'yes' || token === '1' || token === 'half' || token === 'mono';
}

function checkoutStepsToText(steps: CheckoutStepContent[]): string {
  return steps.map((step) => `${step.key} | ${step.label}`).join('\n');
}

function textToCheckoutSteps(value: string): CheckoutStepContent[] {
  return splitLines(value)
    .map((line) => {
      const [key = '', label = ''] = line.split('|');
      return {
        key: key.trim() as CheckoutStepContent['key'],
        label: label.trim(),
      };
    })
    .filter((step) => step.key || step.label);
}

function checkoutFieldsToText(fields: CheckoutFieldContent[]): string {
  return fields
    .map((field) => [
      field.id,
      field.label,
      field.type ?? '',
      field.placeholder,
      field.half ? 'half' : '',
      field.maxLength ?? '',
      field.monospace ? 'mono' : '',
    ].join(' | '))
    .join('\n');
}

function textToCheckoutFields(value: string): CheckoutFieldContent[] {
  return splitLines(value)
    .map((line) => {
      const [id = '', label = '', type = '', placeholder = '', half = '', maxLength = '', monospace = ''] = line.split('|');
      const parsedMaxLength = Number(maxLength.trim());
      return {
        id: id.trim(),
        label: label.trim(),
        type: type.trim() || undefined,
        placeholder: placeholder.trim(),
        half: isTruthyToken(half),
        maxLength: Number.isFinite(parsedMaxLength) && parsedMaxLength > 0 ? Math.round(parsedMaxLength) : undefined,
        monospace: isTruthyToken(monospace),
      };
    })
    .filter((field) => field.id || field.label || field.placeholder);
}

function checkoutShippingMethodsToText(methods: CheckoutShippingMethodContent[]): string {
  return methods.map((method) => [
    method.id,
    method.label,
    method.detail,
    method.price,
    method.priceLabel,
    method.businessDaysMin,
    method.businessDaysMax,
    method.carrier ?? 'manual',
    method.service ?? '',
    method.requiresPickupPoint ? 'pickup' : '',
  ].join(' | ')).join('\n');
}

const CHECKOUT_SHIPPING_CARRIERS = new Set<CheckoutShippingCarrier>([
  'manual',
  'inpost',
  'poczta_polska',
  'dpd',
]);

function normalizeCheckoutShippingCarrier(value: string): CheckoutShippingCarrier {
  const normalized = value.trim() as CheckoutShippingCarrier;
  return CHECKOUT_SHIPPING_CARRIERS.has(normalized) ? normalized : 'manual';
}

function textToCheckoutShippingMethods(value: string): CheckoutShippingMethodContent[] {
  return splitLines(value)
    .map((line) => {
      const [
        id = '',
        label = '',
        detail = '',
        price = '0',
        priceLabel = '',
        businessDaysMin = '3',
        businessDaysMax = '5',
        carrier = 'manual',
        service = '',
        requiresPickupPoint = '',
      ] = line.split('|');
      const parsedPrice = Number(price.trim());
      const parsedMin = Number(businessDaysMin.trim());
      const parsedMax = Number(businessDaysMax.trim());
      const minDays = Number.isFinite(parsedMin) && Number.isInteger(parsedMin) && parsedMin > 0 ? parsedMin : 3;
      const maxDays = Number.isFinite(parsedMax) && Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : minDays;
      const normalizedCarrier = normalizeCheckoutShippingCarrier(carrier);
      return {
        id: id.trim(),
        label: label.trim(),
        detail: detail.trim(),
        price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice) : 0,
        priceLabel: priceLabel.trim(),
        businessDaysMin: minDays,
        businessDaysMax: Math.max(minDays, maxDays),
        carrier: normalizedCarrier,
        service: service.trim() || undefined,
        requiresPickupPoint: isTruthyToken(requiresPickupPoint),
      };
    })
    .filter((method) => method.id || method.label || method.detail);
}

function makeCheckoutShippingMethod(index: number): CheckoutShippingMethodContent {
  return {
    id: index === 0 ? 'standard' : `method-${index + 1}`,
    label: index === 0 ? 'Standard' : `Method ${index + 1}`,
    detail: '3-5 business days',
    price: 0,
    priceLabel: 'Free',
    businessDaysMin: 3,
    businessDaysMax: 5,
  };
}

function makeShippingZone(index: number): ShippingZone {
  return {
    id: `zone-${index + 1}`,
    label: `Zone ${index + 1}`,
    countries: [],
    methods: [makeCheckoutShippingMethod(0)],
  };
}

function insertShippingZoneBeforeCatchAll(zones: ShippingZone[], zone: ShippingZone): ShippingZone[] {
  let catchAllIndex = -1;
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    if (zones[index].countries.length === 0) {
      catchAllIndex = index;
      break;
    }
  }
  if (catchAllIndex < 0) return [...zones, zone];
  return [
    ...zones.slice(0, catchAllIndex),
    zone,
    ...zones.slice(catchAllIndex),
  ];
}

function parseNonNegativeInteger(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function parsePositiveInteger(value: string, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function productsSortOptionsToText(options: ProductsSortOptionContent[]): string {
  return options.map((option) => `${option.value} | ${option.label}`).join('\n');
}

function textToProductsSortOptions(value: string): ProductsSortOptionContent[] {
  return splitLines(value)
    .map((line) => {
      const [optionValue = '', label = ''] = line.split('|');
      return {
        value: optionValue.trim(),
        label: label.trim(),
      };
    })
    .filter((option) => option.value || option.label);
}

function productsPriceRangesToText(ranges: ProductsPriceRangeContent[]): string {
  return ranges.map((range) => `${range.label} | ${range.min} | ${range.max ?? ''}`).join('\n');
}

function textToProductsPriceRanges(value: string): ProductsPriceRangeContent[] {
  return splitLines(value)
    .map((line) => {
      const [label = '', min = '0', max = ''] = line.split('|');
      const parsedMin = Number(min.trim());
      const parsedMax = Number(max.trim());
      return {
        label: label.trim(),
        min: Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 0,
        max: max.trim() && Number.isFinite(parsedMax) && parsedMax >= 0 ? parsedMax : null,
      };
    })
    .filter((range) => range.label);
}

function productsSizeGuideRowsToText(rows: ProductsSizeGuideRowContent[]): string {
  return rows.map((row) => `${row.size} | ${row.chest} | ${row.waist} | ${row.hips}`).join('\n');
}

function textToProductsSizeGuideRows(value: string): ProductsSizeGuideRowContent[] {
  return splitLines(value)
    .map((line) => {
      const [size = '', chest = '', waist = '', hips = ''] = line.split('|');
      return {
        size: size.trim(),
        chest: chest.trim(),
        waist: waist.trim(),
        hips: hips.trim(),
      };
    })
    .filter((row) => row.size || row.chest || row.waist || row.hips);
}

function accountTabsToText(tabs: AccountTabContent[]): string {
  return tabs.map((tab) => `${tab.id} | ${tab.label}`).join('\n');
}

function textToAccountTabs(value: string): AccountTabContent[] {
  return splitLines(value)
    .map((line) => {
      const [id = '', label = ''] = line.split('|');
      return {
        id: id.trim() as AccountTabContent['id'],
        label: label.trim(),
      };
    })
    .filter((tab) => tab.id || tab.label);
}

function accountStatsToText(stats: AccountStatContent[]): string {
  return stats.map((stat) => `${stat.key} | ${stat.label} | ${stat.fallbackValue ?? ''}`).join('\n');
}

function textToAccountStats(value: string): AccountStatContent[] {
  return splitLines(value)
    .map((line) => {
      const [key = '', label = '', fallbackValue = ''] = line.split('|');
      return {
        key: key.trim() as AccountStatContent['key'],
        label: label.trim(),
        fallbackValue: fallbackValue.trim() || undefined,
      };
    })
    .filter((stat) => stat.key || stat.label);
}

function accountPreferencesToText(preferences: AccountPreferenceContent[]): string {
  return preferences.map((preference) => `${preference.label} | ${preference.checked ? 'true' : 'false'}`).join('\n');
}

function textToAccountPreferences(value: string): AccountPreferenceContent[] {
  return splitLines(value)
    .map((line) => {
      const [label = '', checked = 'false'] = line.split('|');
      return {
        label: label.trim(),
        checked: isTruthyToken(checked),
      };
    })
    .filter((preference) => preference.label);
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function makeStoryDraft(index: number): Story {
  const suffix = Date.now().toString(36);
  return {
    id: `cms-${index + 1}-${suffix}`,
    slug: `new-story-${suffix}`,
    category: 'Editorial',
    title: 'New Story',
    subtitle: 'Short story subtitle',
    excerpt: 'Short summary for story cards and metadata.',
    readTime: '3 min',
    date: 'May 2026',
    gradient: 'linear-gradient(145deg, #0a0d1e 0%, #142a50 100%)',
    accentColor: '#ABD9D0',
    textColor: '#E8F0EC',
    tags: ['Editorial'],
    body: [
      { type: 'paragraph', text: 'Write the story body here.' },
    ],
    relatedSlugs: [],
  };
}

function makeLookbookDraft(index: number): Editorial {
  const suffix = Date.now().toString(36);
  return {
    id: `cms-lookbook-${index + 1}-${suffix}`,
    issue: String(index + 1).padStart(2, '0'),
    title: 'New Lookbook Entry',
    subtitle: 'Short lookbook description',
    season: 'Spring 2026',
    gradient: 'linear-gradient(145deg, #0a0d1e 0%, #142a50 100%)',
    textColor: '#f5f0eb',
    productSlug: 'amphora-vessel',
  };
}

function formatMetaDate(value: string | null): string {
  if (!value) return 'Not saved yet';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type LocaleStatus = {
  updatedAt: string | null;
  saved: boolean;
};

const LOCALE_LABELS: Record<EcomLocale, string> = {
  en: 'EN',
  pl: 'PL',
};

const PAGE_CMS_ENDPOINTS = [
  'home',
  'site',
  'about',
  'values',
  'stories-page',
  'lookbook-page',
  'contact',
  'wishlist',
  'checkout',
  'products',
  'account',
] as const;

function latestUpdatedAt(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return sorted[0] ?? null;
}

function formatLocaleStatus(status?: LocaleStatus): string {
  if (!status) return 'Loading';
  if (!status.saved) return 'Not yet saved';
  return `Last saved: ${formatMetaDate(status.updatedAt)}`;
}

interface PageEditorSnapshotInput {
  content: HomeContent;
  siteContent: SiteContent;
  aboutContent: AboutContent;
  valuesContent: ValuesContent;
  storiesPageContent: StoriesPageContent;
  lookbookPageContent: LookbookPageContent;
  contactContent: ContactContent;
  wishlistContent: WishlistContent;
  checkoutContent: CheckoutContent;
  productsContent: ProductsContent;
  accountContent: AccountContent;
}

interface CleanEditorSnapshots {
  page: string | null;
  story: string | null;
  lookbook: string | null;
}

function buildPageEditorSnapshot(snapshot: PageEditorSnapshotInput): string {
  return JSON.stringify(snapshot);
}

function buildDraftEditorSnapshot(selectedId: string | null, draft: string): string {
  return JSON.stringify({ selectedId, draft });
}

function Field({
  label,
  value,
  type = 'text',
  inputMode,
  min,
  step,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  inputMode?: 'numeric' | 'decimal';
  min?: number;
  step?: number;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label>
      <span className='type-label' style={labelStyle}>{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...fieldStyle, padding: '0.8rem 0.9rem' }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  rows = 4,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label>
      <span className='type-label' style={labelStyle}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...fieldStyle, padding: '0.9rem', resize: 'vertical', lineHeight: 1.6 }}
      />
    </label>
  );
}

function ShippingMethodFields({
  title,
  method,
  onChange,
  onRemove,
}: {
  title: string;
  method: CheckoutShippingMethodContent;
  onChange: (key: keyof CheckoutShippingMethodContent, value: string | number | boolean) => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <div style={{ border: '1px solid var(--border)', padding: '1rem', display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <div className='type-label' style={{ color: 'var(--accent)' }}>{title}</div>
        <button
          type='button'
          className='btn-ghost'
          onClick={onRemove}
          style={{ fontSize: '0.66rem', padding: '0.45rem 0.65rem', color: 'var(--coral-red)' }}
        >
          Remove
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <Field label='Method ID' value={method.id} onChange={(value) => onChange('id', value)} />
        <Field label='Label' value={method.label} onChange={(value) => onChange('label', value)} />
        <Field label='Detail' value={method.detail} onChange={(value) => onChange('detail', value)} />
        <Field
          label='Carrier (manual, inpost, poczta_polska, dpd)'
          value={method.carrier ?? 'manual'}
          onChange={(value) => onChange('carrier', normalizeCheckoutShippingCarrier(value))}
        />
        <Field label='Carrier service' value={method.service ?? ''} onChange={(value) => onChange('service', value)} />
        <Field
          label='Price (€)'
          type='number'
          inputMode='decimal'
          min={0}
          step={1}
          value={String(method.price)}
          onChange={(value) => onChange('price', parseNonNegativeInteger(value, method.price))}
        />
        <Field label='Price label' value={method.priceLabel} onChange={(value) => onChange('priceLabel', value)} />
        <Field
          label='Business days min'
          type='number'
          inputMode='numeric'
          min={1}
          step={1}
          value={String(method.businessDaysMin)}
          onChange={(value) => onChange('businessDaysMin', parsePositiveInteger(value, method.businessDaysMin))}
        />
        <Field
          label='Business days max'
          type='number'
          inputMode='numeric'
          min={1}
          step={1}
          value={String(method.businessDaysMax)}
          onChange={(value) => onChange('businessDaysMax', parsePositiveInteger(value, method.businessDaysMax))}
        />
        <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <input
            type='checkbox'
            checked={Boolean(method.requiresPickupPoint)}
            onChange={(event) => onChange('requiresPickupPoint', event.target.checked)}
            style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
          />
          Requires pickup point
        </label>
      </div>
    </div>
  );
}

interface CmsSaveMeta {
  label: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface AdminCmsHeaderProps {
  locales: readonly EcomLocale[];
  selectedLocale: EcomLocale;
  localeStatus: Partial<Record<EcomLocale, LocaleStatus>>;
  disabled: boolean;
  saving: boolean;
  hasUnsavedChanges: boolean;
  unsavedChangeLabels: string[];
  saveMeta: CmsSaveMeta[];
  onLocaleSelect: (locale: EcomLocale) => void;
  onCopyFromDefault: () => void;
  onDeleteLocaleOverride: () => void;
  onResetDefaults: () => void;
  onSave: () => void;
}

function LocaleSwitcher({
  locales,
  selectedLocale,
  localeStatus,
  disabled,
  onLocaleSelect,
}: {
  locales: readonly EcomLocale[];
  selectedLocale: EcomLocale;
  localeStatus: Partial<Record<EcomLocale, LocaleStatus>>;
  disabled: boolean;
  onLocaleSelect: (locale: EcomLocale) => void;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      {locales.map((locale) => {
        const selected = locale === selectedLocale;
        return (
          <button
            key={locale}
            type='button'
            className={selected ? 'btn-primary' : 'btn-ghost'}
            onClick={() => onLocaleSelect(locale)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontSize: '0.72rem',
              padding: '0.65rem 0.85rem',
            }}
          >
            <span>{LOCALE_LABELS[locale]}</span>
            {locale !== DEFAULT_LOCALE && (
              <span style={{
                color: selected ? 'var(--bg)' : 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem',
              }}>
                {formatLocaleStatus(localeStatus[locale])}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CmsSaveStatus({
  saveMeta,
  hasUnsavedChanges,
  unsavedChangeLabels,
}: {
  saveMeta: CmsSaveMeta[];
  hasUnsavedChanges: boolean;
  unsavedChangeLabels: string[];
}): JSX.Element {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.7 }}>
      {saveMeta.map((meta) => (
        <div key={meta.label}>
          {meta.label} save: {formatMetaDate(meta.updatedAt)}{meta.updatedBy ? ` · ${meta.updatedBy}` : ''}
        </div>
      ))}
      {hasUnsavedChanges && (
        <div style={{ color: 'var(--coral-red)', marginTop: '0.45rem' }}>
          Unsaved changes: {unsavedChangeLabels.join(', ')}
        </div>
      )}
    </div>
  );
}

function AdminCmsHeader({
  locales,
  selectedLocale,
  localeStatus,
  disabled,
  saving,
  hasUnsavedChanges,
  unsavedChangeLabels,
  saveMeta,
  onLocaleSelect,
  onCopyFromDefault,
  onDeleteLocaleOverride,
  onResetDefaults,
  onSave,
}: AdminCmsHeaderProps): JSX.Element {
  const canCopyFromDefault = selectedLocale !== DEFAULT_LOCALE && localeStatus[selectedLocale]?.saved === false;
  const canDeleteLocaleOverride = selectedLocale !== DEFAULT_LOCALE && localeStatus[selectedLocale]?.saved === true;

  return (
    <>
      <div className='type-label' style={{ color: 'var(--coral-red)', marginBottom: '1rem' }}>
        Homepage CMS
      </div>

      <LocaleSwitcher
        locales={locales}
        selectedLocale={selectedLocale}
        localeStatus={localeStatus}
        disabled={disabled}
        onLocaleSelect={onLocaleSelect}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <CmsSaveStatus
          saveMeta={saveMeta}
          hasUnsavedChanges={hasUnsavedChanges}
          unsavedChangeLabels={unsavedChangeLabels}
        />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canCopyFromDefault && (
            <button
              type='button'
              className='btn-ghost'
              onClick={onCopyFromDefault}
              disabled={disabled}
              style={{ fontSize: '0.72rem' }}
            >
              Copy from EN
            </button>
          )}
          {canDeleteLocaleOverride && (
            <button
              type='button'
              className='btn-ghost'
              onClick={onDeleteLocaleOverride}
              disabled={disabled}
              style={{ fontSize: '0.72rem', color: 'var(--coral-red)' }}
            >
              Delete {LOCALE_LABELS[selectedLocale]} override
            </button>
          )}
          <button
            type='button'
            className='btn-ghost'
            onClick={onResetDefaults}
            disabled={disabled}
            style={{ fontSize: '0.72rem' }}
          >
            Reset defaults
          </button>
          <button
            type='button'
            className='btn-primary'
            onClick={onSave}
            disabled={disabled}
            style={{ fontSize: '0.72rem' }}
          >
            {saving ? 'Saving...' : 'Save content'}
          </button>
        </div>
      </div>
    </>
  );
}

interface AdminCmsEditorProps {
  availableLocales?: readonly EcomLocale[];
}

export function AdminCmsEditor({ availableLocales = SUPPORTED_LOCALES }: AdminCmsEditorProps): JSX.Element {
  const locales = useMemo(() => {
    const seen = new Set<EcomLocale>();
    const normalized = availableLocales.filter((locale): locale is EcomLocale => {
      if (!SUPPORTED_LOCALES.includes(locale) || seen.has(locale)) return false;
      seen.add(locale);
      return true;
    });
    return normalized.length > 0 ? normalized : [...SUPPORTED_LOCALES];
  }, [availableLocales]);
  const [content, setContent] = useState<HomeContent>(HOME_CONTENT_DEFAULTS);
  const [siteContent, setSiteContent] = useState<SiteContent>(SITE_CONTENT_DEFAULTS);
  const [aboutContent, setAboutContent] = useState<AboutContent>(ABOUT_CONTENT_DEFAULTS);
  const [valuesContent, setValuesContent] = useState<ValuesContent>(VALUES_CONTENT_DEFAULTS);
  const [storiesPageContent, setStoriesPageContent] = useState<StoriesPageContent>(STORIES_PAGE_CONTENT_DEFAULTS);
  const [lookbookPageContent, setLookbookPageContent] = useState<LookbookPageContent>(LOOKBOOK_PAGE_CONTENT_DEFAULTS);
  const [contactContent, setContactContent] = useState<ContactContent>(CONTACT_CONTENT_DEFAULTS);
  const [wishlistContent, setWishlistContent] = useState<WishlistContent>(WISHLIST_CONTENT_DEFAULTS);
  const [checkoutContent, setCheckoutContent] = useState<CheckoutContent>(CHECKOUT_CONTENT_DEFAULTS);
  const [productsContent, setProductsContent] = useState<ProductsContent>(PRODUCTS_CONTENT_DEFAULTS);
  const [accountContent, setAccountContent] = useState<AccountContent>(ACCOUNT_CONTENT_DEFAULTS);
  const [selectedLocale, setSelectedLocale] = useState<EcomLocale>(DEFAULT_LOCALE);
  const [localeStatus, setLocaleStatus] = useState<Partial<Record<EcomLocale, LocaleStatus>>>({});
  const [localeReloadKey, setLocaleReloadKey] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyDraft, setStoryDraft] = useState('');
  const [selectedStorySlug, setSelectedStorySlug] = useState<string | null>(null);
  const [lookbookEntries, setLookbookEntries] = useState<Editorial[]>([]);
  const [lookbookDraft, setLookbookDraft] = useState('');
  const [selectedLookbookId, setSelectedLookbookId] = useState<string | null>(null);
  const [catalogCategoryOptions, setCatalogCategoryOptions] = useState<CatalogOption[]>([]);
  const [catalogThemeOptions, setCatalogThemeOptions] = useState<CatalogOption[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [siteUpdatedAt, setSiteUpdatedAt] = useState<string | null>(null);
  const [siteUpdatedBy, setSiteUpdatedBy] = useState<string | null>(null);
  const [aboutUpdatedAt, setAboutUpdatedAt] = useState<string | null>(null);
  const [aboutUpdatedBy, setAboutUpdatedBy] = useState<string | null>(null);
  const [valuesUpdatedAt, setValuesUpdatedAt] = useState<string | null>(null);
  const [valuesUpdatedBy, setValuesUpdatedBy] = useState<string | null>(null);
  const [storiesPageUpdatedAt, setStoriesPageUpdatedAt] = useState<string | null>(null);
  const [storiesPageUpdatedBy, setStoriesPageUpdatedBy] = useState<string | null>(null);
  const [lookbookPageUpdatedAt, setLookbookPageUpdatedAt] = useState<string | null>(null);
  const [lookbookPageUpdatedBy, setLookbookPageUpdatedBy] = useState<string | null>(null);
  const [contactUpdatedAt, setContactUpdatedAt] = useState<string | null>(null);
  const [contactUpdatedBy, setContactUpdatedBy] = useState<string | null>(null);
  const [wishlistUpdatedAt, setWishlistUpdatedAt] = useState<string | null>(null);
  const [wishlistUpdatedBy, setWishlistUpdatedBy] = useState<string | null>(null);
  const [checkoutUpdatedAt, setCheckoutUpdatedAt] = useState<string | null>(null);
  const [checkoutUpdatedBy, setCheckoutUpdatedBy] = useState<string | null>(null);
  const [productsUpdatedAt, setProductsUpdatedAt] = useState<string | null>(null);
  const [productsUpdatedBy, setProductsUpdatedBy] = useState<string | null>(null);
  const [accountUpdatedAt, setAccountUpdatedAt] = useState<string | null>(null);
  const [accountUpdatedBy, setAccountUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storySaving, setStorySaving] = useState(false);
  const [lookbookSaving, setLookbookSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [categoryImageUploadingIndex, setCategoryImageUploadingIndex] = useState<number | null>(null);
  const [editorialReportImageUploadingIndex, setEditorialReportImageUploadingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const cleanSnapshotsRef = useRef<CleanEditorSnapshots>({ page: null, story: null, lookbook: null });

  const pageSnapshot = useMemo(() => buildPageEditorSnapshot({
    content,
    siteContent,
    aboutContent,
    valuesContent,
    storiesPageContent,
    lookbookPageContent,
    contactContent,
    wishlistContent,
    checkoutContent,
    productsContent,
    accountContent,
  }), [
    content,
    siteContent,
    aboutContent,
    valuesContent,
    storiesPageContent,
    lookbookPageContent,
    contactContent,
    wishlistContent,
    checkoutContent,
    productsContent,
    accountContent,
  ]);
  const storySnapshot = useMemo(
    () => buildDraftEditorSnapshot(selectedStorySlug, storyDraft),
    [selectedStorySlug, storyDraft],
  );
  const lookbookSnapshot = useMemo(
    () => buildDraftEditorSnapshot(selectedLookbookId, lookbookDraft),
    [selectedLookbookId, lookbookDraft],
  );
  const hasPageUnsavedChanges =
    !loading && cleanSnapshotsRef.current.page !== null && cleanSnapshotsRef.current.page !== pageSnapshot;
  const hasStoryUnsavedChanges =
    !loading && cleanSnapshotsRef.current.story !== null && cleanSnapshotsRef.current.story !== storySnapshot;
  const hasLookbookUnsavedChanges =
    !loading && cleanSnapshotsRef.current.lookbook !== null && cleanSnapshotsRef.current.lookbook !== lookbookSnapshot;
  const hasUnsavedChanges =
    hasPageUnsavedChanges || hasStoryUnsavedChanges || hasLookbookUnsavedChanges;
  const unsavedChangeLabels = [
    hasPageUnsavedChanges ? 'page copy' : null,
    hasStoryUnsavedChanges ? 'story draft' : null,
    hasLookbookUnsavedChanges ? 'lookbook draft' : null,
  ].filter((label): label is string => Boolean(label));
  const headerDisabled =
    loading || saving || logoUploading || categoryImageUploadingIndex !== null || editorialReportImageUploadingIndex !== null;
  const saveMeta = useMemo<CmsSaveMeta[]>(() => [
    { label: 'Homepage', updatedAt, updatedBy },
    { label: 'Global', updatedAt: siteUpdatedAt, updatedBy: siteUpdatedBy },
    { label: 'About', updatedAt: aboutUpdatedAt, updatedBy: aboutUpdatedBy },
    { label: 'Values', updatedAt: valuesUpdatedAt, updatedBy: valuesUpdatedBy },
    { label: 'Stories page', updatedAt: storiesPageUpdatedAt, updatedBy: storiesPageUpdatedBy },
    { label: 'Lookbook page', updatedAt: lookbookPageUpdatedAt, updatedBy: lookbookPageUpdatedBy },
    { label: 'Contact', updatedAt: contactUpdatedAt, updatedBy: contactUpdatedBy },
    { label: 'Wishlist', updatedAt: wishlistUpdatedAt, updatedBy: wishlistUpdatedBy },
    { label: 'Checkout', updatedAt: checkoutUpdatedAt, updatedBy: checkoutUpdatedBy },
    { label: 'Products', updatedAt: productsUpdatedAt, updatedBy: productsUpdatedBy },
    { label: 'Account', updatedAt: accountUpdatedAt, updatedBy: accountUpdatedBy },
  ], [
    updatedAt,
    updatedBy,
    siteUpdatedAt,
    siteUpdatedBy,
    aboutUpdatedAt,
    aboutUpdatedBy,
    valuesUpdatedAt,
    valuesUpdatedBy,
    storiesPageUpdatedAt,
    storiesPageUpdatedBy,
    lookbookPageUpdatedAt,
    lookbookPageUpdatedBy,
    contactUpdatedAt,
    contactUpdatedBy,
    wishlistUpdatedAt,
    wishlistUpdatedBy,
    checkoutUpdatedAt,
    checkoutUpdatedBy,
    productsUpdatedAt,
    productsUpdatedBy,
    accountUpdatedAt,
    accountUpdatedBy,
  ]);

  function setCleanStoryDraft(selectedSlug: string | null, draft: string): void {
    setSelectedStorySlug(selectedSlug);
    setStoryDraft(draft);
    cleanSnapshotsRef.current = {
      ...cleanSnapshotsRef.current,
      story: buildDraftEditorSnapshot(selectedSlug, draft),
    };
  }

  function setCleanLookbookDraft(selectedId: string | null, draft: string): void {
    setSelectedLookbookId(selectedId);
    setLookbookDraft(draft);
    cleanSnapshotsRef.current = {
      ...cleanSnapshotsRef.current,
      lookbook: buildDraftEditorSnapshot(selectedId, draft),
    };
  }

  function confirmDiscardAllUnsavedChanges(): boolean {
    if (!hasUnsavedChanges) return true;
    return window.confirm(
      `Discard unsaved ${LOCALE_LABELS[selectedLocale]} CMS changes (${unsavedChangeLabels.join(', ')})?`,
    );
  }

  function confirmDiscardStoryDraft(): boolean {
    if (!hasStoryUnsavedChanges) return true;
    return window.confirm('Discard unsaved story draft changes?');
  }

  function confirmDiscardLookbookDraft(): boolean {
    if (!hasLookbookUnsavedChanges) return true;
    return window.confirm('Discard unsaved lookbook draft changes?');
  }

  function clearCleanSnapshots(): void {
    cleanSnapshotsRef.current = { page: null, story: null, lookbook: null };
  }

  function handleLocaleSelect(locale: EcomLocale): void {
    if (locale === selectedLocale) return;
    if (!confirmDiscardAllUnsavedChanges()) return;
    clearCleanSnapshots();
    setSelectedLocale(locale);
  }

  function reloadSelectedLocale(): void {
    if (!confirmDiscardAllUnsavedChanges()) return;
    clearCleanSnapshots();
    setLocaleReloadKey((current) => current + 1);
  }

  function resetPageContentToDefaults(): void {
    if (
      hasPageUnsavedChanges &&
      !window.confirm(`Replace unsaved ${LOCALE_LABELS[selectedLocale]} page copy with checked-in defaults?`)
    ) {
      return;
    }

    setContent(HOME_CONTENT_DEFAULTS);
    setSiteContent(SITE_CONTENT_DEFAULTS);
    setAboutContent(ABOUT_CONTENT_DEFAULTS);
    setValuesContent(VALUES_CONTENT_DEFAULTS);
    setStoriesPageContent(STORIES_PAGE_CONTENT_DEFAULTS);
    setLookbookPageContent(LOOKBOOK_PAGE_CONTENT_DEFAULTS);
    setContactContent(CONTACT_CONTENT_DEFAULTS);
    setWishlistContent(WISHLIST_CONTENT_DEFAULTS);
    setCheckoutContent(CHECKOUT_CONTENT_DEFAULTS);
    setProductsContent(PRODUCTS_CONTENT_DEFAULTS);
    setAccountContent(ACCOUNT_CONTENT_DEFAULTS);
  }

  async function deleteSelectedLocaleOverride(): Promise<void> {
    if (selectedLocale === DEFAULT_LOCALE) return;
    if (!confirmDiscardAllUnsavedChanges()) return;
    if (
      !window.confirm(
        `Delete saved ${LOCALE_LABELS[selectedLocale]} page CMS override and fall back to EN? Stories and lookbook entries for this locale will stay untouched.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const results = await Promise.all(
        PAGE_CMS_ENDPOINTS.map(async (endpoint) => {
          const res = await fetch(`/api/cms/${endpoint}${localeQuery}`, { method: 'DELETE' });
          const data = await res.json() as DeleteCmsResponse;
          if (!res.ok) throw new Error(data.error ?? `Failed to delete ${endpoint} CMS override`);
          return data;
        }),
      );
      clearCleanSnapshots();
      setLocaleStatus((current) => ({
        ...current,
        [selectedLocale]: {
          updatedAt: null,
          saved: false,
        },
      }));
      setLocaleReloadKey((current) => current + 1);
      const deletedCount = results.filter((result) => result.deleted).length;
      setMessage(`Deleted ${LOCALE_LABELS[selectedLocale]} page CMS override (${deletedCount} records removed).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete locale CMS override');
    } finally {
      setSaving(false);
    }
  }

  function startNewStoryDraft(): void {
    if (!confirmDiscardStoryDraft()) return;
    setCleanStoryDraft(null, toJson(makeStoryDraft(stories.length)));
  }

  function editStoryDraft(story: Story): void {
    if (!confirmDiscardStoryDraft()) return;
    setCleanStoryDraft(story.slug, toJson(story));
  }

  function startNewLookbookDraft(): void {
    if (!confirmDiscardLookbookDraft()) return;
    setCleanLookbookDraft(null, toJson(makeLookbookDraft(lookbookEntries.length)));
  }

  function editLookbookDraft(entry: Editorial): void {
    if (!confirmDiscardLookbookDraft()) return;
    setCleanLookbookDraft(entry.id, toJson(entry));
  }

  useEffect(() => {
    if (!locales.includes(selectedLocale)) {
      clearCleanSnapshots();
      setSelectedLocale(locales[0] ?? DEFAULT_LOCALE);
    }
  }, [locales, selectedLocale]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!locales.includes(selectedLocale)) return;
    let mounted = true;
    const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
    setLoading(true);
    setMessage('');
    setError('');

    async function loadCmsContent(): Promise<void> {
      try {
        const [
          homeRes,
          siteRes,
          aboutRes,
          valuesRes,
          storiesPageRes,
          lookbookPageRes,
          contactRes,
          wishlistRes,
          checkoutRes,
          productsRes,
          accountRes,
          storiesRes,
          lookbookRes,
          catalogOptionsRes,
        ] = await Promise.all([
          fetch(`/api/cms/home${localeQuery}`),
          fetch(`/api/cms/site${localeQuery}`),
          fetch(`/api/cms/about${localeQuery}`),
          fetch(`/api/cms/values${localeQuery}`),
          fetch(`/api/cms/stories-page${localeQuery}`),
          fetch(`/api/cms/lookbook-page${localeQuery}`),
          fetch(`/api/cms/contact${localeQuery}`),
          fetch(`/api/cms/wishlist${localeQuery}`),
          fetch(`/api/cms/checkout${localeQuery}`),
          fetch(`/api/cms/products${localeQuery}`),
          fetch(`/api/cms/account${localeQuery}`),
          fetch(`/api/cms/stories${localeQuery}`),
          fetch(`/api/cms/lookbook${localeQuery}`),
          fetch(`/api/cms/catalog-options${localeQuery}`),
        ]);
        const homeData = await homeRes.json() as CmsResponse;
        const siteData = await siteRes.json() as SiteCmsResponse;
        const aboutData = await aboutRes.json() as AboutCmsResponse;
        const valuesData = await valuesRes.json() as ValuesCmsResponse;
        const storiesPageData = await storiesPageRes.json() as StoriesPageCmsResponse;
        const lookbookPageData = await lookbookPageRes.json() as LookbookPageCmsResponse;
        const contactData = await contactRes.json() as ContactCmsResponse;
        const wishlistData = await wishlistRes.json() as WishlistCmsResponse;
        const checkoutData = await checkoutRes.json() as CheckoutCmsResponse;
        const productsData = await productsRes.json() as ProductsCmsResponse;
        const accountData = await accountRes.json() as AccountCmsResponse;
        const storiesData = await storiesRes.json() as StoriesCmsResponse;
        const lookbookData = await lookbookRes.json() as LookbookCmsResponse;
        const catalogOptionsData = await catalogOptionsRes.json() as CatalogOptionsResponse;
        if (!homeRes.ok) throw new Error(homeData.error ?? 'Failed to load homepage CMS content');
        if (!siteRes.ok) throw new Error(siteData.error ?? 'Failed to load site CMS content');
        if (!aboutRes.ok) throw new Error(aboutData.error ?? 'Failed to load about CMS content');
        if (!valuesRes.ok) throw new Error(valuesData.error ?? 'Failed to load values CMS content');
        if (!storiesPageRes.ok) throw new Error(storiesPageData.error ?? 'Failed to load stories page CMS content');
        if (!lookbookPageRes.ok) throw new Error(lookbookPageData.error ?? 'Failed to load lookbook page CMS content');
        if (!contactRes.ok) throw new Error(contactData.error ?? 'Failed to load contact CMS content');
        if (!wishlistRes.ok) throw new Error(wishlistData.error ?? 'Failed to load wishlist CMS content');
        if (!checkoutRes.ok) throw new Error(checkoutData.error ?? 'Failed to load checkout CMS content');
        if (!productsRes.ok) throw new Error(productsData.error ?? 'Failed to load products CMS content');
        if (!accountRes.ok) throw new Error(accountData.error ?? 'Failed to load account CMS content');
        if (!storiesRes.ok) throw new Error(storiesData.error ?? 'Failed to load stories CMS content');
        if (!lookbookRes.ok) throw new Error(lookbookData.error ?? 'Failed to load lookbook CMS content');
        if (!catalogOptionsRes.ok) throw new Error(catalogOptionsData.error ?? 'Failed to load catalog selector options');
        if (!mounted) return;
        const nextContent = homeData.content ?? HOME_CONTENT_DEFAULTS;
        const nextSiteContent = siteData.content ?? SITE_CONTENT_DEFAULTS;
        const nextAboutContent = aboutData.content ?? ABOUT_CONTENT_DEFAULTS;
        const nextValuesContent = valuesData.content ?? VALUES_CONTENT_DEFAULTS;
        const nextStoriesPageContent = storiesPageData.content ?? STORIES_PAGE_CONTENT_DEFAULTS;
        const nextLookbookPageContent = lookbookPageData.content ?? LOOKBOOK_PAGE_CONTENT_DEFAULTS;
        const nextContactContent = contactData.content ?? CONTACT_CONTENT_DEFAULTS;
        const nextWishlistContent = wishlistData.content ?? WISHLIST_CONTENT_DEFAULTS;
        const nextCheckoutContent = checkoutData.content ?? CHECKOUT_CONTENT_DEFAULTS;
        const nextProductsContent = productsData.content ?? PRODUCTS_CONTENT_DEFAULTS;
        const nextAccountContent = accountData.content ?? ACCOUNT_CONTENT_DEFAULTS;
        const nextStories = storiesData.stories ?? [];
        const nextStoryDraft = toJson(makeStoryDraft(nextStories.length));
        const nextLookbookEntries = lookbookData.entries ?? [];
        const nextLookbookDraft = toJson(makeLookbookDraft(nextLookbookEntries.length));

        cleanSnapshotsRef.current = {
          page: buildPageEditorSnapshot({
            content: nextContent,
            siteContent: nextSiteContent,
            aboutContent: nextAboutContent,
            valuesContent: nextValuesContent,
            storiesPageContent: nextStoriesPageContent,
            lookbookPageContent: nextLookbookPageContent,
            contactContent: nextContactContent,
            wishlistContent: nextWishlistContent,
            checkoutContent: nextCheckoutContent,
            productsContent: nextProductsContent,
            accountContent: nextAccountContent,
          }),
          story: buildDraftEditorSnapshot(null, nextStoryDraft),
          lookbook: buildDraftEditorSnapshot(null, nextLookbookDraft),
        };

        setContent(nextContent);
        setUpdatedAt(homeData.updatedAt ?? null);
        setUpdatedBy(homeData.updatedBy ?? null);
        setSiteContent(nextSiteContent);
        setSiteUpdatedAt(siteData.updatedAt ?? null);
        setSiteUpdatedBy(siteData.updatedBy ?? null);
        setAboutContent(nextAboutContent);
        setAboutUpdatedAt(aboutData.updatedAt ?? null);
        setAboutUpdatedBy(aboutData.updatedBy ?? null);
        setValuesContent(nextValuesContent);
        setValuesUpdatedAt(valuesData.updatedAt ?? null);
        setValuesUpdatedBy(valuesData.updatedBy ?? null);
        setStoriesPageContent(nextStoriesPageContent);
        setStoriesPageUpdatedAt(storiesPageData.updatedAt ?? null);
        setStoriesPageUpdatedBy(storiesPageData.updatedBy ?? null);
        setLookbookPageContent(nextLookbookPageContent);
        setLookbookPageUpdatedAt(lookbookPageData.updatedAt ?? null);
        setLookbookPageUpdatedBy(lookbookPageData.updatedBy ?? null);
        setContactContent(nextContactContent);
        setContactUpdatedAt(contactData.updatedAt ?? null);
        setContactUpdatedBy(contactData.updatedBy ?? null);
        setWishlistContent(nextWishlistContent);
        setWishlistUpdatedAt(wishlistData.updatedAt ?? null);
        setWishlistUpdatedBy(wishlistData.updatedBy ?? null);
        setCheckoutContent(nextCheckoutContent);
        setCheckoutUpdatedAt(checkoutData.updatedAt ?? null);
        setCheckoutUpdatedBy(checkoutData.updatedBy ?? null);
        setProductsContent(nextProductsContent);
        setProductsUpdatedAt(productsData.updatedAt ?? null);
        setProductsUpdatedBy(productsData.updatedBy ?? null);
        setAccountContent(nextAccountContent);
        setAccountUpdatedAt(accountData.updatedAt ?? null);
        setAccountUpdatedBy(accountData.updatedBy ?? null);
        const contentUpdatedAts = [
          homeData.updatedAt,
          siteData.updatedAt,
          aboutData.updatedAt,
          valuesData.updatedAt,
          storiesPageData.updatedAt,
          lookbookPageData.updatedAt,
          contactData.updatedAt,
          wishlistData.updatedAt,
          checkoutData.updatedAt,
          productsData.updatedAt,
          accountData.updatedAt,
        ];
        setLocaleStatus((current) => ({
          ...current,
          [selectedLocale]: {
            updatedAt: latestUpdatedAt(contentUpdatedAts),
            saved: contentUpdatedAts.some(Boolean),
          },
        }));
        setStories(nextStories);
        setStoryDraft(nextStoryDraft);
        setSelectedStorySlug(null);
        setLookbookEntries(nextLookbookEntries);
        setLookbookDraft(nextLookbookDraft);
        setSelectedLookbookId(null);
        setCatalogCategoryOptions(catalogOptionsData.categories ?? []);
        setCatalogThemeOptions(catalogOptionsData.themes ?? []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load CMS content');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadCmsContent();

    return () => {
      mounted = false;
    };
  }, [locales, localeReloadKey, selectedLocale]);

  function updateHero<K extends keyof HomeHeroContent>(key: K, value: HomeHeroContent[K]): void {
    setContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateManifesto<K extends keyof HomeManifestoContent>(key: K, value: HomeManifestoContent[K]): void {
    setContent((current) => ({
      ...current,
      manifesto: {
        ...current.manifesto,
        [key]: value,
      },
    }));
  }

  function updateCategories<K extends keyof HomeCategoriesContent>(key: K, value: HomeCategoriesContent[K]): void {
    setContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        [key]: value,
      },
    }));
  }

  function updateCategoryCard<K extends keyof HomeCategoryCardContent>(
    index: number,
    key: K,
    value: HomeCategoryCardContent[K],
  ): void {
    setContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        cards: current.categories.cards.map((card, cardIndex) => (
          cardIndex === index ? { ...card, [key]: value } : card
        )),
      },
    }));
  }

  function toggleCategoryCardSelectorValue(index: number, value: string): void {
    setContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        cards: current.categories.cards.map((card, cardIndex) => {
          if (cardIndex !== index) return card;
          const exists = card.selectorValues.includes(value);
          return {
            ...card,
            selectorValues: exists
              ? card.selectorValues.filter((item) => item !== value)
              : [...card.selectorValues, value],
          };
        }),
      },
    }));
  }

  function addCategoryCard(): void {
    setContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        cards: [...current.categories.cards, makeHomeCategoryCard(current.categories.cards.length)],
      },
    }));
  }

  function removeCategoryCard(index: number): void {
    setContent((current) => ({
      ...current,
      categories: {
        ...current.categories,
        cards: current.categories.cards.filter((_, cardIndex) => cardIndex !== index),
      },
    }));
  }

  async function uploadCategoryCardImage(index: number, file: File | null): Promise<void> {
    if (file === null) return;
    setCategoryImageUploadingIndex(index);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cms/uploads/category-card', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as LogoUploadResponse;
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to upload category selector image');
      }
      updateCategoryCard(index, 'imageUrl', data.url);
      setMessage('Category selector image uploaded to FastComet. Save content to publish it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload category selector image');
    } finally {
      setCategoryImageUploadingIndex(null);
    }
  }

function updateEditorialReport<K extends keyof HomeEditorialReportContent>(
  index: number,
  key: K,
  value: HomeEditorialReportContent[K],
): void {
  setContent((current) => {
    const reports = [...current.editorial.reports];
    while (reports.length <= index) {
      reports.push(makeHomeEditorialReport(reports.length));
    }
    reports[index] = { ...reports[index], [key]: value };
    return {
      ...current,
      editorial: {
        ...current.editorial,
        reports,
      },
    };
  });
}

function addEditorialReport(): void {
  setContent((current) => ({
    ...current,
    editorial: {
      ...current.editorial,
      reports: [
        ...current.editorial.reports,
        makeHomeEditorialReport(current.editorial.reports.length),
      ],
    },
  }));
}

  async function uploadEditorialReportImage(index: number, file: File | null): Promise<void> {
    if (file === null) return;
    setEditorialReportImageUploadingIndex(index);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cms/uploads/category-card', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as LogoUploadResponse;
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to upload lore report image');
      }
      updateEditorialReport(index, 'imageUrl', data.url);
      setMessage('Lore & Drops report image uploaded to FastComet. Save content to publish it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload lore report image');
    } finally {
      setEditorialReportImageUploadingIndex(null);
    }
  }

  function updateFeatured<K extends keyof HomeFeaturedContent>(key: K, value: HomeFeaturedContent[K]): void {
    setContent((current) => ({
      ...current,
      featured: {
        ...current.featured,
        [key]: value,
      },
    }));
  }

  function updateEditorial<K extends keyof HomeEditorialContent>(key: K, value: HomeEditorialContent[K]): void {
    setContent((current) => ({
      ...current,
      editorial: {
        ...current.editorial,
        [key]: value,
      },
    }));
  }

  function updateRecentlyViewed<K extends keyof HomeRecentlyViewedContent>(
    key: K,
    value: HomeRecentlyViewedContent[K],
  ): void {
    setContent((current) => ({
      ...current,
      recentlyViewed: {
        ...current.recentlyViewed,
        [key]: value,
      },
    }));
  }

  function updateSiteNav<K extends keyof SiteNavContent>(key: K, value: SiteNavContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      nav: {
        ...current.nav,
        [key]: value,
      },
    }));
  }

  async function uploadNavLogo(file: File | null): Promise<void> {
    if (file === null) return;
    setLogoUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      const fallbackAlt = `${siteContent.nav.brandName} ${siteContent.nav.brandSuffix}`.trim();
      formData.append('file', file);
      formData.append('alt', siteContent.nav.logoAlt.trim() || fallbackAlt);
      const res = await fetch('/api/cms/uploads/logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as LogoUploadResponse;
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to upload logo');
      }

      const nextSiteContent = {
        ...siteContent,
        nav: {
          ...siteContent.nav,
          logoUrl: data.url ?? '',
          logoAlt: data.logoAlt?.trim() || siteContent.nav.logoAlt.trim() || fallbackAlt,
        },
      };
      setSiteContent(nextSiteContent);
      setSiteUpdatedAt(data.updatedAt ?? siteUpdatedAt);
      setSiteUpdatedBy(data.updatedBy ?? siteUpdatedBy);
      if (data.updatedAt) {
        setLocaleStatus((current) => {
          const next = { ...current };
          for (const locale of locales) {
            next[locale] = {
              updatedAt: data.updatedAt ?? null,
              saved: true,
            };
          }
          return next;
        });
      }
      if (!hasPageUnsavedChanges) {
        cleanSnapshotsRef.current = {
          ...cleanSnapshotsRef.current,
          page: buildPageEditorSnapshot({
            content,
            siteContent: nextSiteContent,
            aboutContent,
            valuesContent,
            storiesPageContent,
            lookbookPageContent,
            contactContent,
            wishlistContent,
            checkoutContent,
            productsContent,
            accountContent,
          }),
        };
      }
      setMessage('Logo uploaded to FastComet and published globally for all languages.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  }

  function updateAnnouncement<K extends keyof SiteAnnouncementContent>(
    key: K,
    value: SiteAnnouncementContent[K],
  ): void {
    setSiteContent((current) => ({
      ...current,
      nav: {
        ...current.nav,
        announcement: {
          ...current.nav.announcement,
          [key]: value,
        },
      },
    }));
  }

  function updateFooter<K extends keyof SiteFooterContent>(key: K, value: SiteFooterContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [key]: value,
      },
    }));
  }

  function updateNewsletter<K extends keyof SiteNewsletterContent>(
    key: K,
    value: SiteNewsletterContent[K],
  ): void {
    setSiteContent((current) => ({
      ...current,
      footer: {
        ...current.footer,
        newsletter: {
          ...current.footer.newsletter,
          [key]: value,
        },
      },
    }));
  }

  function updateSiteSearch<K extends keyof SiteSearchContent>(key: K, value: SiteSearchContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      search: {
        ...current.search,
        [key]: value,
      },
    }));
  }

  function updateCookieConsent<K extends keyof SiteCookieConsentContent>(
    key: K,
    value: SiteCookieConsentContent[K],
  ): void {
    setSiteContent((current) => ({
      ...current,
      cookieConsent: {
        ...current.cookieConsent,
        [key]: value,
      },
    }));
  }

  function updateCart<K extends keyof SiteCartContent>(key: K, value: SiteCartContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      cart: {
        ...current.cart,
        [key]: value,
      },
    }));
  }

  function updateAuth<K extends keyof SiteAuthContent>(key: K, value: SiteAuthContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      auth: {
        ...current.auth,
        [key]: value,
      },
    }));
  }

  function updateQuickView<K extends keyof SiteQuickViewContent>(key: K, value: SiteQuickViewContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      quickView: {
        ...current.quickView,
        [key]: value,
      },
    }));
  }

  function updateBackToTop<K extends keyof SiteBackToTopContent>(key: K, value: SiteBackToTopContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      backToTop: {
        ...current.backToTop,
        [key]: value,
      },
    }));
  }

  function updateNotFound<K extends keyof SiteNotFoundContent>(key: K, value: SiteNotFoundContent[K]): void {
    setSiteContent((current) => ({
      ...current,
      notFound: {
        ...current.notFound,
        [key]: value,
      },
    }));
  }

  function updateAboutHero<K extends keyof AboutHeroContent>(key: K, value: AboutHeroContent[K]): void {
    setAboutContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateAboutOrigin<K extends keyof AboutOriginContent>(key: K, value: AboutOriginContent[K]): void {
    setAboutContent((current) => ({
      ...current,
      origin: {
        ...current.origin,
        [key]: value,
      },
    }));
  }

  function updateAbout<K extends keyof AboutContent>(key: K, value: AboutContent[K]): void {
    setAboutContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateAboutClosing<K extends keyof AboutClosingContent>(key: K, value: AboutClosingContent[K]): void {
    setAboutContent((current) => ({
      ...current,
      closing: {
        ...current.closing,
        [key]: value,
      },
    }));
  }

  function updateValuesHero<K extends keyof ValuesHeroContent>(key: K, value: ValuesHeroContent[K]): void {
    setValuesContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateValues<K extends keyof ValuesContent>(key: K, value: ValuesContent[K]): void {
    setValuesContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateValuesClosing<K extends keyof ValuesClosingContent>(key: K, value: ValuesClosingContent[K]): void {
    setValuesContent((current) => ({
      ...current,
      closing: {
        ...current.closing,
        [key]: value,
      },
    }));
  }

  function updateStoriesIndex<K extends keyof StoriesIndexContent>(key: K, value: StoriesIndexContent[K]): void {
    setStoriesPageContent((current) => ({
      ...current,
      index: {
        ...current.index,
        [key]: value,
      },
    }));
  }

  function updateStoriesDetail<K extends keyof StoriesDetailContent>(key: K, value: StoriesDetailContent[K]): void {
    setStoriesPageContent((current) => ({
      ...current,
      detail: {
        ...current.detail,
        [key]: value,
      },
    }));
  }

  function updateLookbookPage<K extends keyof LookbookPageContent>(key: K, value: LookbookPageContent[K]): void {
    setLookbookPageContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLookbookMasthead<K extends keyof LookbookMastheadContent>(
    key: K,
    value: LookbookMastheadContent[K],
  ): void {
    setLookbookPageContent((current) => ({
      ...current,
      masthead: {
        ...current.masthead,
        [key]: value,
      },
    }));
  }

  function updateLookbookCta<K extends keyof LookbookCtaContent>(key: K, value: LookbookCtaContent[K]): void {
    setLookbookPageContent((current) => ({
      ...current,
      cta: {
        ...current.cta,
        [key]: value,
      },
    }));
  }

  function updateLookbookArchive<K extends keyof LookbookArchiveContent>(
    key: K,
    value: LookbookArchiveContent[K],
  ): void {
    setLookbookPageContent((current) => ({
      ...current,
      archive: {
        ...current.archive,
        [key]: value,
      },
    }));
  }

  function updateContactHero<K extends keyof ContactHeroContent>(key: K, value: ContactHeroContent[K]): void {
    setContactContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateContactInfo<K extends keyof ContactInfoContent>(key: K, value: ContactInfoContent[K]): void {
    setContactContent((current) => ({
      ...current,
      info: {
        ...current.info,
        [key]: value,
      },
    }));
  }

  function updateContactForm<K extends keyof ContactFormContent>(key: K, value: ContactFormContent[K]): void {
    setContactContent((current) => ({
      ...current,
      form: {
        ...current.form,
        [key]: value,
      },
    }));
  }

  function updateContactSuccess<K extends keyof ContactSuccessContent>(
    key: K,
    value: ContactSuccessContent[K],
  ): void {
    setContactContent((current) => ({
      ...current,
      success: {
        ...current.success,
        [key]: value,
      },
    }));
  }

  function updateWishlist<K extends keyof WishlistContent>(key: K, value: WishlistContent[K]): void {
    setWishlistContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCheckout<K extends keyof CheckoutContent>(key: K, value: CheckoutContent[K]): void {
    setCheckoutContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCheckoutSummary<K extends keyof CheckoutSummaryContent>(
    key: K,
    value: CheckoutSummaryContent[K],
  ): void {
    setCheckoutContent((current) => ({
      ...current,
      orderSummary: {
        ...current.orderSummary,
        [key]: value,
      },
    }));
  }

  function updateCheckoutShippingMethod(
    index: number,
    key: keyof CheckoutShippingMethodContent,
    value: string | number | boolean,
  ): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingMethods: current.shippingMethods.map((method, methodIndex) => (
        methodIndex === index ? { ...method, [key]: value } : method
      )),
    }));
  }

  function addCheckoutShippingMethod(): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingMethods: [
        ...current.shippingMethods,
        makeCheckoutShippingMethod(current.shippingMethods.length),
      ],
    }));
  }

  function removeCheckoutShippingMethod(index: number): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingMethods: current.shippingMethods.filter((_, methodIndex) => methodIndex !== index),
    }));
  }

  function updateShippingZone<K extends keyof ShippingZone>(
    index: number,
    key: K,
    value: ShippingZone[K],
  ): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: current.shippingZones.map((zone, zoneIndex) => (
        zoneIndex === index ? { ...zone, [key]: value } : zone
      )),
    }));
  }

  function updateShippingZoneCountries(index: number, value: string): void {
    updateShippingZone(
      index,
      'countries',
      value.split(',').map((country) => country.trim()).filter(Boolean),
    );
  }

  function addShippingZone(): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: insertShippingZoneBeforeCatchAll(
        current.shippingZones,
        makeShippingZone(current.shippingZones.length),
      ),
    }));
  }

  function removeShippingZone(index: number): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: current.shippingZones.filter((_, zoneIndex) => zoneIndex !== index),
    }));
  }

  function updateShippingZoneMethod(
    zoneIndex: number,
    methodIndex: number,
    key: keyof CheckoutShippingMethodContent,
    value: string | number | boolean,
  ): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: current.shippingZones.map((zone, currentZoneIndex) => (
        currentZoneIndex === zoneIndex
          ? {
              ...zone,
              methods: zone.methods.map((method, currentMethodIndex) => (
                currentMethodIndex === methodIndex ? { ...method, [key]: value } : method
              )),
            }
          : zone
      )),
    }));
  }

  function addShippingZoneMethod(zoneIndex: number): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: current.shippingZones.map((zone, currentZoneIndex) => (
        currentZoneIndex === zoneIndex
          ? { ...zone, methods: [...zone.methods, makeCheckoutShippingMethod(zone.methods.length)] }
          : zone
      )),
    }));
  }

  function removeShippingZoneMethod(zoneIndex: number, methodIndex: number): void {
    setCheckoutContent((current) => ({
      ...current,
      shippingZones: current.shippingZones.map((zone, currentZoneIndex) => (
        currentZoneIndex === zoneIndex
          ? { ...zone, methods: zone.methods.filter((_, currentMethodIndex) => currentMethodIndex !== methodIndex) }
          : zone
      )),
    }));
  }

  function updateProductsCollection<K extends keyof ProductsCollectionContent>(
    key: K,
    value: ProductsCollectionContent[K],
  ): void {
    setProductsContent((current) => ({
      ...current,
      collection: {
        ...current.collection,
        [key]: value,
      },
    }));
  }

  function updateProductsDetail<K extends keyof ProductsDetailContent>(
    key: K,
    value: ProductsDetailContent[K],
  ): void {
    setProductsContent((current) => ({
      ...current,
      detail: {
        ...current.detail,
        [key]: value,
      },
    }));
  }

  function updateAccount<K extends keyof AccountContent>(key: K, value: AccountContent[K]): void {
    setAccountContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateAccountSignedOut<K extends keyof AccountSignedOutContent>(
    key: K,
    value: AccountSignedOutContent[K],
  ): void {
    setAccountContent((current) => ({
      ...current,
      signedOut: {
        ...current.signedOut,
        [key]: value,
      },
    }));
  }

  function updateAccountHeader<K extends keyof AccountHeaderContent>(key: K, value: AccountHeaderContent[K]): void {
    setAccountContent((current) => ({
      ...current,
      header: {
        ...current.header,
        [key]: value,
      },
    }));
  }

  function updateAccountSidebar<K extends keyof AccountSidebarContent>(
    key: K,
    value: AccountSidebarContent[K],
  ): void {
    setAccountContent((current) => ({
      ...current,
      sidebar: {
        ...current.sidebar,
        [key]: value,
      },
    }));
  }

  function updateAccountOverview<K extends keyof AccountOverviewContent>(
    key: K,
    value: AccountOverviewContent[K],
  ): void {
    setAccountContent((current) => ({
      ...current,
      overview: {
        ...current.overview,
        [key]: value,
      },
    }));
  }

  function updateAccountOrders<K extends keyof AccountOrdersContent>(key: K, value: AccountOrdersContent[K]): void {
    setAccountContent((current) => ({
      ...current,
      orders: {
        ...current.orders,
        [key]: value,
      },
    }));
  }

  function updateAccountSettings<K extends keyof AccountSettingsContent>(
    key: K,
    value: AccountSettingsContent[K],
  ): void {
    setAccountContent((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value,
      },
    }));
  }

  function updateAccountAdmin<K extends keyof AccountAdminContent>(key: K, value: AccountAdminContent[K]): void {
    setAccountContent((current) => ({
      ...current,
      admin: {
        ...current.admin,
        [key]: value,
      },
    }));
  }

  async function refreshStories(): Promise<Story[]> {
    const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
    const res = await fetch(`/api/cms/stories${localeQuery}`);
    const data = await res.json() as StoriesCmsResponse;
    if (!res.ok) throw new Error(data.error ?? 'Failed to reload stories');
    const nextStories = data.stories ?? [];
    setStories(nextStories);
    return nextStories;
  }

  async function refreshLookbook(): Promise<Editorial[]> {
    const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
    const res = await fetch(`/api/cms/lookbook${localeQuery}`);
    const data = await res.json() as LookbookCmsResponse;
    if (!res.ok) throw new Error(data.error ?? 'Failed to reload lookbook entries');
    const nextEntries = data.entries ?? [];
    setLookbookEntries(nextEntries);
    return nextEntries;
  }

  async function saveStoryDraft(): Promise<void> {
    setStorySaving(true);
    setMessage('');
    setError('');

    try {
      const story = JSON.parse(storyDraft) as Story;
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const endpoint = selectedStorySlug
        ? `/api/cms/stories/${encodeURIComponent(selectedStorySlug)}${localeQuery}`
        : `/api/cms/stories${localeQuery}`;
      const res = await fetch(endpoint, {
        method: selectedStorySlug ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      });
      const data = await res.json() as StoriesCmsResponse;
      if (!res.ok) {
        const details = data.errors?.length ? ` ${data.errors.join(' ')}` : '';
        throw new Error(`${data.error ?? 'Failed to save story'}${details}`);
      }
      const nextStories = await refreshStories();
      const nextSelectedStorySlug = data.story?.slug ?? story.slug;
      const nextStoryDraft = toJson(data.story ?? story);
      setCleanStoryDraft(nextSelectedStorySlug, nextStoryDraft);
      setMessage(`Story saved. ${nextStories.length} stories loaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story');
    } finally {
      setStorySaving(false);
    }
  }

  async function deleteStoryDraft(slug: string): Promise<void> {
    if (!window.confirm(`Delete story "${slug}"?`)) return;
    setStorySaving(true);
    setMessage('');
    setError('');

    try {
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const res = await fetch(`/api/cms/stories/${encodeURIComponent(slug)}${localeQuery}`, { method: 'DELETE' });
      const data = await res.json() as StoriesCmsResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete story');
      const nextStories = await refreshStories();
      setCleanStoryDraft(null, toJson(makeStoryDraft(nextStories.length)));
      setMessage('Story deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete story');
    } finally {
      setStorySaving(false);
    }
  }

  async function saveLookbookDraft(): Promise<void> {
    setLookbookSaving(true);
    setMessage('');
    setError('');

    try {
      const entry = JSON.parse(lookbookDraft) as Editorial;
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const endpoint = selectedLookbookId
        ? `/api/cms/lookbook/${encodeURIComponent(selectedLookbookId)}${localeQuery}`
        : `/api/cms/lookbook${localeQuery}`;
      const res = await fetch(endpoint, {
        method: selectedLookbookId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      });
      const data = await res.json() as LookbookCmsResponse;
      if (!res.ok) {
        const details = data.errors?.length ? ` ${data.errors.join(' ')}` : '';
        throw new Error(`${data.error ?? 'Failed to save lookbook entry'}${details}`);
      }
      const nextEntries = await refreshLookbook();
      const nextSelectedLookbookId = data.entry?.id ?? entry.id;
      const nextLookbookDraft = toJson(data.entry ?? entry);
      setCleanLookbookDraft(nextSelectedLookbookId, nextLookbookDraft);
      setMessage(`Lookbook entry saved. ${nextEntries.length} entries loaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lookbook entry');
    } finally {
      setLookbookSaving(false);
    }
  }

  async function deleteLookbookDraft(id: string): Promise<void> {
    if (!window.confirm(`Delete lookbook entry "${id}"?`)) return;
    setLookbookSaving(true);
    setMessage('');
    setError('');

    try {
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const res = await fetch(`/api/cms/lookbook/${encodeURIComponent(id)}${localeQuery}`, { method: 'DELETE' });
      const data = await res.json() as LookbookCmsResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete lookbook entry');
      const nextEntries = await refreshLookbook();
      setCleanLookbookDraft(null, toJson(makeLookbookDraft(nextEntries.length)));
      setMessage('Lookbook entry deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lookbook entry');
    } finally {
      setLookbookSaving(false);
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const localeQuery = `?locale=${encodeURIComponent(selectedLocale)}`;
      const res = await fetch(`/api/cms/home${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json() as CmsResponse;
      if (!res.ok) {
        const details = data.errors?.length ? ` ${data.errors.join(' ')}` : '';
        throw new Error(`${data.error ?? 'Failed to save CMS content'}${details}`);
      }
      const siteRes = await fetch(`/api/cms/site${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: siteContent }),
      });
      const siteData = await siteRes.json() as SiteCmsResponse;
      if (!siteRes.ok) {
        const details = siteData.errors?.length ? ` ${siteData.errors.join(' ')}` : '';
        throw new Error(`${siteData.error ?? 'Failed to save site CMS content'}${details}`);
      }
      const aboutRes = await fetch(`/api/cms/about${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: aboutContent }),
      });
      const aboutData = await aboutRes.json() as AboutCmsResponse;
      if (!aboutRes.ok) {
        const details = aboutData.errors?.length ? ` ${aboutData.errors.join(' ')}` : '';
        throw new Error(`${aboutData.error ?? 'Failed to save about CMS content'}${details}`);
      }
      const valuesRes = await fetch(`/api/cms/values${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: valuesContent }),
      });
      const valuesData = await valuesRes.json() as ValuesCmsResponse;
      if (!valuesRes.ok) {
        const details = valuesData.errors?.length ? ` ${valuesData.errors.join(' ')}` : '';
        throw new Error(`${valuesData.error ?? 'Failed to save values CMS content'}${details}`);
      }
      const storiesPageRes = await fetch(`/api/cms/stories-page${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: storiesPageContent }),
      });
      const storiesPageData = await storiesPageRes.json() as StoriesPageCmsResponse;
      if (!storiesPageRes.ok) {
        const details = storiesPageData.errors?.length ? ` ${storiesPageData.errors.join(' ')}` : '';
        throw new Error(`${storiesPageData.error ?? 'Failed to save stories page CMS content'}${details}`);
      }
      const lookbookPageRes = await fetch(`/api/cms/lookbook-page${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lookbookPageContent }),
      });
      const lookbookPageData = await lookbookPageRes.json() as LookbookPageCmsResponse;
      if (!lookbookPageRes.ok) {
        const details = lookbookPageData.errors?.length ? ` ${lookbookPageData.errors.join(' ')}` : '';
        throw new Error(`${lookbookPageData.error ?? 'Failed to save lookbook page CMS content'}${details}`);
      }
      const contactRes = await fetch(`/api/cms/contact${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contactContent }),
      });
      const contactData = await contactRes.json() as ContactCmsResponse;
      if (!contactRes.ok) {
        const details = contactData.errors?.length ? ` ${contactData.errors.join(' ')}` : '';
        throw new Error(`${contactData.error ?? 'Failed to save contact CMS content'}${details}`);
      }
      const wishlistRes = await fetch(`/api/cms/wishlist${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: wishlistContent }),
      });
      const wishlistData = await wishlistRes.json() as WishlistCmsResponse;
      if (!wishlistRes.ok) {
        const details = wishlistData.errors?.length ? ` ${wishlistData.errors.join(' ')}` : '';
        throw new Error(`${wishlistData.error ?? 'Failed to save wishlist CMS content'}${details}`);
      }
      const checkoutRes = await fetch(`/api/cms/checkout${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: checkoutContent }),
      });
      const checkoutData = await checkoutRes.json() as CheckoutCmsResponse;
      if (!checkoutRes.ok) {
        const details = checkoutData.errors?.length ? ` ${checkoutData.errors.join(' ')}` : '';
        throw new Error(`${checkoutData.error ?? 'Failed to save checkout CMS content'}${details}`);
      }
      const productsRes = await fetch(`/api/cms/products${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: productsContent }),
      });
      const productsData = await productsRes.json() as ProductsCmsResponse;
      if (!productsRes.ok) {
        const details = productsData.errors?.length ? ` ${productsData.errors.join(' ')}` : '';
        throw new Error(`${productsData.error ?? 'Failed to save products CMS content'}${details}`);
      }
      const accountRes = await fetch(`/api/cms/account${localeQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: accountContent }),
      });
      const accountData = await accountRes.json() as AccountCmsResponse;
      if (!accountRes.ok) {
        const details = accountData.errors?.length ? ` ${accountData.errors.join(' ')}` : '';
        throw new Error(`${accountData.error ?? 'Failed to save account CMS content'}${details}`);
      }
      setContent(data.content ?? content);
      setUpdatedAt(data.updatedAt ?? null);
      setUpdatedBy(data.updatedBy ?? null);
      setSiteContent(siteData.content ?? siteContent);
      setSiteUpdatedAt(siteData.updatedAt ?? null);
      setSiteUpdatedBy(siteData.updatedBy ?? null);
      setAboutContent(aboutData.content ?? aboutContent);
      setAboutUpdatedAt(aboutData.updatedAt ?? null);
      setAboutUpdatedBy(aboutData.updatedBy ?? null);
      setValuesContent(valuesData.content ?? valuesContent);
      setValuesUpdatedAt(valuesData.updatedAt ?? null);
      setValuesUpdatedBy(valuesData.updatedBy ?? null);
      setStoriesPageContent(storiesPageData.content ?? storiesPageContent);
      setStoriesPageUpdatedAt(storiesPageData.updatedAt ?? null);
      setStoriesPageUpdatedBy(storiesPageData.updatedBy ?? null);
      setLookbookPageContent(lookbookPageData.content ?? lookbookPageContent);
      setLookbookPageUpdatedAt(lookbookPageData.updatedAt ?? null);
      setLookbookPageUpdatedBy(lookbookPageData.updatedBy ?? null);
      setContactContent(contactData.content ?? contactContent);
      setContactUpdatedAt(contactData.updatedAt ?? null);
      setContactUpdatedBy(contactData.updatedBy ?? null);
      setWishlistContent(wishlistData.content ?? wishlistContent);
      setWishlistUpdatedAt(wishlistData.updatedAt ?? null);
      setWishlistUpdatedBy(wishlistData.updatedBy ?? null);
      setCheckoutContent(checkoutData.content ?? checkoutContent);
      setCheckoutUpdatedAt(checkoutData.updatedAt ?? null);
      setCheckoutUpdatedBy(checkoutData.updatedBy ?? null);
      setProductsContent(productsData.content ?? productsContent);
      setProductsUpdatedAt(productsData.updatedAt ?? null);
      setProductsUpdatedBy(productsData.updatedBy ?? null);
      setAccountContent(accountData.content ?? accountContent);
      setAccountUpdatedAt(accountData.updatedAt ?? null);
      setAccountUpdatedBy(accountData.updatedBy ?? null);
      const contentUpdatedAts = [
        data.updatedAt,
        siteData.updatedAt,
        aboutData.updatedAt,
        valuesData.updatedAt,
        storiesPageData.updatedAt,
        lookbookPageData.updatedAt,
        contactData.updatedAt,
        wishlistData.updatedAt,
        checkoutData.updatedAt,
        productsData.updatedAt,
        accountData.updatedAt,
      ];
      setLocaleStatus((current) => ({
        ...current,
        [selectedLocale]: {
          updatedAt: latestUpdatedAt(contentUpdatedAts),
          saved: contentUpdatedAts.some(Boolean),
        },
      }));
      cleanSnapshotsRef.current = {
        ...cleanSnapshotsRef.current,
        page: buildPageEditorSnapshot({
          content: data.content ?? content,
          siteContent: siteData.content ?? siteContent,
          aboutContent: aboutData.content ?? aboutContent,
          valuesContent: valuesData.content ?? valuesContent,
          storiesPageContent: storiesPageData.content ?? storiesPageContent,
          lookbookPageContent: lookbookPageData.content ?? lookbookPageContent,
          contactContent: contactData.content ?? contactContent,
          wishlistContent: wishlistData.content ?? wishlistContent,
          checkoutContent: checkoutData.content ?? checkoutContent,
          productsContent: productsData.content ?? productsContent,
          accountContent: accountData.content ?? accountContent,
        }),
      };
      setMessage(`CMS content saved for ${LOCALE_LABELS[selectedLocale]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CMS content');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ borderTop: '1px solid rgba(210,116,102,0.2)', paddingTop: '1.5rem', marginBottom: '2.5rem' }}>
      <AdminCmsHeader
        locales={locales}
        selectedLocale={selectedLocale}
        localeStatus={localeStatus}
        disabled={headerDisabled}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        unsavedChangeLabels={unsavedChangeLabels}
        saveMeta={saveMeta}
        onLocaleSelect={handleLocaleSelect}
        onCopyFromDefault={reloadSelectedLocale}
        onDeleteLocaleOverride={() => void deleteSelectedLocaleOverride()}
        onResetDefaults={resetPageContentToDefaults}
        onSave={() => void save()}
      />

      {loading && (
        <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>Loading CMS content…</div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Global Navigation
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Header brand name' value={siteContent.nav.brandName} onChange={(value) => updateSiteNav('brandName', value)} />
                <Field label='Header brand suffix' value={siteContent.nav.brandSuffix} onChange={(value) => updateSiteNav('brandSuffix', value)} />
                <Field label='Mobile account label' value={siteContent.nav.mobileAccountLabel} onChange={(value) => updateSiteNav('mobileAccountLabel', value)} />
                <Field label='Mobile wishlist label' value={siteContent.nav.mobileWishlistLabel} onChange={(value) => updateSiteNav('mobileWishlistLabel', value)} />
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '1rem', display: 'grid', gap: '0.9rem' }}>
                <div className='type-label' style={{ color: 'var(--muted)' }}>
                  Header logo is shared across all languages. Uploads publish immediately; manual URL edits publish on Save.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Field label='Header logo URL' value={siteContent.nav.logoUrl} onChange={(value) => updateSiteNav('logoUrl', value)} />
                  <Field label='Header logo alt text' value={siteContent.nav.logoAlt} onChange={(value) => updateSiteNav('logoAlt', value)} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <label>
                    <span className='type-label' style={labelStyle}>Upload logo</span>
                    <input
                      type='file'
                      accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
                      disabled={loading || saving || logoUploading}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        void uploadNavLogo(file);
                        event.currentTarget.value = '';
                      }}
                      style={{ ...fieldStyle, padding: '0.72rem 0.8rem' }}
                    />
                  </label>
                  {siteContent.nav.logoUrl.trim() && (
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <img
                        src={siteContent.nav.logoUrl}
                        alt={siteContent.nav.logoAlt || 'Header logo preview'}
                        style={{
                          height: '42px',
                          maxWidth: '180px',
                          objectFit: 'contain',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          padding: '0.35rem',
                        }}
                      />
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => updateSiteNav('logoUrl', '')}
                        disabled={loading || saving || logoUploading}
                        style={{ fontSize: '0.66rem', padding: '0.5rem 0.7rem' }}
                      >
                        Clear logo
                      </button>
                    </div>
                  )}
                  {logoUploading && (
                    <span className='type-label' style={{ color: 'var(--accent)' }}>Uploading…</span>
                  )}
                </div>
              </div>
              <TextArea label='Navigation links' rows={6} value={linksToText(siteContent.nav.links)} onChange={(value) => updateSiteNav('links', textToLinks(value))} />
              <label className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  checked={siteContent.nav.announcement.enabled}
                  onChange={(event) => updateAnnouncement('enabled', event.target.checked)}
                  className='w-4 h-4 accent-[var(--fg)]'
                />
                <span className='type-label' style={{ color: 'var(--muted)' }}>Announcement enabled</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Announcement message' value={siteContent.nav.announcement.message} onChange={(value) => updateAnnouncement('message', value)} />
                <Field label='Announcement CTA label' value={siteContent.nav.announcement.ctaLabel} onChange={(value) => updateAnnouncement('ctaLabel', value)} />
                <Field label='Announcement CTA href' value={siteContent.nav.announcement.ctaHref} onChange={(value) => updateAnnouncement('ctaHref', value)} />
                <Field label='Announcement dismiss key' value={siteContent.nav.announcement.dismissKey} onChange={(value) => updateAnnouncement('dismissKey', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Global Footer
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Newsletter eyebrow' value={siteContent.footer.newsletter.eyebrow} onChange={(value) => updateNewsletter('eyebrow', value)} />
                <Field label='Newsletter title' value={siteContent.footer.newsletter.title} onChange={(value) => updateNewsletter('title', value)} />
                <Field label='Email placeholder' value={siteContent.footer.newsletter.emailPlaceholder} onChange={(value) => updateNewsletter('emailPlaceholder', value)} />
                <Field label='Email aria label' value={siteContent.footer.newsletter.emailAriaLabel} onChange={(value) => updateNewsletter('emailAriaLabel', value)} />
                <Field label='Submit label' value={siteContent.footer.newsletter.submitLabel} onChange={(value) => updateNewsletter('submitLabel', value)} />
              </div>
              <TextArea label='Newsletter body' value={siteContent.footer.newsletter.body} onChange={(value) => updateNewsletter('body', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Footer brand name' value={siteContent.footer.brandName} onChange={(value) => updateFooter('brandName', value)} />
                <Field label='Footer brand suffix' value={siteContent.footer.brandSuffix} onChange={(value) => updateFooter('brandSuffix', value)} />
                <Field label='Copyright' value={siteContent.footer.copyright} onChange={(value) => updateFooter('copyright', value)} />
              </div>
              <TextArea label='Footer brand description' value={siteContent.footer.brandDescription} onChange={(value) => updateFooter('brandDescription', value)} />
              <TextArea label='Social links' rows={4} value={socialsToText(siteContent.footer.socials)} onChange={(value) => updateFooter('socials', textToSocials(value))} />
              <TextArea label='Footer columns' rows={9} value={footerColumnsToText(siteContent.footer.columns)} onChange={(value) => updateFooter('columns', textToFooterColumns(value))} />
              <TextArea label='Legal links' rows={4} value={linksToText(siteContent.footer.legalLinks)} onChange={(value) => updateFooter('legalLinks', textToLinks(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Search dialog aria label' value={siteContent.search.dialogAriaLabel} onChange={(value) => updateSiteSearch('dialogAriaLabel', value)} />
                <Field label='Search input aria label' value={siteContent.search.inputAriaLabel} onChange={(value) => updateSiteSearch('inputAriaLabel', value)} />
                <Field label='Search placeholder' value={siteContent.search.placeholder} onChange={(value) => updateSiteSearch('placeholder', value)} />
                <Field label='Search close label' value={siteContent.search.closeLabel} onChange={(value) => updateSiteSearch('closeLabel', value)} />
                <Field label='Search close aria label' value={siteContent.search.closeAriaLabel} onChange={(value) => updateSiteSearch('closeAriaLabel', value)} />
                <Field label='Search shortcut label' value={siteContent.search.shortcutLabel} onChange={(value) => updateSiteSearch('shortcutLabel', value)} />
                <Field label='Trending label' value={siteContent.search.trendingLabel} onChange={(value) => updateSiteSearch('trendingLabel', value)} />
                <Field label='Browse collections label' value={siteContent.search.browseCollectionsLabel} onChange={(value) => updateSiteSearch('browseCollectionsLabel', value)} />
                <Field label='No results prefix' value={siteContent.search.noResultsPrefix} onChange={(value) => updateSiteSearch('noResultsPrefix', value)} />
                <Field label='Search added toast title' value={siteContent.search.addedToastTitle} onChange={(value) => updateSiteSearch('addedToastTitle', value)} />
                <Field label='Search loading label' value={siteContent.search.loadingResultsLabel} onChange={(value) => updateSiteSearch('loadingResultsLabel', value)} />
                <Field label='Search live label' value={siteContent.search.liveLabel} onChange={(value) => updateSiteSearch('liveLabel', value)} />
                <Field label='Result singular' value={siteContent.search.resultSingular} onChange={(value) => updateSiteSearch('resultSingular', value)} />
                <Field label='Result plural' value={siteContent.search.resultPlural} onChange={(value) => updateSiteSearch('resultPlural', value)} />
                <Field label='Results for label' value={siteContent.search.resultsForLabel} onChange={(value) => updateSiteSearch('resultsForLabel', value)} />
                <Field label='Quick add label' value={siteContent.search.quickAddLabel} onChange={(value) => updateSiteSearch('quickAddLabel', value)} />
                <Field label='View all prefix' value={siteContent.search.viewAllPrefix} onChange={(value) => updateSiteSearch('viewAllPrefix', value)} />
              </div>
              <TextArea label='No results help' value={siteContent.search.noResultsHelp} onChange={(value) => updateSiteSearch('noResultsHelp', value)} />
              <TextArea label='Trending searches' rows={4} value={siteContent.search.trendingSearches.join('\n')} onChange={(value) => updateSiteSearch('trendingSearches', splitLines(value))} />
              <TextArea label='Search collection cards' rows={5} value={collectionCardsToText(siteContent.search.collectionCards)} onChange={(value) => updateSiteSearch('collectionCards', textToCollectionCards(value))} />
              <div style={{ borderTop: '1px solid rgba(210,116,102,0.14)', paddingTop: '1rem', display: 'grid', gap: '1rem' }}>
                <h4 className='type-label' style={{ color: 'var(--muted)' }}>
                  Cookie consent
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Field label='Storage key' value={siteContent.cookieConsent.storageKey} onChange={(value) => updateCookieConsent('storageKey', value)} />
                  <Field label='Policy label' value={siteContent.cookieConsent.policyLabel} onChange={(value) => updateCookieConsent('policyLabel', value)} />
                  <Field label='Policy href' value={siteContent.cookieConsent.policyHref} onChange={(value) => updateCookieConsent('policyHref', value)} />
                  <Field label='Essential button label' value={siteContent.cookieConsent.essentialLabel} onChange={(value) => updateCookieConsent('essentialLabel', value)} />
                  <Field label='Accept button label' value={siteContent.cookieConsent.acceptLabel} onChange={(value) => updateCookieConsent('acceptLabel', value)} />
                </div>
                <TextArea label='Cookie message' value={siteContent.cookieConsent.message} onChange={(value) => updateCookieConsent('message', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Global Cart Drawer
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Dialog aria label' value={siteContent.cart.ariaLabel} onChange={(value) => updateCart('ariaLabel', value)} />
                <Field label='Title' value={siteContent.cart.title} onChange={(value) => updateCart('title', value)} />
                <Field label='Item singular' value={siteContent.cart.itemSingular} onChange={(value) => updateCart('itemSingular', value)} />
                <Field label='Item plural' value={siteContent.cart.itemPlural} onChange={(value) => updateCart('itemPlural', value)} />
                <Field label='Close label' value={siteContent.cart.closeLabel} onChange={(value) => updateCart('closeLabel', value)} />
                <Field label='Empty message' value={siteContent.cart.emptyMessage} onChange={(value) => updateCart('emptyMessage', value)} />
                <Field label='Continue shopping label' value={siteContent.cart.continueShoppingLabel} onChange={(value) => updateCart('continueShoppingLabel', value)} />
                <Field label='Remove item aria prefix' value={siteContent.cart.removeItemAriaPrefix} onChange={(value) => updateCart('removeItemAriaPrefix', value)} />
                <Field label='Decrease quantity label' value={siteContent.cart.decreaseQuantityLabel} onChange={(value) => updateCart('decreaseQuantityLabel', value)} />
                <Field label='Increase quantity label' value={siteContent.cart.increaseQuantityLabel} onChange={(value) => updateCart('increaseQuantityLabel', value)} />
                <Field label='Subtotal label' value={siteContent.cart.subtotalLabel} onChange={(value) => updateCart('subtotalLabel', value)} />
                <Field label='Shipping label' value={siteContent.cart.shippingLabel} onChange={(value) => updateCart('shippingLabel', value)} />
                <Field label='Shipping note' value={siteContent.cart.shippingNote} onChange={(value) => updateCart('shippingNote', value)} />
                <Field label='Total label' value={siteContent.cart.totalLabel} onChange={(value) => updateCart('totalLabel', value)} />
                <Field label='Checkout label' value={siteContent.cart.checkoutLabel} onChange={(value) => updateCart('checkoutLabel', value)} />
              </div>
              <TextArea label='Footer note' value={siteContent.cart.footerNote} onChange={(value) => updateCart('footerNote', value)} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Global Auth Modal
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Close label' value={siteContent.auth.closeLabel} onChange={(value) => updateAuth('closeLabel', value)} />
                <Field label='Sign in tab label' value={siteContent.auth.signInTabLabel} onChange={(value) => updateAuth('signInTabLabel', value)} />
                <Field label='Register tab label' value={siteContent.auth.registerTabLabel} onChange={(value) => updateAuth('registerTabLabel', value)} />
                <Field label='Email label' value={siteContent.auth.emailLabel} onChange={(value) => updateAuth('emailLabel', value)} />
                <Field label='Password label' value={siteContent.auth.passwordLabel} onChange={(value) => updateAuth('passwordLabel', value)} />
                <Field label='Show password label' value={siteContent.auth.showPasswordLabel} onChange={(value) => updateAuth('showPasswordLabel', value)} />
                <Field label='Hide password label' value={siteContent.auth.hidePasswordLabel} onChange={(value) => updateAuth('hidePasswordLabel', value)} />
                <Field label='Sign in submit label' value={siteContent.auth.signInSubmitLabel} onChange={(value) => updateAuth('signInSubmitLabel', value)} />
                <Field label='Full name label' value={siteContent.auth.fullNameLabel} onChange={(value) => updateAuth('fullNameLabel', value)} />
                <Field label='Confirm password label' value={siteContent.auth.confirmPasswordLabel} onChange={(value) => updateAuth('confirmPasswordLabel', value)} />
                <Field label='Register submit label' value={siteContent.auth.registerSubmitLabel} onChange={(value) => updateAuth('registerSubmitLabel', value)} />
                <Field label='Loading label' value={siteContent.auth.loadingLabel} onChange={(value) => updateAuth('loadingLabel', value)} />
                <Field label='Login fallback error' value={siteContent.auth.loginFailedError} onChange={(value) => updateAuth('loginFailedError', value)} />
                <Field label='Password mismatch error' value={siteContent.auth.passwordMismatchError} onChange={(value) => updateAuth('passwordMismatchError', value)} />
                <Field label='Registration fallback error' value={siteContent.auth.registrationFailedError} onChange={(value) => updateAuth('registrationFailedError', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Global Quick View
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Added toast title' value={siteContent.quickView.addedToastTitle} onChange={(value) => updateQuickView('addedToastTitle', value)} />
                <Field label='Brand label' value={siteContent.quickView.brandLabel} onChange={(value) => updateQuickView('brandLabel', value)} />
                <Field label='Close label' value={siteContent.quickView.closeLabel} onChange={(value) => updateQuickView('closeLabel', value)} />
                <Field label='Select size label' value={siteContent.quickView.selectSizeLabel} onChange={(value) => updateQuickView('selectSizeLabel', value)} />
                <Field label='Added button label' value={siteContent.quickView.addedButtonLabel} onChange={(value) => updateQuickView('addedButtonLabel', value)} />
                <Field label='Add to bag label' value={siteContent.quickView.addToBagLabel} onChange={(value) => updateQuickView('addToBagLabel', value)} />
                <Field label='Wishlist removed toast' value={siteContent.quickView.removedWishlistToastTitle} onChange={(value) => updateQuickView('removedWishlistToastTitle', value)} />
                <Field label='Wishlist saved toast' value={siteContent.quickView.savedWishlistToastTitle} onChange={(value) => updateQuickView('savedWishlistToastTitle', value)} />
                <Field label='Wishlist saved button' value={siteContent.quickView.savedWishlistButtonLabel} onChange={(value) => updateQuickView('savedWishlistButtonLabel', value)} />
                <Field label='Wishlist save button' value={siteContent.quickView.saveWishlistButtonLabel} onChange={(value) => updateQuickView('saveWishlistButtonLabel', value)} />
                <Field label='Full details label' value={siteContent.quickView.fullDetailsLabel} onChange={(value) => updateQuickView('fullDetailsLabel', value)} />
                <Field label='Back to top aria label' value={siteContent.backToTop.ariaLabel} onChange={(value) => updateBackToTop('ariaLabel', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Not Found Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Background code' value={siteContent.notFound.code} onChange={(value) => updateNotFound('code', value)} />
                <Field label='Eyebrow' value={siteContent.notFound.eyebrow} onChange={(value) => updateNotFound('eyebrow', value)} />
                <Field label='Primary button label' value={siteContent.notFound.primaryLabel} onChange={(value) => updateNotFound('primaryLabel', value)} />
                <Field label='Primary button href' value={siteContent.notFound.primaryHref} onChange={(value) => updateNotFound('primaryHref', value)} />
                <Field label='Secondary button label' value={siteContent.notFound.secondaryLabel} onChange={(value) => updateNotFound('secondaryLabel', value)} />
                <Field label='Secondary button href' value={siteContent.notFound.secondaryHref} onChange={(value) => updateNotFound('secondaryHref', value)} />
              </div>
              <TextArea label='Title lines' rows={3} value={siteContent.notFound.titleLines.join('\n')} onChange={(value) => updateNotFound('titleLines', splitLines(value))} />
              <TextArea label='Body' value={siteContent.notFound.body} onChange={(value) => updateNotFound('body', value)} />
              <TextArea label='Collection links' rows={4} value={linksToText(siteContent.notFound.collectionLinks)} onChange={(value) => updateNotFound('collectionLinks', textToLinks(value))} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              About Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Hero watermark' value={aboutContent.hero.watermark} onChange={(value) => updateAboutHero('watermark', value)} />
                <Field label='Hero eyebrow' value={aboutContent.hero.eyebrow} onChange={(value) => updateAboutHero('eyebrow', value)} />
                <Field label='Hero title' value={aboutContent.hero.title} onChange={(value) => updateAboutHero('title', value)} />
              </div>
              <TextArea label='Hero body' value={aboutContent.hero.body} onChange={(value) => updateAboutHero('body', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Origin eyebrow' value={aboutContent.origin.eyebrow} onChange={(value) => updateAboutOrigin('eyebrow', value)} />
                <Field label='Origin title' value={aboutContent.origin.title} onChange={(value) => updateAboutOrigin('title', value)} />
                <Field label='Stats eyebrow' value={aboutContent.statsEyebrow} onChange={(value) => updateAbout('statsEyebrow', value)} />
                <Field label='History eyebrow' value={aboutContent.historyEyebrow} onChange={(value) => updateAbout('historyEyebrow', value)} />
              </div>
              <TextArea label='Origin paragraphs' rows={7} value={aboutContent.origin.paragraphs.join('\n')} onChange={(value) => updateAboutOrigin('paragraphs', splitLines(value))} />
              <TextArea label='Stats' rows={5} value={aboutStatsToText(aboutContent.stats)} onChange={(value) => updateAbout('stats', textToAboutStats(value))} />
              <TextArea label='Milestones' rows={7} value={milestonesToText(aboutContent.milestones)} onChange={(value) => updateAbout('milestones', textToMilestones(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Artisans eyebrow' value={aboutContent.artisansEyebrow} onChange={(value) => updateAbout('artisansEyebrow', value)} />
                <Field label='Artisans title' value={aboutContent.artisansTitle} onChange={(value) => updateAbout('artisansTitle', value)} />
                <Field label='Artisans CTA label' value={aboutContent.artisansCtaLabel} onChange={(value) => updateAbout('artisansCtaLabel', value)} />
                <Field label='Artisans CTA href' value={aboutContent.artisansCtaHref} onChange={(value) => updateAbout('artisansCtaHref', value)} />
              </div>
              <TextArea label='Artisans' rows={6} value={artisansToText(aboutContent.artisans)} onChange={(value) => updateAbout('artisans', textToArtisans(value))} />
              <Field label='Values eyebrow' value={aboutContent.valuesEyebrow} onChange={(value) => updateAbout('valuesEyebrow', value)} />
              <TextArea label='Values' rows={6} value={aboutValuesToText(aboutContent.values)} onChange={(value) => updateAbout('values', textToAboutValues(value))} />
              <TextArea label='Closing quote' value={aboutContent.closing.quote} onChange={(value) => updateAboutClosing('quote', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Closing attribution' value={aboutContent.closing.attribution} onChange={(value) => updateAboutClosing('attribution', value)} />
                <Field label='Primary CTA label' value={aboutContent.closing.primaryCtaLabel} onChange={(value) => updateAboutClosing('primaryCtaLabel', value)} />
                <Field label='Primary CTA href' value={aboutContent.closing.primaryCtaHref} onChange={(value) => updateAboutClosing('primaryCtaHref', value)} />
                <Field label='Secondary CTA label' value={aboutContent.closing.secondaryCtaLabel} onChange={(value) => updateAboutClosing('secondaryCtaLabel', value)} />
                <Field label='Secondary CTA href' value={aboutContent.closing.secondaryCtaHref} onChange={(value) => updateAboutClosing('secondaryCtaHref', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Values Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Hero watermark' value={valuesContent.hero.watermark} onChange={(value) => updateValuesHero('watermark', value)} />
                <Field label='Hero eyebrow' value={valuesContent.hero.eyebrow} onChange={(value) => updateValuesHero('eyebrow', value)} />
                <Field label='Hero title line 1' value={valuesContent.hero.titleLine1} onChange={(value) => updateValuesHero('titleLine1', value)} />
                <Field label='Hero title line 2' value={valuesContent.hero.titleLine2} onChange={(value) => updateValuesHero('titleLine2', value)} />
              </div>
              <TextArea label='Hero body' value={valuesContent.hero.body} onChange={(value) => updateValuesHero('body', value)} />
              <TextArea label='Stats' rows={5} value={valuesStatsToText(valuesContent.stats)} onChange={(value) => updateValues('stats', textToValuesStats(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Materials eyebrow' value={valuesContent.materialsEyebrow} onChange={(value) => updateValues('materialsEyebrow', value)} />
                <Field label='Materials title' value={valuesContent.materialsTitle} onChange={(value) => updateValues('materialsTitle', value)} />
              </div>
              <TextArea label='Materials' rows={7} value={valuesMaterialsToText(valuesContent.materials)} onChange={(value) => updateValues('materials', textToValuesMaterials(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Commitments eyebrow' value={valuesContent.commitmentsEyebrow} onChange={(value) => updateValues('commitmentsEyebrow', value)} />
                <Field label='Commitments title' value={valuesContent.commitmentsTitle} onChange={(value) => updateValues('commitmentsTitle', value)} />
              </div>
              <TextArea label='Commitments' rows={7} value={valuesCommitmentsToText(valuesContent.commitments)} onChange={(value) => updateValues('commitments', textToValuesCommitments(value))} />
              <TextArea label='Closing quote' value={valuesContent.closing.quote} onChange={(value) => updateValuesClosing('quote', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Primary CTA label' value={valuesContent.closing.primaryCtaLabel} onChange={(value) => updateValuesClosing('primaryCtaLabel', value)} />
                <Field label='Primary CTA href' value={valuesContent.closing.primaryCtaHref} onChange={(value) => updateValuesClosing('primaryCtaHref', value)} />
                <Field label='Secondary CTA label' value={valuesContent.closing.secondaryCtaLabel} onChange={(value) => updateValuesClosing('secondaryCtaLabel', value)} />
                <Field label='Secondary CTA href' value={valuesContent.closing.secondaryCtaHref} onChange={(value) => updateValuesClosing('secondaryCtaHref', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Contact Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Hero watermark' value={contactContent.hero.watermark} onChange={(value) => updateContactHero('watermark', value)} />
                <Field label='Hero eyebrow' value={contactContent.hero.eyebrow} onChange={(value) => updateContactHero('eyebrow', value)} />
                <Field label='Hero title line 1' value={contactContent.hero.titleLine1} onChange={(value) => updateContactHero('titleLine1', value)} />
                <Field label='Hero title line 2' value={contactContent.hero.titleLine2} onChange={(value) => updateContactHero('titleLine2', value)} />
              </div>
              <TextArea label='Hero body' value={contactContent.hero.body} onChange={(value) => updateContactHero('body', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Address eyebrow' value={contactContent.info.addressEyebrow} onChange={(value) => updateContactInfo('addressEyebrow', value)} />
                <Field label='Direct eyebrow' value={contactContent.info.directEyebrow} onChange={(value) => updateContactInfo('directEyebrow', value)} />
                <Field label='Hours eyebrow' value={contactContent.info.hoursEyebrow} onChange={(value) => updateContactInfo('hoursEyebrow', value)} />
                <Field label='Follow eyebrow' value={contactContent.info.followEyebrow} onChange={(value) => updateContactInfo('followEyebrow', value)} />
              </div>
              <TextArea label='Address lines' rows={4} value={contactContent.info.addressLines.join('\n')} onChange={(value) => updateContactInfo('addressLines', splitLines(value))} />
              <TextArea label='Direct links' rows={4} value={linksToText(contactContent.info.directLinks)} onChange={(value) => updateContactInfo('directLinks', textToLinks(value))} />
              <TextArea label='Hours' rows={4} value={contactHoursToText(contactContent.info.hours)} onChange={(value) => updateContactInfo('hours', textToContactHours(value))} />
              <TextArea label='Social links' rows={4} value={linksToText(contactContent.info.socialLinks)} onChange={(value) => updateContactInfo('socialLinks', textToLinks(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Name label' value={contactContent.form.nameLabel} onChange={(value) => updateContactForm('nameLabel', value)} />
                <Field label='Name placeholder' value={contactContent.form.namePlaceholder} onChange={(value) => updateContactForm('namePlaceholder', value)} />
                <Field label='Email label' value={contactContent.form.emailLabel} onChange={(value) => updateContactForm('emailLabel', value)} />
                <Field label='Email placeholder' value={contactContent.form.emailPlaceholder} onChange={(value) => updateContactForm('emailPlaceholder', value)} />
                <Field label='Subject label' value={contactContent.form.subjectLabel} onChange={(value) => updateContactForm('subjectLabel', value)} />
                <Field label='Message label' value={contactContent.form.messageLabel} onChange={(value) => updateContactForm('messageLabel', value)} />
                <Field label='Submit label' value={contactContent.form.submitLabel} onChange={(value) => updateContactForm('submitLabel', value)} />
              </div>
              <TextArea label='Subject options' rows={5} value={contactContent.form.subjects.join('\n')} onChange={(value) => updateContactForm('subjects', splitLines(value))} />
              <TextArea label='Message placeholder' value={contactContent.form.messagePlaceholder} onChange={(value) => updateContactForm('messagePlaceholder', value)} />
              <TextArea label='Form footnote' value={contactContent.form.footnote} onChange={(value) => updateContactForm('footnote', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Toast title' value={contactContent.success.toastTitle} onChange={(value) => updateContactSuccess('toastTitle', value)} />
                <Field label='Success eyebrow' value={contactContent.success.eyebrow} onChange={(value) => updateContactSuccess('eyebrow', value)} />
                <Field label='Success title line 1' value={contactContent.success.titleLine1} onChange={(value) => updateContactSuccess('titleLine1', value)} />
                <Field label='Success title line 2' value={contactContent.success.titleLine2} onChange={(value) => updateContactSuccess('titleLine2', value)} />
                <Field label='Reset label' value={contactContent.success.resetLabel} onChange={(value) => updateContactSuccess('resetLabel', value)} />
              </div>
              <TextArea label='Toast message' value={contactContent.success.toastMessage} onChange={(value) => updateContactSuccess('toastMessage', value)} />
              <TextArea label='Success body' value={contactContent.success.body} onChange={(value) => updateContactSuccess('body', value)} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Wishlist Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Hero eyebrow' value={wishlistContent.heroEyebrow} onChange={(value) => updateWishlist('heroEyebrow', value)} />
                <Field label='Hero title' value={wishlistContent.heroTitle} onChange={(value) => updateWishlist('heroTitle', value)} />
                <Field label='Piece singular' value={wishlistContent.pieceSingular} onChange={(value) => updateWishlist('pieceSingular', value)} />
                <Field label='Piece plural' value={wishlistContent.piecePlural} onChange={(value) => updateWishlist('piecePlural', value)} />
                <Field label='Saved label' value={wishlistContent.savedLabel} onChange={(value) => updateWishlist('savedLabel', value)} />
                <Field label='Refreshing label' value={wishlistContent.refreshingLabel} onChange={(value) => updateWishlist('refreshingLabel', value)} />
                <Field label='Empty title' value={wishlistContent.emptyTitle} onChange={(value) => updateWishlist('emptyTitle', value)} />
                <Field label='Empty CTA label' value={wishlistContent.emptyCtaLabel} onChange={(value) => updateWishlist('emptyCtaLabel', value)} />
                <Field label='Empty CTA href' value={wishlistContent.emptyCtaHref} onChange={(value) => updateWishlist('emptyCtaHref', value)} />
                <Field label='Current catalog label' value={wishlistContent.currentCatalogLabel} onChange={(value) => updateWishlist('currentCatalogLabel', value)} />
                <Field label='Saved items label' value={wishlistContent.savedItemsLabel} onChange={(value) => updateWishlist('savedItemsLabel', value)} />
                <Field label='Move all label' value={wishlistContent.moveAllLabel} onChange={(value) => updateWishlist('moveAllLabel', value)} />
                <Field label='Move to bag label' value={wishlistContent.moveToBagLabel} onChange={(value) => updateWishlist('moveToBagLabel', value)} />
                <Field label='Moved toast title' value={wishlistContent.movedToastTitle} onChange={(value) => updateWishlist('movedToastTitle', value)} />
                <Field label='Removed toast title' value={wishlistContent.removedToastTitle} onChange={(value) => updateWishlist('removedToastTitle', value)} />
                <Field label='Remove aria prefix' value={wishlistContent.removeItemAriaPrefix} onChange={(value) => updateWishlist('removeItemAriaPrefix', value)} />
                <Field label='Remove aria suffix' value={wishlistContent.removeItemAriaSuffix} onChange={(value) => updateWishlist('removeItemAriaSuffix', value)} />
                <Field label='Live badge label' value={wishlistContent.liveBadgeLabel} onChange={(value) => updateWishlist('liveBadgeLabel', value)} />
              </div>
              <TextArea label='Empty body' value={wishlistContent.emptyBody} onChange={(value) => updateWishlist('emptyBody', value)} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Checkout Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Brand text' value={checkoutContent.brandText} onChange={(value) => updateCheckout('brandText', value)} />
                <Field label='Step aria label' value={checkoutContent.stepAriaLabel} onChange={(value) => updateCheckout('stepAriaLabel', value)} />
                <Field label='Information title' value={checkoutContent.informationTitle} onChange={(value) => updateCheckout('informationTitle', value)} />
                <Field label='Return to bag label' value={checkoutContent.returnToBagLabel} onChange={(value) => updateCheckout('returnToBagLabel', value)} />
                <Field label='Return to bag href' value={checkoutContent.returnToBagHref} onChange={(value) => updateCheckout('returnToBagHref', value)} />
                <Field label='Continue to shipping label' value={checkoutContent.continueToShippingLabel} onChange={(value) => updateCheckout('continueToShippingLabel', value)} />
                <Field label='Shipping title' value={checkoutContent.shippingTitle} onChange={(value) => updateCheckout('shippingTitle', value)} />
                <Field label='Delivery recap label' value={checkoutContent.deliveryRecapLabel} onChange={(value) => updateCheckout('deliveryRecapLabel', value)} />
                <Field label='Delivery fallback' value={checkoutContent.deliveryAddressFallback} onChange={(value) => updateCheckout('deliveryAddressFallback', value)} />
                <Field label='Change label' value={checkoutContent.changeLabel} onChange={(value) => updateCheckout('changeLabel', value)} />
                <Field label='Back label' value={checkoutContent.backLabel} onChange={(value) => updateCheckout('backLabel', value)} />
                <Field label='Continue to payment label' value={checkoutContent.continueToPaymentLabel} onChange={(value) => updateCheckout('continueToPaymentLabel', value)} />
                <Field label='Payment title' value={checkoutContent.paymentTitle} onChange={(value) => updateCheckout('paymentTitle', value)} />
                <Field label='Billing same label' value={checkoutContent.billingSameLabel} onChange={(value) => updateCheckout('billingSameLabel', value)} />
                <Field label='Add items first label' value={checkoutContent.addItemsFirstLabel} onChange={(value) => updateCheckout('addItemsFirstLabel', value)} />
                <Field label='Place order label' value={checkoutContent.placeOrderLabel} onChange={(value) => updateCheckout('placeOrderLabel', value)} />
                <Field label='Order toast title' value={checkoutContent.orderPlacedToastTitle} onChange={(value) => updateCheckout('orderPlacedToastTitle', value)} />
                <Field label='Confirmation title' value={checkoutContent.confirmationTitle} onChange={(value) => updateCheckout('confirmationTitle', value)} />
                <Field label='Email fallback' value={checkoutContent.confirmationEmailFallback} onChange={(value) => updateCheckout('confirmationEmailFallback', value)} />
                <Field label='Confirmation suffix' value={checkoutContent.confirmationBodySuffix} onChange={(value) => updateCheckout('confirmationBodySuffix', value)} />
                <Field label='Continue shopping label' value={checkoutContent.continueShoppingLabel} onChange={(value) => updateCheckout('continueShoppingLabel', value)} />
                <Field label='Continue shopping href' value={checkoutContent.continueShoppingHref} onChange={(value) => updateCheckout('continueShoppingHref', value)} />
                <Field label='Track order label' value={checkoutContent.trackOrderLabel} onChange={(value) => updateCheckout('trackOrderLabel', value)} />
              </div>
              <TextArea label='Security note' value={checkoutContent.securityNote} onChange={(value) => updateCheckout('securityNote', value)} />
              <TextArea label='Order toast message' value={checkoutContent.orderPlacedToastMessage} onChange={(value) => updateCheckout('orderPlacedToastMessage', value)} />
              <TextArea label='Confirmation body prefix' value={checkoutContent.confirmationBodyPrefix} onChange={(value) => updateCheckout('confirmationBodyPrefix', value)} />
              <TextArea label='Confirmation quote' value={checkoutContent.confirmationQuote} onChange={(value) => updateCheckout('confirmationQuote', value)} />
              <TextArea label='Steps (key | label)' rows={4} value={checkoutStepsToText(checkoutContent.steps)} onChange={(value) => updateCheckout('steps', textToCheckoutSteps(value))} />
              <TextArea label='Information fields (id | label | type | placeholder | half | maxLength | mono)' rows={8} value={checkoutFieldsToText(checkoutContent.informationFields)} onChange={(value) => updateCheckout('informationFields', textToCheckoutFields(value))} />
              <details open style={{ border: '1px solid var(--border)', padding: '1rem' }}>
                <summary className='type-label' style={{ color: 'var(--accent)', cursor: 'pointer' }}>Free shipping</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <Field
                    label='Free shipping threshold (€)'
                    type='number'
                    inputMode='decimal'
                    min={0}
                    step={1}
                    value={String(checkoutContent.freeShippingThreshold)}
                    onChange={(value) => updateCheckout('freeShippingThreshold', parseNonNegativeInteger(value, checkoutContent.freeShippingThreshold))}
                  />
                  <Field
                    label='Method ID that becomes free'
                    value={checkoutContent.freeShippingMethodId}
                    onChange={(value) => updateCheckout('freeShippingMethodId', value)}
                  />
                  <Field
                    label='Banner label (use {amount})'
                    value={checkoutContent.freeShippingBannerLabel}
                    onChange={(value) => updateCheckout('freeShippingBannerLabel', value)}
                  />
                </div>
              </details>
              <details open style={{ border: '1px solid var(--border)', padding: '1rem' }}>
                <summary className='type-label' style={{ color: 'var(--accent)', cursor: 'pointer' }}>Fallback shipping methods</summary>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  {checkoutContent.shippingMethods.map((method, index) => (
                    <ShippingMethodFields
                      key={`${method.id}-${index}`}
                      title={`Fallback method ${index + 1}`}
                      method={method}
                      onChange={(key, value) => updateCheckoutShippingMethod(index, key, value)}
                      onRemove={() => removeCheckoutShippingMethod(index)}
                    />
                  ))}
                  <button
                    type='button'
                    className='btn-ghost'
                    onClick={addCheckoutShippingMethod}
                    style={{ justifySelf: 'start', fontSize: '0.72rem' }}
                  >
                    Add fallback method
                  </button>
                  <TextArea
                    label='Bulk edit fallback methods (id | label | detail | price | price label | min days | max days | carrier: manual/inpost/poczta_polska/dpd | service | pickup)'
                    rows={5}
                    value={checkoutShippingMethodsToText(checkoutContent.shippingMethods)}
                    onChange={(value) => updateCheckout('shippingMethods', textToCheckoutShippingMethods(value))}
                  />
                </div>
              </details>
              <details open style={{ border: '1px solid var(--border)', padding: '1rem' }}>
                <summary className='type-label' style={{ color: 'var(--accent)', cursor: 'pointer' }}>Shipping zones</summary>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  {checkoutContent.shippingZones.map((zone, zoneIndex) => (
                    <details key={`${zone.id}-${zoneIndex}`} open style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1rem' }}>
                      <summary className='type-label' style={{ color: 'var(--fg)', cursor: 'pointer' }}>{zone.label || zone.id || `Zone ${zoneIndex + 1}`}</summary>
                      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <Field label='Zone ID' value={zone.id} onChange={(value) => updateShippingZone(zoneIndex, 'id', value)} />
                          <Field label='Zone label' value={zone.label} onChange={(value) => updateShippingZone(zoneIndex, 'label', value)} />
                        </div>
                        <TextArea
                          label='Countries (comma-separated English names; leave empty for catch-all)'
                          rows={3}
                          value={zone.countries.join(', ')}
                          onChange={(value) => updateShippingZoneCountries(zoneIndex, value)}
                        />
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {zone.methods.map((method, methodIndex) => (
                            <ShippingMethodFields
                              key={`${zone.id}-${method.id}-${methodIndex}`}
                              title={`${zone.label || zone.id} method ${methodIndex + 1}`}
                              method={method}
                              onChange={(key, value) => updateShippingZoneMethod(zoneIndex, methodIndex, key, value)}
                              onRemove={() => removeShippingZoneMethod(zoneIndex, methodIndex)}
                            />
                          ))}
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                              type='button'
                              className='btn-ghost'
                              onClick={() => addShippingZoneMethod(zoneIndex)}
                              style={{ fontSize: '0.72rem' }}
                            >
                              Add zone method
                            </button>
                            <button
                              type='button'
                              className='btn-ghost'
                              onClick={() => removeShippingZone(zoneIndex)}
                              style={{ fontSize: '0.72rem', color: 'var(--coral-red)' }}
                            >
                              Remove zone
                            </button>
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                  <button
                    type='button'
                    className='btn-ghost'
                    onClick={addShippingZone}
                    style={{ justifySelf: 'start', fontSize: '0.72rem' }}
                  >
                    Add shipping zone
                  </button>
                </div>
              </details>
              <TextArea label='Payment fields (id | label | type | placeholder | half | maxLength | mono)' rows={5} value={checkoutFieldsToText(checkoutContent.paymentFields)} onChange={(value) => updateCheckout('paymentFields', textToCheckoutFields(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Summary title' value={checkoutContent.orderSummary.title} onChange={(value) => updateCheckoutSummary('title', value)} />
                <Field label='Summary empty bag' value={checkoutContent.orderSummary.emptyBagLabel} onChange={(value) => updateCheckoutSummary('emptyBagLabel', value)} />
                <Field label='Promo applied suffix' value={checkoutContent.orderSummary.promoAppliedSuffix} onChange={(value) => updateCheckoutSummary('promoAppliedSuffix', value)} />
                <Field label='Remove promo label' value={checkoutContent.orderSummary.removePromoLabel} onChange={(value) => updateCheckoutSummary('removePromoLabel', value)} />
                <Field label='Promo toggle label' value={checkoutContent.orderSummary.promoToggleLabel} onChange={(value) => updateCheckoutSummary('promoToggleLabel', value)} />
                <Field label='Promo placeholder' value={checkoutContent.orderSummary.promoPlaceholder} onChange={(value) => updateCheckoutSummary('promoPlaceholder', value)} />
                <Field label='Promo apply label' value={checkoutContent.orderSummary.promoApplyLabel} onChange={(value) => updateCheckoutSummary('promoApplyLabel', value)} />
                <Field label='Promo invalid label' value={checkoutContent.orderSummary.promoInvalidLabel} onChange={(value) => updateCheckoutSummary('promoInvalidLabel', value)} />
                <Field label='Subtotal label' value={checkoutContent.orderSummary.subtotalLabel} onChange={(value) => updateCheckoutSummary('subtotalLabel', value)} />
                <Field label='Discount label' value={checkoutContent.orderSummary.discountLabel} onChange={(value) => updateCheckoutSummary('discountLabel', value)} />
                <Field label='Summary shipping label' value={checkoutContent.orderSummary.shippingLabel} onChange={(value) => updateCheckoutSummary('shippingLabel', value)} />
                <Field label='Free label' value={checkoutContent.orderSummary.freeLabel} onChange={(value) => updateCheckoutSummary('freeLabel', value)} />
                <Field label='Total label' value={checkoutContent.orderSummary.totalLabel} onChange={(value) => updateCheckoutSummary('totalLabel', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Products Pages
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='All products label' value={productsContent.collection.allProductsLabel} onChange={(value) => updateProductsCollection('allProductsLabel', value)} />
                <Field label='New arrivals label' value={productsContent.collection.newArrivalsLabel} onChange={(value) => updateProductsCollection('newArrivalsLabel', value)} />
                <Field label='Search label prefix' value={productsContent.collection.searchLabelPrefix} onChange={(value) => updateProductsCollection('searchLabelPrefix', value)} />
                <Field label='Filters label' value={productsContent.collection.filtersLabel} onChange={(value) => updateProductsCollection('filtersLabel', value)} />
                <Field label='Clear all label' value={productsContent.collection.clearAllLabel} onChange={(value) => updateProductsCollection('clearAllLabel', value)} />
                <Field label='Clear filters label' value={productsContent.collection.clearFiltersLabel} onChange={(value) => updateProductsCollection('clearFiltersLabel', value)} />
                <Field label='Price label' value={productsContent.collection.priceLabel} onChange={(value) => updateProductsCollection('priceLabel', value)} />
                <Field label='Size label' value={productsContent.collection.sizeLabel} onChange={(value) => updateProductsCollection('sizeLabel', value)} />
                <Field label='Home breadcrumb label' value={productsContent.collection.homeBreadcrumbLabel} onChange={(value) => updateProductsCollection('homeBreadcrumbLabel', value)} />
                <Field label='Collections breadcrumb label' value={productsContent.collection.collectionsBreadcrumbLabel} onChange={(value) => updateProductsCollection('collectionsBreadcrumbLabel', value)} />
                <Field label='Products count label' value={productsContent.collection.productsCountLabel} onChange={(value) => updateProductsCollection('productsCountLabel', value)} />
                <Field label='Pieces count label' value={productsContent.collection.piecesCountLabel} onChange={(value) => updateProductsCollection('piecesCountLabel', value)} />
                <Field label='Total in collection label' value={productsContent.collection.totalInCollectionLabel} onChange={(value) => updateProductsCollection('totalInCollectionLabel', value)} />
                <Field label='Sort label' value={productsContent.collection.sortLabel} onChange={(value) => updateProductsCollection('sortLabel', value)} />
                <Field label='Comfortable view aria label' value={productsContent.collection.comfortableViewAriaLabel} onChange={(value) => updateProductsCollection('comfortableViewAriaLabel', value)} />
                <Field label='Compact view aria label' value={productsContent.collection.compactViewAriaLabel} onChange={(value) => updateProductsCollection('compactViewAriaLabel', value)} />
                <Field label='Result singular' value={productsContent.collection.resultSingular} onChange={(value) => updateProductsCollection('resultSingular', value)} />
                <Field label='Result plural' value={productsContent.collection.resultPlural} onChange={(value) => updateProductsCollection('resultPlural', value)} />
                <Field label='Of label' value={productsContent.collection.ofLabel} onChange={(value) => updateProductsCollection('ofLabel', value)} />
                <Field label='No results title' value={productsContent.collection.noResultsTitle} onChange={(value) => updateProductsCollection('noResultsTitle', value)} />
                <Field label='Quick add label' value={productsContent.collection.quickAddLabel} onChange={(value) => updateProductsCollection('quickAddLabel', value)} />
                <Field label='Added toast title' value={productsContent.collection.addedToastTitle} onChange={(value) => updateProductsCollection('addedToastTitle', value)} />
                <Field label='Loading label' value={productsContent.collection.loadingLabel} onChange={(value) => updateProductsCollection('loadingLabel', value)} />
                <Field label='Load more prefix' value={productsContent.collection.loadMorePrefix} onChange={(value) => updateProductsCollection('loadMorePrefix', value)} />
                <Field label='Remaining label' value={productsContent.collection.remainingLabel} onChange={(value) => updateProductsCollection('remainingLabel', value)} />
                <Field label='Showing label' value={productsContent.collection.showingLabel} onChange={(value) => updateProductsCollection('showingLabel', value)} />
              </div>
              <TextArea label='Sort options (value | label)' rows={5} value={productsSortOptionsToText(productsContent.collection.sortOptions)} onChange={(value) => updateProductsCollection('sortOptions', textToProductsSortOptions(value))} />
              <TextArea label='Sizes' rows={4} value={productsContent.collection.sizes.join('\n')} onChange={(value) => updateProductsCollection('sizes', splitLines(value))} />
              <TextArea label='Price ranges (label | min | max blank for no max)' rows={5} value={productsPriceRangesToText(productsContent.collection.priceRanges)} onChange={(value) => updateProductsCollection('priceRanges', textToProductsPriceRanges(value))} />

              <div style={{ borderTop: '1px solid rgba(210,116,102,0.14)', paddingTop: '1rem', display: 'grid', gap: '1rem' }}>
                <h4 className='type-label' style={{ color: 'var(--muted)' }}>
                  Product detail
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Field label='Detail home breadcrumb' value={productsContent.detail.homeBreadcrumbLabel} onChange={(value) => updateProductsDetail('homeBreadcrumbLabel', value)} />
                  <Field label='Image aria prefix' value={productsContent.detail.imageAriaPrefix} onChange={(value) => updateProductsDetail('imageAriaPrefix', value)} />
                  <Field label='Rotated brand label' value={productsContent.detail.rotatedBrandLabel} onChange={(value) => updateProductsDetail('rotatedBrandLabel', value)} />
                  <Field label='Size guide eyebrow' value={productsContent.detail.sizeGuideEyebrow} onChange={(value) => updateProductsDetail('sizeGuideEyebrow', value)} />
                  <Field label='Size guide title' value={productsContent.detail.sizeGuideTitle} onChange={(value) => updateProductsDetail('sizeGuideTitle', value)} />
                  <Field label='Close size guide label' value={productsContent.detail.closeSizeGuideLabel} onChange={(value) => updateProductsDetail('closeSizeGuideLabel', value)} />
                  <Field label='Size guide help prefix' value={productsContent.detail.sizeGuideHelpPrefix} onChange={(value) => updateProductsDetail('sizeGuideHelpPrefix', value)} />
                  <Field label='Size guide help email' value={productsContent.detail.sizeGuideHelpEmail} onChange={(value) => updateProductsDetail('sizeGuideHelpEmail', value)} />
                  <Field label='Size required label' value={productsContent.detail.sizeRequiredLabel} onChange={(value) => updateProductsDetail('sizeRequiredLabel', value)} />
                  <Field label='Select size label' value={productsContent.detail.selectSizeLabel} onChange={(value) => updateProductsDetail('selectSizeLabel', value)} />
                  <Field label='Size guide label' value={productsContent.detail.sizeGuideLabel} onChange={(value) => updateProductsDetail('sizeGuideLabel', value)} />
                  <Field label='Added button label' value={productsContent.detail.addedButtonLabel} onChange={(value) => updateProductsDetail('addedButtonLabel', value)} />
                  <Field label='Add to bag label' value={productsContent.detail.addToBagLabel} onChange={(value) => updateProductsDetail('addToBagLabel', value)} />
                  <Field label='Added toast title' value={productsContent.detail.addedToastTitle} onChange={(value) => updateProductsDetail('addedToastTitle', value)} />
                  <Field label='Removed wishlist toast title' value={productsContent.detail.removedWishlistToastTitle} onChange={(value) => updateProductsDetail('removedWishlistToastTitle', value)} />
                  <Field label='Saved wishlist toast title' value={productsContent.detail.savedWishlistToastTitle} onChange={(value) => updateProductsDetail('savedWishlistToastTitle', value)} />
                  <Field label='Saved wishlist button label' value={productsContent.detail.savedWishlistButtonLabel} onChange={(value) => updateProductsDetail('savedWishlistButtonLabel', value)} />
                  <Field label='Save wishlist button label' value={productsContent.detail.saveWishlistButtonLabel} onChange={(value) => updateProductsDetail('saveWishlistButtonLabel', value)} />
                  <Field label='Details accordion label' value={productsContent.detail.detailsAccordionLabel} onChange={(value) => updateProductsDetail('detailsAccordionLabel', value)} />
                  <Field label='Care accordion label' value={productsContent.detail.careAccordionLabel} onChange={(value) => updateProductsDetail('careAccordionLabel', value)} />
                  <Field label='Shipping returns accordion label' value={productsContent.detail.shippingReturnsAccordionLabel} onChange={(value) => updateProductsDetail('shippingReturnsAccordionLabel', value)} />
                  <Field label='Reviews eyebrow' value={productsContent.detail.reviewsEyebrow} onChange={(value) => updateProductsDetail('reviewsEyebrow', value)} />
                  <Field label='Reviews title' value={productsContent.detail.reviewsTitle} onChange={(value) => updateProductsDetail('reviewsTitle', value)} />
                  <Field label='Review singular label' value={productsContent.detail.reviewSingularLabel} onChange={(value) => updateProductsDetail('reviewSingularLabel', value)} />
                  <Field label='Review plural label' value={productsContent.detail.reviewPluralLabel} onChange={(value) => updateProductsDetail('reviewPluralLabel', value)} />
                  <Field label='Verified purchase label' value={productsContent.detail.verifiedPurchaseLabel} onChange={(value) => updateProductsDetail('verifiedPurchaseLabel', value)} />
                  <Field label='Write review label' value={productsContent.detail.writeReviewLabel} onChange={(value) => updateProductsDetail('writeReviewLabel', value)} />
                  <Field label='Write review href' value={productsContent.detail.writeReviewHref} onChange={(value) => updateProductsDetail('writeReviewHref', value)} />
                  <Field label='Related eyebrow' value={productsContent.detail.relatedEyebrow} onChange={(value) => updateProductsDetail('relatedEyebrow', value)} />
                  <Field label='Related title' value={productsContent.detail.relatedTitle} onChange={(value) => updateProductsDetail('relatedTitle', value)} />
                </div>
                <TextArea label='Size guide body' value={productsContent.detail.sizeGuideBody} onChange={(value) => updateProductsDetail('sizeGuideBody', value)} />
                <TextArea label='Size guide headers' rows={4} value={productsContent.detail.sizeGuideHeaders.join('\n')} onChange={(value) => updateProductsDetail('sizeGuideHeaders', splitLines(value))} />
                <TextArea label='Size guide rows (size | chest | waist | hips)' rows={6} value={productsSizeGuideRowsToText(productsContent.detail.sizeGuideRows)} onChange={(value) => updateProductsDetail('sizeGuideRows', textToProductsSizeGuideRows(value))} />
                <TextArea label='Shipping returns items' rows={6} value={productsContent.detail.shippingReturnsItems.join('\n')} onChange={(value) => updateProductsDetail('shippingReturnsItems', splitLines(value))} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Account Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Field label='Loading label' value={accountContent.loadingLabel} onChange={(value) => updateAccount('loadingLabel', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Signed out brand name' value={accountContent.signedOut.brandName} onChange={(value) => updateAccountSignedOut('brandName', value)} />
                <Field label='Signed out brand suffix' value={accountContent.signedOut.brandSuffix} onChange={(value) => updateAccountSignedOut('brandSuffix', value)} />
                <Field label='Signed out title' value={accountContent.signedOut.title} onChange={(value) => updateAccountSignedOut('title', value)} />
                <Field label='Sign in label' value={accountContent.signedOut.signInLabel} onChange={(value) => updateAccountSignedOut('signInLabel', value)} />
                <Field label='Back to shop label' value={accountContent.signedOut.backToShopLabel} onChange={(value) => updateAccountSignedOut('backToShopLabel', value)} />
                <Field label='Back to shop href' value={accountContent.signedOut.backToShopHref} onChange={(value) => updateAccountSignedOut('backToShopHref', value)} />
              </div>
              <TextArea label='Signed out body' value={accountContent.signedOut.body} onChange={(value) => updateAccountSignedOut('body', value)} />
              <TextArea label='Tabs (id | label)' rows={4} value={accountTabsToText(accountContent.tabs)} onChange={(value) => updateAccount('tabs', textToAccountTabs(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Header watermark' value={accountContent.header.watermark} onChange={(value) => updateAccountHeader('watermark', value)} />
                <Field label='Header eyebrow' value={accountContent.header.eyebrow} onChange={(value) => updateAccountHeader('eyebrow', value)} />
                <Field label='Welcome prefix' value={accountContent.header.welcomePrefix} onChange={(value) => updateAccountHeader('welcomePrefix', value)} />
                <Field label='Super admin prefix' value={accountContent.header.superAdminPrefix} onChange={(value) => updateAccountHeader('superAdminPrefix', value)} />
                <Field label='Orders label' value={accountContent.header.ordersLabel} onChange={(value) => updateAccountHeader('ordersLabel', value)} />
                <Field label='Member role label' value={accountContent.sidebar.memberRoleLabel} onChange={(value) => updateAccountSidebar('memberRoleLabel', value)} />
                <Field label='Super admin role label' value={accountContent.sidebar.superAdminRoleLabel} onChange={(value) => updateAccountSidebar('superAdminRoleLabel', value)} />
                <Field label='Wishlist label' value={accountContent.sidebar.wishlistLabel} onChange={(value) => updateAccountSidebar('wishlistLabel', value)} />
                <Field label='Sign out label' value={accountContent.sidebar.signOutLabel} onChange={(value) => updateAccountSidebar('signOutLabel', value)} />
              </div>
              <TextArea label='Overview stats (key | label | fallback value)' rows={5} value={accountStatsToText(accountContent.overview.stats)} onChange={(value) => updateAccountOverview('stats', textToAccountStats(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Recent order label' value={accountContent.overview.recentOrderLabel} onChange={(value) => updateAccountOverview('recentOrderLabel', value)} />
                <Field label='View all orders label' value={accountContent.overview.viewAllOrdersLabel} onChange={(value) => updateAccountOverview('viewAllOrdersLabel', value)} />
                <Field label='Orders title' value={accountContent.orders.title} onChange={(value) => updateAccountOrders('title', value)} />
                <Field label='Empty orders label' value={accountContent.orders.emptyLabel} onChange={(value) => updateAccountOrders('emptyLabel', value)} />
                <Field label='Order number label' value={accountContent.orders.orderNumberLabel} onChange={(value) => updateAccountOrders('orderNumberLabel', value)} />
                <Field label='Shipping label' value={accountContent.orders.shippingLabel} onChange={(value) => updateAccountOrders('shippingLabel', value)} />
                <Field label='Tracking label' value={accountContent.orders.trackingLabel} onChange={(value) => updateAccountOrders('trackingLabel', value)} />
                <Field label='Items label' value={accountContent.orders.itemsLabel} onChange={(value) => updateAccountOrders('itemsLabel', value)} />
                <Field label='Quantity label' value={accountContent.orders.qtyLabel} onChange={(value) => updateAccountOrders('qtyLabel', value)} />
                <Field label='Pending payment status' value={accountContent.orders.statuses.pending_payment} onChange={(value) => updateAccountOrders('statuses', { ...accountContent.orders.statuses, pending_payment: value })} />
                <Field label='Delivered status' value={accountContent.orders.statuses.delivered} onChange={(value) => updateAccountOrders('statuses', { ...accountContent.orders.statuses, delivered: value })} />
                <Field label='In transit status' value={accountContent.orders.statuses['in-transit']} onChange={(value) => updateAccountOrders('statuses', { ...accountContent.orders.statuses, 'in-transit': value })} />
                <Field label='Processing status' value={accountContent.orders.statuses.processing} onChange={(value) => updateAccountOrders('statuses', { ...accountContent.orders.statuses, processing: value })} />
                <Field label='Cancelled status' value={accountContent.orders.statuses.cancelled} onChange={(value) => updateAccountOrders('statuses', { ...accountContent.orders.statuses, cancelled: value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Settings title' value={accountContent.settings.title} onChange={(value) => updateAccountSettings('title', value)} />
                <Field label='Personal details label' value={accountContent.settings.personalDetailsLabel} onChange={(value) => updateAccountSettings('personalDetailsLabel', value)} />
                <Field label='Full name label' value={accountContent.settings.fullNameLabel} onChange={(value) => updateAccountSettings('fullNameLabel', value)} />
                <Field label='Email label' value={accountContent.settings.emailLabel} onChange={(value) => updateAccountSettings('emailLabel', value)} />
                <Field label='Default shipping address label' value={accountContent.settings.defaultShippingAddressLabel} onChange={(value) => updateAccountSettings('defaultShippingAddressLabel', value)} />
                <Field label='Edit label' value={accountContent.settings.editLabel} onChange={(value) => updateAccountSettings('editLabel', value)} />
                <Field label='Communication preferences label' value={accountContent.settings.communicationPreferencesLabel} onChange={(value) => updateAccountSettings('communicationPreferencesLabel', value)} />
                <Field label='Save changes label' value={accountContent.settings.saveChangesLabel} onChange={(value) => updateAccountSettings('saveChangesLabel', value)} />
              </div>
              <TextArea label='Default shipping address lines' rows={4} value={accountContent.settings.defaultShippingAddressLines.join('\n')} onChange={(value) => updateAccountSettings('defaultShippingAddressLines', splitLines(value))} />
              <TextArea label='Preferences (label | checked)' rows={5} value={accountPreferencesToText(accountContent.settings.preferences)} onChange={(value) => updateAccountSettings('preferences', textToAccountPreferences(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Admin title' value={accountContent.admin.title} onChange={(value) => updateAccountAdmin('title', value)} />
                <Field label='Admin badge label' value={accountContent.admin.badgeLabel} onChange={(value) => updateAccountAdmin('badgeLabel', value)} />
                <Field label='CMS link label' value={accountContent.admin.cmsLinkLabel} onChange={(value) => updateAccountAdmin('cmsLinkLabel', value)} />
                <Field label='Registered users label' value={accountContent.admin.registeredUsersLabel} onChange={(value) => updateAccountAdmin('registeredUsersLabel', value)} />
                <Field label='Recent registrations label' value={accountContent.admin.recentRegistrationsLabel} onChange={(value) => updateAccountAdmin('recentRegistrationsLabel', value)} />
                <Field label='Admin loading label' value={accountContent.admin.loadingLabel} onChange={(value) => updateAccountAdmin('loadingLabel', value)} />
                <Field label='Load users error' value={accountContent.admin.loadUsersError} onChange={(value) => updateAccountAdmin('loadUsersError', value)} />
                <Field label='No users label' value={accountContent.admin.noUsersLabel} onChange={(value) => updateAccountAdmin('noUsersLabel', value)} />
              </div>
              <TextArea label='CMS link description' value={accountContent.admin.cmsLinkDescription} onChange={(value) => updateAccountAdmin('cmsLinkDescription', value)} />
              <TextArea label='Admin table headers' rows={3} value={accountContent.admin.tableHeaders.join('\n')} onChange={(value) => updateAccountAdmin('tableHeaders', splitLines(value))} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Stories Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Index eyebrow' value={storiesPageContent.index.eyebrow} onChange={(value) => updateStoriesIndex('eyebrow', value)} />
                <Field label='Index title' value={storiesPageContent.index.title} onChange={(value) => updateStoriesIndex('title', value)} />
                <Field label='Featured badge' value={storiesPageContent.index.featuredBadge} onChange={(value) => updateStoriesIndex('featuredBadge', value)} />
                <Field label='Featured read label' value={storiesPageContent.index.readLabel} onChange={(value) => updateStoriesIndex('readLabel', value)} />
                <Field label='Card read label' value={storiesPageContent.index.cardReadLabel} onChange={(value) => updateStoriesIndex('cardReadLabel', value)} />
              </div>
              <TextArea label='Index description' value={storiesPageContent.index.description} onChange={(value) => updateStoriesIndex('description', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Empty title' value={storiesPageContent.index.emptyTitle} onChange={(value) => updateStoriesIndex('emptyTitle', value)} />
                <Field label='Empty body' value={storiesPageContent.index.emptyBody} onChange={(value) => updateStoriesIndex('emptyBody', value)} />
                <Field label='Detail breadcrumb' value={storiesPageContent.detail.breadcrumbLabel} onChange={(value) => updateStoriesDetail('breadcrumbLabel', value)} />
                <Field label='Detail issue prefix' value={storiesPageContent.detail.issueLabelPrefix} onChange={(value) => updateStoriesDetail('issueLabelPrefix', value)} />
                <Field label='Related eyebrow' value={storiesPageContent.detail.relatedEyebrow} onChange={(value) => updateStoriesDetail('relatedEyebrow', value)} />
              </div>
              <TextArea label='Category filters' rows={4} value={storiesPageContent.index.categoryFilters.join('\n')} onChange={(value) => updateStoriesIndex('categoryFilters', splitLines(value))} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Stories
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type='button'
                  className='btn-ghost'
                  onClick={startNewStoryDraft}
                  disabled={storySaving}
                  style={{ fontSize: '0.72rem' }}
                >
                  New story
                </button>
                <button
                  type='button'
                  className='btn-primary'
                  onClick={() => void saveStoryDraft()}
                  disabled={storySaving || !storyDraft.trim()}
                  style={{ fontSize: '0.72rem' }}
                >
                  {storySaving ? 'Saving…' : selectedStorySlug ? 'Save story' : 'Create story'}
                </button>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {stories.map((story) => (
                  <div
                    key={story.slug}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '0.75rem',
                      alignItems: 'center',
                      border: '1px solid var(--border)',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>{story.title}</div>
                      <div className='type-label' style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>{story.slug} · {story.category}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => editStoryDraft(story)}
                        disabled={storySaving}
                        style={{ fontSize: '0.68rem', padding: '0.55rem 0.7rem' }}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => void deleteStoryDraft(story.slug)}
                        disabled={storySaving}
                        style={{ fontSize: '0.68rem', padding: '0.55rem 0.7rem', color: 'var(--coral-red)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <TextArea
                label={selectedStorySlug ? `Editing story: ${selectedStorySlug}` : 'New story JSON'}
                rows={16}
                value={storyDraft}
                onChange={setStoryDraft}
              />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Lookbook Page
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Empty title' value={lookbookPageContent.emptyTitle} onChange={(value) => updateLookbookPage('emptyTitle', value)} />
                <Field label='Empty body' value={lookbookPageContent.emptyBody} onChange={(value) => updateLookbookPage('emptyBody', value)} />
                <Field label='View label' value={lookbookPageContent.viewLabel} onChange={(value) => updateLookbookPage('viewLabel', value)} />
                <Field label='Featured label' value={lookbookPageContent.featuredLabel} onChange={(value) => updateLookbookPage('featuredLabel', value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Masthead watermark' value={lookbookPageContent.masthead.watermark} onChange={(value) => updateLookbookMasthead('watermark', value)} />
                <Field label='Masthead eyebrow' value={lookbookPageContent.masthead.eyebrow} onChange={(value) => updateLookbookMasthead('eyebrow', value)} />
                <Field label='Masthead title' value={lookbookPageContent.masthead.title} onChange={(value) => updateLookbookMasthead('title', value)} />
                <Field label='Issue range' value={lookbookPageContent.masthead.issueRange} onChange={(value) => updateLookbookMasthead('issueRange', value)} />
                <Field label='Date range' value={lookbookPageContent.masthead.dateRange} onChange={(value) => updateLookbookMasthead('dateRange', value)} />
              </div>
              <TextArea label='Masthead description' value={lookbookPageContent.masthead.description} onChange={(value) => updateLookbookMasthead('description', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='CTA issue label' value={lookbookPageContent.cta.issueLabel} onChange={(value) => updateLookbookCta('issueLabel', value)} />
                <Field label='CTA title line 1' value={lookbookPageContent.cta.titleLine1} onChange={(value) => updateLookbookCta('titleLine1', value)} />
                <Field label='CTA title line 2' value={lookbookPageContent.cta.titleLine2} onChange={(value) => updateLookbookCta('titleLine2', value)} />
                <Field label='CTA label' value={lookbookPageContent.cta.label} onChange={(value) => updateLookbookCta('label', value)} />
                <Field label='CTA href' value={lookbookPageContent.cta.href} onChange={(value) => updateLookbookCta('href', value)} />
              </div>
              <TextArea label='CTA body' value={lookbookPageContent.cta.body} onChange={(value) => updateLookbookCta('body', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Archive label' value={lookbookPageContent.archive.label} onChange={(value) => updateLookbookArchive('label', value)} />
                <Field label='Archive CTA label' value={lookbookPageContent.archive.ctaLabel} onChange={(value) => updateLookbookArchive('ctaLabel', value)} />
                <Field label='Archive CTA href' value={lookbookPageContent.archive.ctaHref} onChange={(value) => updateLookbookArchive('ctaHref', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Lookbook
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type='button'
                  className='btn-ghost'
                  onClick={startNewLookbookDraft}
                  disabled={lookbookSaving}
                  style={{ fontSize: '0.72rem' }}
                >
                  New entry
                </button>
                <button
                  type='button'
                  className='btn-primary'
                  onClick={() => void saveLookbookDraft()}
                  disabled={lookbookSaving || !lookbookDraft.trim()}
                  style={{ fontSize: '0.72rem' }}
                >
                  {lookbookSaving ? 'Saving…' : selectedLookbookId ? 'Save entry' : 'Create entry'}
                </button>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {lookbookEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '0.75rem',
                      alignItems: 'center',
                      border: '1px solid var(--border)',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>{entry.title}</div>
                      <div className='type-label' style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Issue {entry.issue} · {entry.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => editLookbookDraft(entry)}
                        disabled={lookbookSaving}
                        style={{ fontSize: '0.68rem', padding: '0.55rem 0.7rem' }}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => void deleteLookbookDraft(entry.id)}
                        disabled={lookbookSaving}
                        style={{ fontSize: '0.68rem', padding: '0.55rem 0.7rem', color: 'var(--coral-red)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <TextArea
                label={selectedLookbookId ? `Editing lookbook entry: ${selectedLookbookId}` : 'New lookbook entry JSON'}
                rows={12}
                value={lookbookDraft}
                onChange={setLookbookDraft}
              />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Hero
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Field label='Status' value={content.hero.status} onChange={(value) => updateHero('status', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Headline line 1' value={content.hero.headlineLine1} onChange={(value) => updateHero('headlineLine1', value)} />
                <Field label='Headline line 2' value={content.hero.headlineLine2} onChange={(value) => updateHero('headlineLine2', value)} />
              </div>
              <TextArea label='Description' value={content.hero.description} onChange={(value) => updateHero('description', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Primary CTA label' value={content.hero.primaryCtaLabel} onChange={(value) => updateHero('primaryCtaLabel', value)} />
                <Field label='Primary CTA href' value={content.hero.primaryCtaHref} onChange={(value) => updateHero('primaryCtaHref', value)} />
                <Field label='Secondary CTA label' value={content.hero.secondaryCtaLabel} onChange={(value) => updateHero('secondaryCtaLabel', value)} />
                <Field label='Secondary CTA href' value={content.hero.secondaryCtaHref} onChange={(value) => updateHero('secondaryCtaHref', value)} />
              </div>
              <TextArea label='Tags' rows={5} value={content.hero.tags.join('\n')} onChange={(value) => updateHero('tags', splitLines(value))} />
              <TextArea label='Stats' rows={4} value={statsToText(content.hero.stats)} onChange={(value) => updateHero('stats', textToStats(value))} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Right panel status' value={content.hero.panelStatus} onChange={(value) => updateHero('panelStatus', value)} />
                <Field label='Right panel title' value={content.hero.panelTitle} onChange={(value) => updateHero('panelTitle', value)} />
                <Field label='Right panel subtitle' value={content.hero.panelSubtitle} onChange={(value) => updateHero('panelSubtitle', value)} />
                <Field label='Right panel price' value={content.hero.panelPrice} onChange={(value) => updateHero('panelPrice', value)} />
              </div>
              <TextArea label='Bottom strip' rows={5} value={content.hero.bottomStripItems.join('\n')} onChange={(value) => updateHero('bottomStripItems', splitLines(value))} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Categories
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Eyebrow' value={content.categories.eyebrow} onChange={(value) => updateCategories('eyebrow', value)} />
                <Field label='Title' value={content.categories.title} onChange={(value) => updateCategories('title', value)} />
                <Field label='CTA label' value={content.categories.ctaLabel} onChange={(value) => updateCategories('ctaLabel', value)} />
                <Field label='CTA href' value={content.categories.ctaHref} onChange={(value) => updateCategories('ctaHref', value)} />
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {content.categories.cards.map((card, index) => (
                  <div key={`${card.id}-${index}`} style={{ border: '1px solid var(--border)', padding: '1rem', display: 'grid', gap: '1rem' }}>
                    {(() => {
                      const selectorOptions = card.selectorType === 'category'
                        ? catalogCategoryOptions
                        : card.selectorType === 'theme'
                          ? catalogThemeOptions
                          : [];
                      return (
                        <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div className='type-label' style={{ color: 'var(--accent)' }}>
                        Selector {index + 1}: {card.label || card.id}
                      </div>
                      <button
                        type='button'
                        className='btn-ghost'
                        onClick={() => removeCategoryCard(index)}
                        disabled={headerDisabled}
                        style={{ fontSize: '0.66rem', padding: '0.45rem 0.65rem', color: 'var(--coral-red)' }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                      <Field label='ID' value={card.id} onChange={(value) => updateCategoryCard(index, 'id', value)} />
                      <Field label='Label' value={card.label} onChange={(value) => updateCategoryCard(index, 'label', value)} />
                      <Field label='Sublabel' value={card.sublabel} onChange={(value) => updateCategoryCard(index, 'sublabel', value)} />
                      <Field label='Tag' value={card.tag} onChange={(value) => updateCategoryCard(index, 'tag', value)} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingTop: '1.35rem' }}>
                        <input
                          type='checkbox'
                          checked={card.visible}
                          onChange={(event) => updateCategoryCard(index, 'visible', event.currentTarget.checked)}
                          disabled={headerDisabled}
                        />
                        <span className='type-label' style={labelStyle}>Visible on home</span>
                      </label>
                      <Field
                        label='Fallback count'
                        type='number'
                        inputMode='numeric'
                        min={0}
                        value={String(card.fallbackCount)}
                        onChange={(value) => updateCategoryCard(index, 'fallbackCount', Number(value) || 0)}
                      />
                      <label>
                        <span className='type-label' style={labelStyle}>Selector type</span>
                        <select
                          value={card.selectorType}
                          onChange={(event) => updateCategoryCard(index, 'selectorType', event.target.value as HomeCategorySelectorType)}
                          style={{ ...fieldStyle, padding: '0.8rem 0.9rem' }}
                        >
                          {CATEGORY_SELECTOR_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      <Field label='Custom href fallback' value={card.href} onChange={(value) => updateCategoryCard(index, 'href', value)} />
                      <Field label='Image URL' value={card.imageUrl} onChange={(value) => updateCategoryCard(index, 'imageUrl', value)} />
                    </div>

                    <TextArea
                      label='Selector values (one category/theme per line)'
                      rows={4}
                      value={selectorValuesToText(card.selectorValues)}
                      onChange={(value) => updateCategoryCard(index, 'selectorValues', textToSelectorValues(value))}
                    />

                    {(card.selectorType === 'category' || card.selectorType === 'theme') && (
                      <div style={{ display: 'grid', gap: '0.65rem' }}>
                        <div className='type-label' style={{ color: 'var(--muted)' }}>
                          Choose {card.selectorType === 'category' ? 'categories' : 'themes'} from live catalog
                        </div>
                        {selectorOptions.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', maxHeight: '11rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {selectorOptions.map((option) => {
                              const selected = card.selectorValues.includes(option.name);
                              return (
                                <button
                                  key={option.name}
                                  type='button'
                                  className={selected ? 'btn-primary' : 'btn-ghost'}
                                  onClick={() => toggleCategoryCardSelectorValue(index, option.name)}
                                  disabled={headerDisabled}
                                  style={{ fontSize: '0.62rem', padding: '0.45rem 0.6rem' }}
                                >
                                  {option.name} ({option.count})
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className='type-label' style={{ color: 'var(--muted)' }}>
                            No live catalog options loaded for this locale.
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <label>
                        <span className='type-label' style={labelStyle}>Upload selector image</span>
                        <input
                          type='file'
                          accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
                          disabled={headerDisabled}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0] ?? null;
                            void uploadCategoryCardImage(index, file);
                            event.currentTarget.value = '';
                          }}
                          style={{ ...fieldStyle, padding: '0.72rem 0.8rem' }}
                        />
                      </label>
                      {card.imageUrl.trim() && (
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <img
                            src={card.imageUrl}
                            alt=''
                            style={{
                              width: '92px',
                              height: '60px',
                              objectFit: 'cover',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                            }}
                          />
                          <button
                            type='button'
                            className='btn-ghost'
                            onClick={() => updateCategoryCard(index, 'imageUrl', '')}
                            disabled={headerDisabled}
                            style={{ fontSize: '0.66rem', padding: '0.5rem 0.7rem' }}
                          >
                            Clear image
                          </button>
                        </div>
                      )}
                      {categoryImageUploadingIndex === index && (
                        <span className='type-label' style={{ color: 'var(--accent)' }}>Uploading...</span>
                      )}
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--muted)' }}>
                      Target: {getHomeCategoryCardTarget(card, catalogCategoryOptions)}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
                <button
                  type='button'
                  className='btn-ghost'
                  onClick={addCategoryCard}
                  disabled={headerDisabled}
                  style={{ justifySelf: 'start', fontSize: '0.72rem' }}
                >
                  Add selector
                </button>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Featured Products
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Live eyebrow' value={content.featured.liveEyebrow} onChange={(value) => updateFeatured('liveEyebrow', value)} />
                <Field label='Fallback eyebrow' value={content.featured.fallbackEyebrow} onChange={(value) => updateFeatured('fallbackEyebrow', value)} />
                <Field label='Title' value={content.featured.title} onChange={(value) => updateFeatured('title', value)} />
                <Field label='Quick add label' value={content.featured.quickAddLabel} onChange={(value) => updateFeatured('quickAddLabel', value)} />
                <Field label='Live CTA label' value={content.featured.ctaLiveLabel} onChange={(value) => updateFeatured('ctaLiveLabel', value)} />
                <Field label='Fallback CTA label' value={content.featured.ctaFallbackLabel} onChange={(value) => updateFeatured('ctaFallbackLabel', value)} />
                <Field label='CTA href' value={content.featured.ctaHref} onChange={(value) => updateFeatured('ctaHref', value)} />
              </div>
              <TextArea label='Filters' rows={4} value={content.featured.filters.join('\n')} onChange={(value) => updateFeatured('filters', splitLines(value))} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Collector&apos;s Creed
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <TextArea label='Animated strip' rows={5} value={content.manifesto.marqueeItems.join('\n')} onChange={(value) => updateManifesto('marqueeItems', splitLines(value))} />
              <Field label='Eyebrow' value={content.manifesto.eyebrow} onChange={(value) => updateManifesto('eyebrow', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Quote before highlight' value={content.manifesto.quotePrefix} onChange={(value) => updateManifesto('quotePrefix', value)} />
                <Field label='Quote highlight' value={content.manifesto.quoteEmphasis} onChange={(value) => updateManifesto('quoteEmphasis', value)} />
                <Field label='Quote after highlight' value={content.manifesto.quoteSuffix} onChange={(value) => updateManifesto('quoteSuffix', value)} />
              </div>
              <TextArea label='Body' value={content.manifesto.body} onChange={(value) => updateManifesto('body', value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='CTA label' value={content.manifesto.ctaLabel} onChange={(value) => updateManifesto('ctaLabel', value)} />
                <Field label='CTA href' value={content.manifesto.ctaHref} onChange={(value) => updateManifesto('ctaHref', value)} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Editorial Reports
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field label='Eyebrow' value={content.editorial.eyebrow} onChange={(value) => updateEditorial('eyebrow', value)} />
                <Field label='Title' value={content.editorial.title} onChange={(value) => updateEditorial('title', value)} />
                <Field label='CTA label' value={content.editorial.ctaLabel} onChange={(value) => updateEditorial('ctaLabel', value)} />
                <Field label='CTA href' value={content.editorial.ctaHref} onChange={(value) => updateEditorial('ctaHref', value)} />
                <Field label='Read label' value={content.editorial.readLabel} onChange={(value) => updateEditorial('readLabel', value)} />
              </div>
              <TextArea
                label='Reports (use ![alt](url) blocks in body for embedded images)'
                rows={7}
                value={reportsToText(content.editorial.reports)}
                onChange={(value) => updateEditorial('reports', textToReports(value))}
              />
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div className='type-label' style={{ color: 'var(--muted)' }}>
                  Upload report thumbnails (stored with CMS card uploader)
                </div>
                {(
                  content.editorial.reports.length > 0
                    ? content.editorial.reports
                    : [makeHomeEditorialReport(0)]
                ).map((report, reportIndex) => (
                  <div
                    key={`${report.id}-${reportIndex}`}
                    style={{ border: '1px solid var(--border)', padding: '0.9rem', display: 'grid', gap: '0.85rem' }}
                  >
                    <div className='type-label' style={{ color: 'var(--accent)' }}>
                      {report.title || report.id || `Report ${reportIndex + 1}`}
                    </div>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <Field
                        label='Image URL'
                        value={report.imageUrl}
                        onChange={(value) => updateEditorialReport(reportIndex, 'imageUrl', value)}
                      />
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                      }}>
                        <label>
                          <span className='type-label' style={labelStyle}>Upload report image</span>
                          <input
                            type='file'
                            accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
                            disabled={headerDisabled}
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0] ?? null;
                              void uploadEditorialReportImage(reportIndex, file);
                              event.currentTarget.value = '';
                            }}
                            style={{ ...fieldStyle, padding: '0.72rem 0.8rem' }}
                          />
                        </label>
                        {report.imageUrl.trim() && (
                          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <img
                              src={report.imageUrl}
                              alt=''
                              style={{
                                width: '92px',
                                height: '60px',
                                objectFit: 'cover',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border)',
                              }}
                            />
                            <button
                              type='button'
                              className='btn-ghost'
                              onClick={() => updateEditorialReport(reportIndex, 'imageUrl', '')}
                              disabled={headerDisabled}
                              style={{ fontSize: '0.66rem', padding: '0.5rem 0.7rem' }}
                            >
                              Clear image
                            </button>
                          </div>
                        )}
                        {editorialReportImageUploadingIndex === reportIndex && (
                          <span className='type-label' style={{ color: 'var(--accent)' }}>Uploading...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {content.editorial.reports.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className='type-label' style={{ color: 'var(--muted)' }}>
                      No editorial report records found. Add one now to save report metadata.
                    </div>
                    <button
                      type='button'
                      className='btn-ghost'
                      onClick={addEditorialReport}
                      disabled={headerDisabled}
                    >
                      Add report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(210,116,102,0.18)', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '1rem' }}>
              Recently Viewed
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Field label='Eyebrow' value={content.recentlyViewed.eyebrow} onChange={(value) => updateRecentlyViewed('eyebrow', value)} />
              <Field label='Title' value={content.recentlyViewed.title} onChange={(value) => updateRecentlyViewed('title', value)} />
              <Field label='CTA label' value={content.recentlyViewed.ctaLabel} onChange={(value) => updateRecentlyViewed('ctaLabel', value)} />
              <Field label='CTA href' value={content.recentlyViewed.ctaHref} onChange={(value) => updateRecentlyViewed('ctaHref', value)} />
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className='type-label' style={{ color: 'var(--accent)', marginTop: '1rem' }}>{message}</div>
      )}
      {error && (
        <div className='type-label' style={{ color: 'var(--coral-red)', marginTop: '1rem', lineHeight: 1.6 }}>{error}</div>
      )}
    </section>
  );
}
