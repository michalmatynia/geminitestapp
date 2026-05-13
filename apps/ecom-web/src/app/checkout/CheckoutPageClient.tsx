'use client';

/* eslint-disable max-lines */

import { useState, useEffect, useMemo, useCallback, useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { formatPrice } from '@/lib/locales';
import {
  applyFreeThreshold,
  calcDeliveryRange,
  filterShippingMethodsForCountry,
  getZoneForCountry,
  isPolandShippingCountry,
} from '@/lib/shipping';
import { SiteNav } from '@/components/SiteNav';
import { COUNTRIES } from '@/data/countries';
import type { CartItem } from '@/context/CartContext';
import type { Product } from '@/data/products';
import type { EcomLocale } from '@/lib/locales';
import type { InpostPoint } from '@/lib/orders';
import type {
  CheckoutContent,
  CheckoutFieldContent,
  CheckoutShippingMethodContent,
  CheckoutStepContent,
  CheckoutStepKey,
  CheckoutSummaryContent,
} from '@/data/checkoutContent';

type Step = CheckoutStepKey | 'confirmation';
type FreshCartProduct = Pick<
  Product,
  'id' | 'name' | 'category' | 'price' | 'priceDisplay' | 'currencyCode' | 'gradient' | 'imageUrl'
>;

const calculatePromoDiscount = (
  subtotal: number,
  promoDiscountType: 'percentage' | 'fixed' | null,
  promoDiscountValue: number
): number => {
  if (promoDiscountType === 'fixed') {
    return Math.min(subtotal, Math.round(promoDiscountValue));
  }
  if (promoDiscountType === 'percentage') {
    return Math.round(subtotal * promoDiscountValue);
  }
  return 0;
};

const normalizePromoCode = (value: string): string => value.replace(/\s+/g, '').trim().toUpperCase();

const isNonEmptyString = (value: string | null | undefined): value is string => value !== null && value !== undefined && value !== '';
const isTruthyBoolean = (value: boolean | null | undefined): value is true => value === true;

const firstNonEmptyString = (items: readonly string[]): string => {
  for (const item of items) {
    if (item !== '') return item;
  }
  return '';
};

const toOptionalText = (value: string): string | undefined => (value === '' ? undefined : value);
const firstCartCurrencyCode = (items: CartItem[]): string =>
  items.find((item) => (item.currencyCode ?? '').trim() !== '')?.currencyCode ?? 'PLN';
const freshText = (next: string, current: string): string => (next === '' ? current : next);
const freshPrice = (next: number, current: number): number => (next === 0 ? current : next);

const mergeFreshCartItem = (
  item: CartItem,
  fresh: FreshCartProduct | undefined
): CartItem => {
  if (fresh === undefined) return item;
  return {
    ...item,
    name: freshText(fresh.name, item.name),
    category: freshText(fresh.category, item.category),
    price: freshPrice(fresh.price, item.price),
    priceDisplay: freshText(fresh.priceDisplay, item.priceDisplay),
    currencyCode: fresh.currencyCode ?? item.currencyCode,
    gradient: freshText(fresh.gradient, item.gradient),
    imageUrl: fresh.imageUrl ?? item.imageUrl,
  };
};

const readFreshProductString = (product: Record<string, unknown>, key: string): string => {
  const value = product[key];
  return typeof value === 'string' ? value : '';
};

const readFreshProductNumber = (product: Record<string, unknown>, key: string): number => {
  const value = product[key];
  return typeof value === 'number' ? value : 0;
};

const productToFreshCartProduct = (product: Record<string, unknown>): FreshCartProduct | null => {
  const id = product.id;
  if (typeof id !== 'string') return null;
  return {
    id,
    name: readFreshProductString(product, 'name'),
    category: readFreshProductString(product, 'category'),
    price: readFreshProductNumber(product, 'price'),
    priceDisplay: readFreshProductString(product, 'priceDisplay'),
    currencyCode: toOptionalText(readFreshProductString(product, 'currencyCode')),
    gradient: readFreshProductString(product, 'gradient'),
    imageUrl: readFreshProductString(product, 'imageUrl'),
  };
};

const readFreshCartProductsResponse = (
  data: unknown
): Partial<Record<string, FreshCartProduct>> => {
  const rawProducts = isPlainRecord(data) && Array.isArray(data.products) ? data.products : [];
  const next: Partial<Record<string, FreshCartProduct>> = {};
  for (const product of rawProducts) {
    if (!isPlainRecord(product)) continue;
    const freshProduct = productToFreshCartProduct(product);
    if (freshProduct !== null) next[freshProduct.id] = freshProduct;
  }
  return next;
};

type PromoValidateResponse = {
  valid: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
};

function isPromoValidateResponse(value: unknown): value is PromoValidateResponse {
  if (!isPlainRecord(value)) return false;
  const valid = value.valid;
  if (typeof valid !== 'boolean') return false;
  const discountType = value.discountType;
  if (discountType !== undefined && discountType !== 'percentage' && discountType !== 'fixed') return false;
  const discountValue = value.discountValue;
  if (discountValue !== undefined && typeof discountValue !== 'number') return false;
  return true;
}

function StepProgress({
  current,
  steps,
  ariaLabel,
}: {
  current: Step;
  steps: CheckoutStepContent[];
  ariaLabel: string;
}): JSX.Element {
  const currentIdx = steps.findIndex((s) => s.key === current);
  const renderStep = (step: CheckoutStepContent, index: number): JSX.Element => {
    const isDone = index < currentIdx;
    const isActive = step.key === current;
    const isCompleted = isDone || isActive;
    return (
      <div key={step.key} className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <div
            className='w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0'
            style={{
              background: isCompleted ? 'var(--fg)' : 'transparent',
              border: `1px solid ${isCompleted ? 'var(--fg)' : 'var(--border)'}`,
              color: isCompleted ? 'var(--bg)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {isDone ? (
              <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                <path d='M20 6L9 17l-5-5' />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          <span
            className='type-label hidden md:block'
            style={{ color: isActive ? 'var(--fg)' : 'var(--muted)' }}
          >
            {step.label}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div className='w-8 h-px' style={{ background: 'var(--border)' }} />
        )}
      </div>
    );
  };

  return <nav aria-label={ariaLabel} className='flex items-center gap-3'>{steps.map(renderStep)}</nav>;
}

// eslint-disable-next-line complexity
function FormInput({ field, value, error, onChange }: {
  field: CheckoutFieldContent;
  value: string;
  error?: string;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
  const hasError = isNonEmptyString(error);
  const hasMonospace = isTruthyBoolean(field.monospace);
  const isHalf = isTruthyBoolean(field.half);
  const inputType = field.type ?? 'text';
  const describedBy = hasError ? `${field.id}-error` : undefined;
  const label = field.id === 'phone'
    ? field.label.replace(/\s*\((optional|opcjonalnie)\)\s*$/i, '')
    : field.label;
  return (
    <div className={isHalf ? 'flex-1 min-w-0' : 'w-full'}>
      <label className='type-label block mb-1.5' style={{ color: 'var(--fg)' }}>
        {label}
      </label>
      <input
        type={inputType}
        id={field.id}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'transparent',
          border: `1px solid ${hasError ? 'var(--accent)' : 'var(--border)'}`,
          outline: 'none',
          fontFamily: hasMonospace ? 'var(--font-mono)' : 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 300,
          color: 'var(--fg)',
          letterSpacing: hasMonospace ? '0.08em' : undefined,
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(event) => {
          const target = event.currentTarget;
          target.style.borderColor = 'var(--fg)';
        }}
        onBlur={(event) => {
          const target = event.currentTarget;
          target.style.borderColor = hasError ? 'var(--accent)' : 'var(--border)';
        }}
      />
      {hasError && (
        <p id={describedBy} className='type-label mt-1.5' style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
function CountrySelect({
  field,
  value,
  error,
  locale,
  onChange,
}: {
  field: CheckoutFieldContent;
  value: string;
  error?: string;
  locale: EcomLocale;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
  const hasError = isNonEmptyString(error);
  const isHalf = isTruthyBoolean(field.half);
  const describedBy = hasError ? `${field.id}-error` : undefined;
  const hasValue = value !== '';
  return (
    <div className={isHalf ? 'flex-1 min-w-0' : 'w-full'}>
      <label className='type-label block mb-1.5' style={{ color: 'var(--fg)' }}>
        {field.label}
      </label>
      <select
        id={field.id}
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'var(--bg)',
          border: `1px solid ${hasError ? 'var(--accent)' : 'var(--border)'}`,
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 300,
          color: hasValue ? 'var(--fg)' : 'var(--muted)',
          transition: 'border-color 0.2s ease',
          appearance: 'none',
        }}
        onFocus={(event) => {
          const target = event.currentTarget;
          target.style.borderColor = 'var(--fg)';
        }}
        onBlur={(event) => {
          const target = event.currentTarget;
          target.style.borderColor = hasError ? 'var(--accent)' : 'var(--border)';
        }}
      >
        <option value=''>{locale === 'pl' ? 'Wybierz kraj' : 'Select country'}</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.name}>
            {locale === 'pl' ? country.namePl : country.name}
          </option>
        ))}
      </select>
      {hasError && (
        <p id={describedBy} className='type-label mt-1.5' style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function FieldRows({
  fields,
  values,
  errors,
  locale,
  onChange,
}: {
  fields: CheckoutFieldContent[];
  values: Partial<Record<string, string>>;
  errors: Record<string, string>;
  locale: EcomLocale;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
  const renderField = (field: CheckoutFieldContent): JSX.Element => (
    field.id === 'country'
      ? <CountrySelect field={field} value={values[field.id] ?? ''} error={errors[field.id]} locale={locale} onChange={onChange} />
      : <FormInput field={field} value={values[field.id] ?? ''} error={errors[field.id]} onChange={onChange} />
  );

  return (
    <>
      {fields.map((field, i) => {
        const prevField = i > 0 ? fields[i - 1] : null;
        const prevHalf = prevField !== null && isTruthyBoolean(prevField.half);
        const isHalf = isTruthyBoolean(field.half);
        const isFirstOfPair = isHalf && !prevHalf;
        const isSecondOfPair = isHalf && prevHalf;
        if (isFirstOfPair) {
          const nextIndex = i + 1;
          const hasNext = nextIndex < fields.length;
          return (
            <div key={field.id} className='flex gap-4'>
              {renderField(field)}
              {hasNext && renderField(fields[nextIndex])}
            </div>
          );
        }
        if (isSecondOfPair) return null;
        return <div key={field.id}>{renderField(field)}</div>;
      })}
    </>
  );
}

const INPOST_GEO_WIDGET_SCRIPT_ID = 'inpost-geowidget-script';
const INPOST_GEO_WIDGET_STYLE_ID = 'inpost-geowidget-style';

let inpostGeowidgetPromise: Promise<void> | null = null;

function ensureInpostGeowidgetAssets(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  if (!document.getElementById(INPOST_GEO_WIDGET_STYLE_ID)) {
    const link = document.createElement('link');
    link.id = INPOST_GEO_WIDGET_STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'https://geowidget.inpost.pl/inpost-geowidget.css';
    document.head.appendChild(link);
  }

  if (customElements.get('inpost-geowidget')) return Promise.resolve();
  if (inpostGeowidgetPromise) return inpostGeowidgetPromise;

  inpostGeowidgetPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(INPOST_GEO_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('InPost Geowidget failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = INPOST_GEO_WIDGET_SCRIPT_ID;
    script.src = 'https://geowidget.inpost.pl/inpost-geowidget.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('InPost Geowidget failed to load.'));
    document.body.appendChild(script);
  });

  return inpostGeowidgetPromise;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPointString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return isPlainRecord(value) ? value : {};
}

function normalizeGeowidgetPoint(value: unknown): InpostPoint | null {
  if (!isPlainRecord(value)) return null;

  const name = readPointString(value, 'name');
  if (name === '') return null;

  const address = readNestedRecord(value, 'address');
  const addressDetails = readNestedRecord(value, 'address_details');
  const location = readNestedRecord(value, 'location');
  const addressStreet = firstNonEmptyString([
    readPointString(addressDetails, 'street'),
    readPointString(addressDetails, 'building_number'),
  ]);
  const addressLine1 = firstNonEmptyString([
    readPointString(address, 'line1'),
    readPointString(value, 'address'),
    addressStreet,
  ]);
  const addressLine2 = readPointString(address, 'line2');

  return {
    id: name,
    name,
    description: toOptionalText(readPointString(value, 'description')),
    addressLine1: toOptionalText(addressLine1),
    addressLine2: toOptionalText(addressLine2),
    city: toOptionalText(readPointString(addressDetails, 'city')),
    postCode: toOptionalText(readPointString(addressDetails, 'post_code')),
    latitude: typeof location['latitude'] === 'number' ? location['latitude'] : undefined,
    longitude: typeof location['longitude'] === 'number' ? location['longitude'] : undefined,
  };
}


// eslint-disable-next-line max-lines-per-function, complexity
function InpostPointSelector({
  locale,
  point,
  error,
  onSelect,
}: {
  locale: EcomLocale;
  point: InpostPoint | null;
  error: string;
  onSelect: (point: InpostPoint | null) => void;
}): JSX.Element {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState('');
  const token = process.env.NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN?.trim() ?? '';
  const hasWidgetToken = Boolean(token);

  useEffect(() => {
    if (!hasWidgetToken || !widgetRef.current) return undefined;

    let active = true;
    const container = widgetRef.current;
    const eventName = 'onpointselect';
    const handleSelect = (event: Event): void => {
      const customEvent = event as CustomEvent<unknown>;
      const payload = customEvent.detail ?? (event as unknown as { details?: unknown }).details;
      const normalized = normalizeGeowidgetPoint(payload);
      if (normalized) onSelect(normalized);
    };

    setLoadError('');
    ensureInpostGeowidgetAssets()
      .then(() => {
        if (!active) return;
        const widget = document.createElement('inpost-geowidget');
        widget.setAttribute('token', token);
        widget.setAttribute('language', locale);
        widget.setAttribute('config', 'parcelCollect');
        widget.setAttribute('onpoint', eventName);
        widget.style.display = 'block';
        widget.style.minHeight = '420px';
        container.replaceChildren(widget);
        document.addEventListener(eventName, handleSelect);
        widget.addEventListener(eventName, handleSelect);
      })
      .catch(() => {
        if (active) setLoadError(locale === 'pl' ? 'Mapa InPost jest chwilowo niedostępna.' : 'InPost map is temporarily unavailable.');
      });

    return (): void => {
      active = false;
      document.removeEventListener(eventName, handleSelect);
      container.replaceChildren();
    };
  }, [hasWidgetToken, locale, onSelect, token]);

  const selectedAddress = [
    point?.addressLine1,
    point?.addressLine2,
    `${point?.postCode ?? ''} ${point?.city ?? ''}`.trim(),
  ].filter((value): value is string => value !== '').join(', ');

  return (
      <div
        className='mt-4 p-4'
        style={{
          border: `1px solid ${error !== '' ? 'var(--accent)' : 'var(--border)'}`,
          background: 'var(--surface)',
        }}
      >
      <div className='flex items-start justify-between gap-4 mb-3'>
        <div>
          <div className='type-label mb-1' style={{ color: 'var(--accent)' }}>
            {locale === 'pl' ? 'Paczkomat InPost' : 'InPost pickup point'}
          </div>
          <p className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            {locale === 'pl'
              ? 'Wybierz paczkomat dla tej przesyłki.'
              : 'Choose the parcel locker for this shipment.'}
          </p>
        </div>
        {point !== null && (
          <button
            type='button'
            className='type-label hover:text-[var(--fg)] transition-colors'
            style={{ color: 'var(--muted)', flexShrink: 0 }}
            onClick={() => onSelect(null)}
          >
            {locale === 'pl' ? 'Zmień' : 'Change'}
          </button>
        )}
      </div>

      {point && (
        <div className='mb-4 p-3' style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--fg)', letterSpacing: '0.08em' }}>
            {point.name}
          </div>
          {selectedAddress !== '' && (
            <div className='type-label mt-1' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              {selectedAddress}
            </div>
          )}
        </div>
      )}

      {hasWidgetToken ? (
        <>
        <div ref={widgetRef} style={{ minHeight: 420 }} />
          {loadError !== '' && (
            <p className='type-label mt-3' style={{ color: 'var(--accent)' }}>
              {loadError}
            </p>
          )}
        </>
      ) : (
        <div>
          <label className='type-label block mb-1.5' style={{ color: 'var(--fg)' }}>
            {locale === 'pl' ? 'Kod paczkomatu' : 'Parcel locker code'}
          </label>
          <input
            type='text'
            value={point?.name ?? ''}
            onChange={(event) => {
              const value = event.target.value.trim().toUpperCase();
              onSelect(value === '' ? null : { id: value, name: value });
            }}
            placeholder={locale === 'pl' ? 'np. WAW01A' : 'e.g. WAW01A'}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg)',
            border: `1px solid ${error !== '' ? 'var(--accent)' : 'var(--border)'}`,
            outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              color: 'var(--fg)',
              letterSpacing: '0.08em',
            }}
          />
          <p className='type-label mt-2' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            {locale === 'pl'
              ? 'Dodaj NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN, aby włączyć mapę wyboru.'
              : 'Set NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN to enable the map selector.'}
          </p>
        </div>
      )}

      {error !== '' && (
        <p className='type-label mt-3' style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      )}
    </div>
  );
}


// eslint-disable-next-line max-lines-per-function, complexity
function OrderSummary({
  content,
  displayItems,
  pricingRefreshPending,
  shippingPrice,
  subtotal,
  discount,
  total,
  freeShippingThreshold,
  freeShippingBannerLabel,
  promoCode,
  promoDiscountType,
  promoDiscountValue,
  onPromoCodeChange,
  customerEmail,
}: {
  content: CheckoutSummaryContent;
  displayItems: CartItem[];
  pricingRefreshPending: boolean;
  shippingPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingBannerLabel: string;
  promoCode: string | null;
  promoDiscountType: 'percentage' | 'fixed' | null;
  promoDiscountValue: number;
  customerEmail: string;
  onPromoCodeChange: (code: string | null, type: 'percentage' | 'fixed' | null, value: number) => void;
}): JSX.Element {
  const locale = useLocale();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const summaryCurrencyCode = firstCartCurrencyCode(displayItems);
  const freeShippingEnabled = freeShippingThreshold > 0;
  const freeShippingUnlocked = freeShippingEnabled && subtotal >= freeShippingThreshold;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingUnlockedMessage = locale === 'pl' ? 'Darmowa dostawa odblokowana!' : 'Free shipping unlocked!';
  const freeShippingMessage = freeShippingUnlocked
    ? freeShippingUnlockedMessage
    : freeShippingBannerLabel.replace('{amount}', formatPrice(freeShippingRemaining, locale, summaryCurrencyCode));
  const discountRate = promoDiscountType === 'percentage'
    ? Math.round(promoDiscountValue * 100)
    : 0;
  const discountLabelSuffix = promoDiscountType === 'fixed'
    ? formatPrice(Math.round(promoDiscountValue), locale, summaryCurrencyCode)
    : `${discountRate}%`;

  const applyPromo = async (): Promise<void> => {
    if (pricingRefreshPending) return;
    const normalizedCode = normalizePromoCode(promoInput);
    if (normalizedCode === '') return;
    setPromoApplying(true);
    try {
      const res = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode, subtotal, email: customerEmail }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      if (!isPromoValidateResponse(data)) {
        setPromoError(true);
        return;
      }
      if (data.valid) {
        const resolvedType = data.discountType ?? 'percentage';
        const resolvedValue = data.discountValue ?? 0;
        onPromoCodeChange(normalizedCode, resolvedType, resolvedValue);
        setPromoError(false);
        setPromoOpen(false);
      } else {
        setPromoError(true);
      }
    } catch {
      setPromoError(true);
    } finally {
      setPromoApplying(false);
    }
  };

  return (
    <div
      className='sticky top-24 p-8'
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 300,
          color: 'var(--fg)',
          marginBottom: '1.5rem',
        }}
      >
        {content.title}
      </h2>

      {/* Items */}
      <div className='space-y-4 mb-6'>
        {displayItems.length === 0 ? (
          <p className='type-label' style={{ color: 'var(--muted)' }}>{content.emptyBagLabel}</p>
        ) : (
          displayItems.map((item) => (
            <div key={`${item.productId}::${item.size}`} className='flex gap-3'>
              <div className='relative flex-shrink-0'>
                <div
                  className='w-14 h-16'
                  style={{ background: item.gradient }}
                />
                <span
                  className='absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center'
                  style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                >
                  {item.quantity}
                </span>
              </div>
              <div className='flex-1 min-w-0 flex justify-between gap-2'>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 300, color: 'var(--fg)' }}>
                    {item.name}
                  </p>
                  {item.size !== '' && (
                    <p className='type-label' style={{ color: 'var(--muted)' }}>{item.size}</p>
                  )}
                </div>
                <span className='type-price flex-shrink-0' style={{ color: 'var(--fg)' }}>
                  {formatPrice(item.price * item.quantity, locale, item.currencyCode)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Promo code */}
      <div className='mb-6' style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        {promoCode !== null ? (
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' style={{ color: '#4A7C5A' }}>
                <path d='M20 6L9 17l-5-5' />
              </svg>
              <span className='type-label' style={{ color: '#4A7C5A' }}>
                {promoCode} {content.promoAppliedSuffix}
              </span>
            </div>
            <button
              onClick={() => {
                onPromoCodeChange(null, null, 0);
                setPromoInput('');
              }}
              className='type-label hover:text-[var(--fg)] transition-colors'
              style={{ color: 'var(--muted)' }}
            >
              {content.removePromoLabel}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setPromoOpen(!promoOpen)}
              className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors'
              style={{ color: 'var(--muted)' }}
            >
              {content.promoToggleLabel}
              <svg
                width='11'
                height='11'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                style={{ transform: promoOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
              >
                <path d='M6 9l6 6 6-6' />
              </svg>
            </button>
            {promoOpen && (
              <div className='flex gap-2 mt-3'>
                <input
                  type='text'
                  value={promoInput}
                  onChange={(event) => {
                    setPromoInput(event.target.value);
                    setPromoError(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !pricingRefreshPending) {
                      void applyPromo();
                    }
                  }}
                  placeholder={content.promoPlaceholder}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.875rem',
                    background: 'transparent',
                    border: `1px solid ${promoError ? 'var(--accent)' : 'var(--border)'}`,
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg)',
                  }}
                />
                <button
                  onClick={() => {
                    void applyPromo();
                  }}
                  disabled={promoApplying || pricingRefreshPending}
                  className='type-label px-4 py-2 transition-colors hover:opacity-80 disabled:opacity-50'
                  style={{ background: 'var(--fg)', color: 'var(--bg)', flexShrink: 0 }}
                >
                  {promoApplying ? '…' : content.promoApplyLabel}
                </button>
              </div>
            )}
            {promoError && (
              <p className='type-label mt-1.5' style={{ color: 'var(--accent)' }}>
                {content.promoInvalidLabel}
              </p>
            )}
          </>
        )}
      </div>

      <div className='divider mb-4' />

      {/* Totals */}
      <div className='space-y-2 mb-4'>
        <div className='flex justify-between'>
          <span className='type-label' style={{ color: 'var(--muted)' }}>{content.subtotalLabel}</span>
          <span className='type-price' style={{ color: 'var(--fg)' }}>{formatPrice(subtotal, locale, summaryCurrencyCode)}</span>
        </div>
        {discount > 0 && (
          <div className='flex justify-between'>
            <span className='type-label' style={{ color: '#4A7C5A' }}>
              {content.discountLabel} ({discountLabelSuffix})
            </span>
            <span className='type-price' style={{ color: '#4A7C5A' }}>
              − {formatPrice(discount, locale, summaryCurrencyCode)}
            </span>
          </div>
        )}
        {freeShippingEnabled && (
          <div
            className='type-label'
            style={{
              color: freeShippingUnlocked ? '#4A7C5A' : 'var(--muted)',
              paddingTop: '0.25rem',
              lineHeight: 1.5,
            }}
          >
            {freeShippingMessage}
          </div>
        )}
        <div className='flex justify-between'>
          <span className='type-label' style={{ color: 'var(--muted)' }}>{content.shippingLabel}</span>
          <span className='type-price' style={{ color: shippingPrice === 0 ? '#4A7C5A' : 'var(--fg)' }}>
            {shippingPrice === 0 ? content.freeLabel : formatPrice(shippingPrice, locale, summaryCurrencyCode)}
          </span>
        </div>
      </div>

      <div className='divider mb-4' />

      <div className='flex justify-between items-center'>
        <span
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--fg)' }}
        >
          {content.totalLabel}
        </span>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--fg)' }}
        >
          {formatPrice(total, locale, summaryCurrencyCode)}
        </span>
      </div>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export function CheckoutPageClient({ content }: { content: CheckoutContent }): JSX.Element {
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const [step, setStep] = useState<Step>('information');
  const [shipping, setShipping] = useState(content.shippingMethods[0]?.id ?? 'standard');
  const [form, setForm] = useState<Partial<Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscountType, setPromoDiscountType] = useState<'percentage' | 'fixed' | null>(null);
  const [promoDiscountValue, setPromoDiscountValue] = useState(0);
  const handlePromoCodeChange = useCallback((code: string | null, type: 'percentage' | 'fixed' | null, value: number) => {
    setPromoCode(code);
    setPromoDiscountType(type);
    setPromoDiscountValue(Math.max(0, value));
  }, []);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState('');
  const [blikCode, setBlikCode] = useState('');
  const [blikError, setBlikError] = useState('');
  const [blikPending, setBlikPending] = useState(false);
  const [blikPendingOrderId, setBlikPendingOrderId] = useState('');
  const [blikSecondsLeft, setBlikSecondsLeft] = useState(0);
  const [inpostPoint, setInpostPoint] = useState<InpostPoint | null>(null);
  const [inpostPointError, setInpostPointError] = useState('');
  const [freshCartProducts, setFreshCartProducts] = useState<Partial<Record<string, FreshCartProduct>>>({});
  const [cartRefreshPending, setCartRefreshPending] = useState(false);

  const idKey = items.map((item) => item.productId).join(',');
  useEffect(() => {
    if (idKey.length === 0) {
      setFreshCartProducts({});
      setCartRefreshPending(false);
      return undefined;
    }

    let active = true;
    const loadProducts = async (): Promise<void> => {
      setCartRefreshPending(true);
      try {
        const response = await fetch(`/api/products?ids=${encodeURIComponent(idKey)}&locale=${locale}`);
        const data = (await response.json()) as unknown;
        const next = readFreshCartProductsResponse(data);
        if (active) setFreshCartProducts(next);
      } catch {
        if (active) setFreshCartProducts({});
      } finally {
        if (active) setCartRefreshPending(false);
      }
    };

    void loadProducts();
    return () => {
      active = false;
    };
  }, [idKey, locale]);

  const checkoutItems = useMemo(
    () => items.map((item) => mergeFreshCartItem(item, freshCartProducts[item.productId])),
    [freshCartProducts, items]
  );
  const checkoutCurrencyCode = firstCartCurrencyCode(checkoutItems);
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const zoneMethods = useMemo(() => {
    const shippingCountry = form.country ?? '';
    const zone = getZoneForCountry(content.shippingZones, shippingCountry);
    const rawMethods = zone !== null
      ? zone.methods
      : content.shippingMethods;
    const countryMethods = filterShippingMethodsForCountry(rawMethods, shippingCountry);
    return applyFreeThreshold(
      countryMethods,
      subtotal,
      content.freeShippingThreshold,
      content.freeShippingMethodId,
    );
  }, [
    content.freeShippingMethodId,
    content.freeShippingThreshold,
    content.shippingMethods,
    content.shippingZones,
    form.country,
    subtotal,
  ]);
  const defaultShipping: CheckoutShippingMethodContent = {
    id: 'standard',
    label: 'Standard',
    detail: '',
    price: 0,
    priceLabel: 'Free',
    businessDaysMin: 3,
    businessDaysMax: 5,
  };
  const selectedShipping: CheckoutShippingMethodContent = (() => {
    const method = zoneMethods.find((methodCandidate) => methodCandidate.id === shipping);
    if (method !== undefined) {
      return method;
    }
    return zoneMethods.length > 0 ? zoneMethods[0] : defaultShipping;
  })();
  const isInpostShippingCountry = isPolandShippingCountry(form.country ?? '');
  const requiresInpostPoint = isInpostShippingCountry
    && selectedShipping.carrier === 'inpost'
    && Boolean(selectedShipping.requiresPickupPoint);
  const discount = calculatePromoDiscount(subtotal, promoDiscountType, promoDiscountValue);
  const total = subtotal - discount + selectedShipping.price;
  const requiredMessage = locale === 'pl' ? 'To pole jest wymagane.' : 'This field is required.';
  const invalidEmailMessage = locale === 'pl' ? 'Wpisz poprawny adres email.' : 'Enter a valid email address.';
  const estimatedDeliveryLabel = locale === 'pl' ? 'Szacowana dostawa:' : 'Estimated:';
  const blikLabel = locale === 'pl' ? 'Kod BLIK' : 'BLIK code';
  const blikPlaceholder = '000000';
  const blikHint = locale === 'pl'
    ? 'Wygeneruj 6-cyfrowy kod w swojej aplikacji bankowej.'
    : 'Generate a 6-digit code in your banking app.';
  const blikPendingTitle = locale === 'pl' ? 'Potwierdź płatność' : 'Confirm payment';
  const blikPendingBody = locale === 'pl'
    ? 'Otwórz aplikację bankową i zatwierdź płatność BLIK. Czekamy na potwierdzenie…'
    : 'Open your banking app and approve the BLIK payment. Waiting for confirmation…';
  const blikInvalidMessage = locale === 'pl' ? 'Wpisz poprawny 6-cyfrowy kod BLIK.' : 'Enter a valid 6-digit BLIK code.';
  const inpostPointRequiredMessage = locale === 'pl' ? 'Wybierz paczkomat InPost.' : 'Choose an InPost pickup point.';

  useEffect(() => {
    if (zoneMethods.some((method) => method.id === shipping)) return;
    const firstMethodId = zoneMethods.at(0)?.id ?? 'standard';
    setShipping(firstMethodId);
  }, [shipping, zoneMethods]);

  useEffect(() => {
    if (requiresInpostPoint) return;
    setInpostPoint(null);
    setInpostPointError('');
  }, [requiresInpostPoint]);

  // Pre-fill contact info from the logged-in user's session
  useEffect(() => {
    if (!user) return;
    const nameParts = user.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');
    setForm((f) => ({
      ...f,
      email: f.email !== '' ? f.email : user.email,
      firstName: f.firstName !== '' ? f.firstName : firstName,
      lastName: f.lastName !== '' ? f.lastName : lastName,
    }));
  }, [user]);

  const setField = (id: string, v: string): void => {
    setForm((f) => ({ ...f, [id]: v }));
    setErrors((current) => {
      if (current[id] === '') return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleInpostPointSelect = useCallback((point: InpostPoint | null) => {
    setInpostPoint(point);
    if (point) setInpostPointError('');
  }, []);

  const validateInformationForm = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const requiredFields = ['email', 'firstName', 'lastName', 'address', 'city', 'postcode', 'country', 'phone'];

    for (const field of requiredFields) {
      const fieldValue = form[field] ?? '';
      if (fieldValue.trim() === '') nextErrors[field] = requiredMessage;
    }
    const emailValue = form.email ?? '';
    if (emailValue.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      nextErrors.email = invalidEmailMessage;
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateShippingStep = (): boolean => {
    if (requiresInpostPoint && inpostPoint === null) {
      setInpostPointError(inpostPointRequiredMessage);
      return false;
    }
    setInpostPointError('');
    return true;
  };

  // eslint-disable-next-line complexity
  const handlePlaceOrder = async (): Promise<void> => {
    if (checkoutItems.length === 0 || placingOrder || cartRefreshPending) return;
    if (!validateInformationForm()) {
      setStep('information');
      return;
    }
    if (!validateShippingStep()) {
      setStep('shipping');
      return;
    }

    if (!/^\d{6}$/.test(blikCode)) {
      setBlikError(blikInvalidMessage);
      return;
    }

    setBlikError('');
    setPlacingOrder(true);
    try {
      const res = await fetch('/api/checkout/blik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email ?? '',
          items: checkoutItems,
          shippingMethod: selectedShipping.label,
          shippingMethodId: selectedShipping.id,
          shippingPrice: selectedShipping.price,
          shippingCarrier: selectedShipping.carrier ?? 'manual',
          shippingService: selectedShipping.service ?? selectedShipping.id,
          inpostPoint: requiresInpostPoint ? inpostPoint ?? undefined : undefined,
          shippingAddress: { ...form },
          subtotal,
          discount,
          promoCode: promoCode ?? undefined,
          total,
          blikCode,
        }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      const orderId = isPlainRecord(data) && typeof data.orderId === 'string' ? data.orderId : '';
      const orderError = isPlainRecord(data) && typeof data.error === 'string' ? data.error : '';

      const orderFailedMessage = locale === 'pl'
        ? 'Błąd płatności. Spróbuj ponownie.'
        : 'Payment failed. Please try again.';
      if (!res.ok || orderId === '') {
        setBlikError(orderError !== ''
          ? orderError
          : orderFailedMessage);
        return;
      }

      setConfirmedOrderId(orderId);
      setBlikPendingOrderId(orderId);
      setBlikSecondsLeft(120);
      setBlikPending(true);
    } catch {
      toast({ type: 'error', title: 'Order failed', message: 'Please try again.' });
    } finally {
      setPlacingOrder(false);
    }
  };

  // Poll for BLIK payment confirmation after the push notification is sent.
  useEffect(() => {
    if (!blikPending || blikPendingOrderId === '') return undefined;

    let active = true;

    // Countdown ticker (visual only — real timeout drives state)
    const tickId = setInterval(() => {
      setBlikSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    const timeoutId = setTimeout(() => {
      if (!active) return;
      clearInterval(tickId);
      setBlikPending(false);
      setBlikSecondsLeft(0);
      setBlikError(locale === 'pl' ? 'Czas oczekiwania na potwierdzenie minął. Spróbuj ponownie.' : 'BLIK confirmation timed out. Please try again.');
    }, 2 * 60 * 1000);

    const intervalId = setInterval(() => {
      if (!active) return;
      const checkStatus = async (): Promise<void> => {
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(blikPendingOrderId)}/status`);
          const data = (await res.json().catch(() => undefined)) as unknown;
          const status = isPlainRecord(data) ? data.status : undefined;
          if (status !== 'processing' && status !== 'cancelled') return;
          if (!active) return;
          clearInterval(intervalId);
          clearInterval(tickId);
          clearTimeout(timeoutId);
          setBlikPending(false);
          if (status === 'processing') {
            setStep('confirmation');
            clearCart();
            toast({ type: 'success', title: content.orderPlacedToastTitle, message: blikPendingOrderId });
          } else {
            setBlikSecondsLeft(0);
            setBlikError(locale === 'pl' ? 'Płatność BLIK odrzucona.' : 'BLIK payment was declined.');
          }
        } catch {
          // Transient error — keep polling
        }
      };

      void checkStatus();
    }, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
      clearInterval(tickId);
      clearTimeout(timeoutId);
    };
  }, [blikPending, blikPendingOrderId, clearCart, content.orderPlacedToastTitle, locale, toast]);

  if (step === 'confirmation') {
    const orderQuery = confirmedOrderId !== '' ? `&order=${encodeURIComponent(confirmedOrderId)}` : '';
    const trackOrderHref = user === null
      ? `/order-status?order=${encodeURIComponent(confirmedOrderId)}`
      : `/account?tab=orders${orderQuery}`;
    return (
      <>
        <SiteNav />
        <main
          className='min-h-screen flex flex-col items-center justify-center px-8 text-center'
          style={{ paddingTop: 'var(--nav-h)' }}
        >
          <div
            className='w-16 h-16 rounded-full flex items-center justify-center mb-8'
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M20 6L9 17l-5-5' />
            </svg>
          </div>
          <h1
            className='type-display-lg mb-4'
            style={{ color: 'var(--fg)' }}
          >
            {content.confirmationTitle}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--muted)',
              maxWidth: '400px',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
            }}
          >
            {content.confirmationBodyPrefix}{' '}
          <strong style={{ color: 'var(--fg)' }}>{(form.email ?? '') !== '' ? form.email : content.confirmationEmailFallback}</strong>
            {content.confirmationBodySuffix}
          </p>
          {confirmedOrderId !== '' && (
            <p className='type-label mb-8' style={{ color: 'var(--accent)' }}>
              {confirmedOrderId}
            </p>
          )}
          <div className='flex gap-3'>
            <a href={localizedHref(content.continueShoppingHref)} className='btn-primary'>{content.continueShoppingLabel}</a>
            <a href={localizedHref(trackOrderHref)} className='btn-ghost'>{content.trackOrderLabel}</a>
          </div>

          {/* Manifesto quote */}
          <p
            className='mt-20'
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 300,
              color: 'var(--muted)',
              fontStyle: 'italic',
            }}
          >
            {content.confirmationQuote}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Header bar */}
        <div
          className='px-8 md:px-16 py-5 flex items-center justify-between'
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <a
            href={localizedHref('/')}
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.25em', color: 'var(--fg)' }}
          >
            {content.brandText}
          </a>
          <StepProgress current={step} steps={content.steps} ariaLabel={content.stepAriaLabel} />
          <div /> {/* spacer */}
        </div>

        {/* Two-column layout */}
        <div className='grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_440px] min-h-[calc(100vh-var(--nav-h)-64px)]'>
          {/* Form column */}
          <div className='px-8 md:px-16 py-12' style={{ borderRight: '1px solid var(--border)' }}>
            {/* ── Step: Information ─── */}
            {step === 'information' && (
              <div>
                <h2 className='type-display-md mb-8' style={{ color: 'var(--fg)' }}>
                  {content.informationTitle}
                </h2>
                <div className='space-y-4'>
            <FieldRows fields={content.informationFields} values={form} errors={errors} locale={locale} onChange={setField} />
                </div>

                <div className='flex items-center justify-between mt-10'>
                  <a href={localizedHref(content.returnToBagHref)} className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors' style={{ color: 'var(--muted)' }}>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M19 12H5M12 5l-7 7 7 7' />
                    </svg>
                    {content.returnToBagLabel}
                  </a>
                  <button
                    className='btn-primary'
                    onClick={() => {
                      if (validateInformationForm()) setStep('shipping');
                    }}
                  >
                    {content.continueToShippingLabel}
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M5 12h14M12 5l7 7-7 7' />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Shipping ─── */}
            {step === 'shipping' && (
              <div>
                <h2 className='type-display-md mb-8' style={{ color: 'var(--fg)' }}>
                  {content.shippingTitle}
                </h2>

                {/* Delivery address recap */}
                <div
                  className='p-4 mb-8 flex justify-between items-start gap-4'
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <div className='type-label mb-0.5' style={{ color: 'var(--muted)' }}>{content.deliveryRecapLabel}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--fg)' }}>
                      {form.address !== undefined && form.address !== '' ? form.address : content.deliveryAddressFallback},
                      {` ${form.city !== undefined && form.city !== '' ? form.city : content.deliveryAddressFallback}`}
                      {` ${form.postcode !== undefined && form.postcode !== '' ? form.postcode : content.deliveryAddressFallback}`}
                      , {form.country !== undefined && form.country !== '' ? form.country : content.deliveryAddressFallback}
                    </div>
                  </div>
                  <button
                    className='type-label hover:text-[var(--fg)] transition-colors'
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                    onClick={() => setStep('information')}
                  >
                    {content.changeLabel}
                  </button>
                </div>

                {/* Shipping options */}
                <div className='space-y-3 mb-10'>
                  {zoneMethods.map((method) => (
                    <label
                      key={method.id}
                      className='flex items-center gap-4 p-4 cursor-pointer transition-colors'
                      style={{
                        border: `1px solid ${shipping === method.id ? 'var(--fg)' : 'var(--border)'}`,
                        background: shipping === method.id ? 'var(--surface)' : 'transparent',
                      }}
                    >
                      <input
                        type='radio'
                        name='shipping'
                        value={method.id}
                        checked={shipping === method.id}
                        onChange={() => {
                          setShipping(method.id);
                          if (method.carrier !== 'inpost') setInpostPointError('');
                        }}
                        className='sr-only'
                      />
                      <div
                        className='w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0'
                        style={{ borderColor: shipping === method.id ? 'var(--fg)' : 'var(--border)' }}
                      >
                        {shipping === method.id && (
                          <div className='w-2 h-2 rounded-full' style={{ background: 'var(--fg)' }} />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--fg)' }}>
                          {method.label}
                        </div>
                        <div className='type-label' style={{ color: 'var(--muted)' }}>{method.detail}</div>
                        <div className='type-label' style={{ color: 'var(--accent)', marginTop: '0.3rem' }}>
                          {estimatedDeliveryLabel} {calcDeliveryRange(method.businessDaysMin, method.businessDaysMax, locale)}
                        </div>
                      </div>
                      <span className='type-price' style={{ color: method.price === 0 ? '#4A7C5A' : 'var(--fg)' }}>
                        {method.price === 0
                          ? content.orderSummary.freeLabel
                          : formatPrice(method.price, locale, checkoutCurrencyCode)}
                      </span>
                    </label>
                  ))}
                  {requiresInpostPoint && (
                    <InpostPointSelector
                      locale={locale}
                      point={inpostPoint}
                      error={inpostPointError}
                      onSelect={handleInpostPointSelect}
                    />
                  )}
                </div>

                <div className='flex items-center justify-between'>
                  <button
                    className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors'
                    style={{ color: 'var(--muted)' }}
                    onClick={() => setStep('information')}
                  >
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M19 12H5M12 5l-7 7 7 7' />
                    </svg>
                    {content.backLabel}
                  </button>
                  <button
                    className='btn-primary'
                    onClick={() => {
                      if (validateShippingStep()) setStep('payment');
                    }}
                  >
                    {content.continueToPaymentLabel}
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M5 12h14M12 5l7 7-7 7' />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Payment ─── */}
            {step === 'payment' && (
              <div>
                <h2 className='type-display-md mb-8' style={{ color: 'var(--fg)' }}>
                  {content.paymentTitle}
                </h2>

                {/* Security note */}
                <div
                  className='flex items-center gap-3 p-4 mb-8'
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{ color: '#4A7C5A', flexShrink: 0 }}>
                    <rect x='3' y='11' width='18' height='11' rx='2' />
                    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                  </svg>
                  <span className='type-label' style={{ color: 'var(--muted)' }}>
                    {content.securityNote}
                  </span>
                </div>

                {blikPending ? (
                  /* ── BLIK pending: customer is confirming in banking app ── */
                  <div className='flex flex-col items-center text-center py-8 gap-6'>
                    <svg
                      className='animate-spin'
                      width='36'
                      height='36'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      style={{ color: 'var(--fg)' }}
                    >
                      <path d='M12 3a9 9 0 1 1-9 9' />
                    </svg>
                    <div>
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.1rem',
                          fontWeight: 300,
                          color: 'var(--fg)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {blikPendingTitle}
                      </p>
                      <p className='type-label' style={{ color: 'var(--muted)', maxWidth: '320px' }}>
                        {blikPendingBody}
                      </p>
                      {blikSecondsLeft > 0 && (
                        <p
                          className='type-label mt-3'
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
                        >
                          {String(Math.floor(blikSecondsLeft / 60)).padStart(2, '0')}
                          :{String(blikSecondsLeft % 60).padStart(2, '0')}
                        </p>
                      )}
                    </div>
                    <button
                      className='type-label hover:text-[var(--fg)] transition-colors'
                      style={{ color: 'var(--muted)' }}
                      onClick={() => {
                        setBlikPending(false);
                        setBlikSecondsLeft(0);
                        setBlikCode('');
                        setBlikError('');
                      }}
                    >
                      {locale === 'pl' ? 'Anuluj i spróbuj ponownie' : 'Cancel and try again'}
                    </button>
                  </div>
                ) : (
                  /* ── BLIK code input ── */
                  <div>
                    {/* BLIK logo badge */}
                    <div className='flex items-center gap-3 mb-6'>
                      <div
                        className='flex items-center justify-center px-3 py-1'
                        style={{
                          background: 'var(--fg)',
                          color: 'var(--bg)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.7rem',
                          letterSpacing: '0.15em',
                          fontWeight: 600,
                        }}
                      >
                        BLIK
                      </div>
                      <span className='type-label' style={{ color: 'var(--muted)' }}>
                        {locale === 'pl' ? 'Płatność mobilna' : 'Mobile payment'}
                      </span>
                    </div>

                    <div className='mb-2'>
                      <label
                        htmlFor='blik-code'
                        className='type-label block mb-1.5'
                        style={{ color: 'var(--fg)' }}
                      >
                        {blikLabel}
                      </label>
                      <input
                        id='blik-code'
                        type='text'
                        inputMode='numeric'
                        pattern='\d{6}'
                        maxLength={6}
                        value={blikCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setBlikCode(digits);
                          if (blikError !== '') {
                            setBlikError('');
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handlePlaceOrder(); }}
                        placeholder={blikPlaceholder}
                        autoComplete='one-time-code'
                        aria-invalid={blikError !== ''}
                        aria-describedby={blikError !== '' ? 'blik-error' : 'blik-hint'}
                        style={{
                          width: '100%',
                          padding: '1rem 1.25rem',
                          background: 'transparent',
                          border: `1px solid ${blikError !== '' ? 'var(--accent)' : 'var(--border)'}`,
                          outline: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.75rem',
                          letterSpacing: '0.4em',
                          color: 'var(--fg)',
                          textAlign: 'center',
                          transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(event) => {
                          const target = event.currentTarget;
                          target.style.borderColor = 'var(--fg)';
                        }}
                        onBlur={(event) => {
                          const target = event.currentTarget;
                          target.style.borderColor = blikError !== '' ? 'var(--accent)' : 'var(--border)';
                        }}
                      />
                      {blikError !== '' ? (
                        <p id='blik-error' className='type-label mt-1.5' style={{ color: 'var(--accent)' }}>
                          {blikError}
                        </p>
                      ) : (
                        <p id='blik-hint' className='type-label mt-1.5' style={{ color: 'var(--muted)' }}>
                          {blikHint}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className='flex items-center justify-between mt-10'>
                  <button
                    className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors'
                    style={{ color: 'var(--muted)' }}
                    onClick={() => { if (!blikPending) setStep('shipping'); }}
                    disabled={blikPending}
                  >
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M19 12H5M12 5l-7 7 7 7' />
                    </svg>
                    {content.backLabel}
                  </button>
                  {!blikPending && (
                    <button
                      className='btn-primary'
                      onClick={() => {
                        void handlePlaceOrder();
                      }}
                      disabled={checkoutItems.length === 0 || placingOrder || cartRefreshPending}
                      style={{ opacity: checkoutItems.length === 0 || placingOrder || cartRefreshPending ? 0.5 : 1 }}
                    >
                      {placingOrder && (
                        <svg className='animate-spin' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M12 3a9 9 0 1 1-9 9' />
                        </svg>
                      )}
                      {checkoutItems.length === 0 ? content.addItemsFirstLabel : content.placeOrderLabel}
                      {checkoutItems.length > 0 && !placingOrder ? (
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M5 12h14M12 5l7 7-7 7' />
                        </svg>
                      ) : null}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order summary column */}
          <div className='px-8 md:px-10 py-12' style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
            <OrderSummary
              content={content.orderSummary}
              displayItems={checkoutItems}
              pricingRefreshPending={cartRefreshPending}
              shippingPrice={selectedShipping.price}
              subtotal={subtotal}
              discount={discount}
              total={total}
              freeShippingThreshold={content.freeShippingThreshold}
              freeShippingBannerLabel={content.freeShippingBannerLabel}
              promoCode={promoCode}
              promoDiscountType={promoDiscountType}
              promoDiscountValue={promoDiscountValue}
              customerEmail={form.email ?? ''}
              onPromoCodeChange={handlePromoCodeChange}
            />
          </div>
        </div>
      </main>
    </>
  );
}
