'use client';

/* eslint-disable max-lines */

import { useState, useEffect, useMemo, useCallback, useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { normalizeInpostPointCode } from '@/lib/inpost-point-code';
import { defaultCurrencyForLocale, formatPrice } from '@/lib/locales';
import {
  applyFreeThreshold,
  calcDeliveryRange,
  filterShippingMethodsForCountry,
  filterShippingMethodsForProviderAvailability,
  getZoneForCountry,
  isPolandShippingCountry,
  type ShippingProviderAvailability,
} from '@/lib/shipping';
import { SiteNav } from '@/components/SiteNav';
import { ProductImage } from '@/components/ProductImage';
import { COUNTRIES } from '@/data/countries';
import {
  normalizeGeowidgetEventPoint,
  normalizeGeowidgetPoint,
  readGeowidgetPointSelectedRegistrar,
} from './inpost-geowidget';
import { buildCheckoutInfoSchema } from './checkout-schema';
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
type PaymentProviderAvailability = {
  payu?: boolean;
  stripe?: boolean;
  paypal?: boolean;
  bankTransfer?: boolean;
};

type BankTransferPublicSettings = {
  enabled: boolean;
  accountName: string;
  iban: string;
  bic: string;
  bankName: string;
};

type StripePublicSettings = {
  enabled: boolean;
  publishableKey: string;
};

type PayPalPublicSettings = {
  enabled: boolean;
  clientId: string;
  mode: 'sandbox' | 'live';
};

type ActivePaymentMethod = 'blik' | 'stripe' | 'paypal' | 'bank_transfer';

const roundMoneyAmount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const calculatePromoDiscount = (
  subtotal: number,
  promoDiscountType: 'percentage' | 'fixed' | null,
  promoDiscountValue: number
): number => {
  if (promoDiscountType === 'fixed') {
    return roundMoneyAmount(Math.min(subtotal, roundMoneyAmount(promoDiscountValue)));
  }
  if (promoDiscountType === 'percentage') {
    return roundMoneyAmount(subtotal * promoDiscountValue);
  }
  return 0;
};

const normalizePromoCode = (value: string): string => value.replace(/\s+/g, '').trim().toUpperCase();

const isNonEmptyString = (value: string | null | undefined): value is string => value !== null && value !== undefined && value !== '';
const isTruthyBoolean = (value: boolean | null | undefined): value is true => value === true;

const toOptionalText = (value: string): string | undefined => (value === '' ? undefined : value);
const firstCartCurrencyCode = (items: CartItem[], locale: EcomLocale): string =>
  items.find((item) => (item.currencyCode ?? '').trim() !== '')?.currencyCode ?? defaultCurrencyForLocale(locale);
const freshText = (next: string, current: string): string => (next === '' ? current : next);
const freshPrice = (next: number, current: number): number => (next === 0 ? current : next);
const prefillText = (current: string | undefined, fallback: string): string =>
  current !== undefined && current.trim() !== '' ? current : fallback;
const initialCheckoutForm = (locale: EcomLocale): Partial<Record<string, string>> =>
  locale === 'pl' ? { country: 'Poland' } : {};

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

const getFormInputStyle = (hasError: boolean, hasMonospace: boolean): React.CSSProperties => ({
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
});

const FormLabel = ({
  label,
  isPhone,
  optionalSuffix,
}: {
  label: string;
  isPhone: boolean;
  optionalSuffix: string;
}): JSX.Element => (
  <label className='type-label block mb-1.5' style={{ color: 'var(--fg)' }}>
    {label}
    {isPhone && (
      <span style={{ color: 'var(--muted)', fontWeight: 300, marginLeft: '0.4em' }}>
        ({optionalSuffix})
      </span>
    )}
  </label>
);

function FormInput({ field, value, error, onChange, locale }: {
  field: CheckoutFieldContent;
  value: string;
  error?: string;
  onChange: (id: string, v: string) => void;
  locale?: EcomLocale;
}): JSX.Element {
  const hasError = isNonEmptyString(error);
  const hasMonospace = isTruthyBoolean(field.monospace);
  const isHalf = isTruthyBoolean(field.half);
  const inputType = field.type ?? 'text';
  const describedBy = hasError ? `${field.id}-error` : undefined;
  const isPhone = field.id === 'phone';
  const label = isPhone
    ? field.label.replace(/\s*\((optional|opcjonalnie)\)\s*$/i, '')
    : field.label;
  const optionalSuffix = locale === 'pl' ? 'opcjonalnie' : 'optional';
  return (
    <div className={isTruthyBoolean(field.half) ? 'flex-1 min-w-0' : 'w-full'}>
      <FormLabel label={label} isPhone={isPhone} optionalSuffix={optionalSuffix} />
      <input
        type={field.type ?? 'text'}
        id={field.id}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        style={getFormInputStyle(hasError, isTruthyBoolean(field.monospace))}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = 'var(--fg)';
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = hasError ? 'var(--accent)' : 'var(--border)';
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
  const optionalSuffix = locale === 'pl' ? 'opcjonalnie' : 'optional';
  return (
    <div className={isHalf ? 'flex-1 min-w-0' : 'w-full'}>
      <FormLabel label={field.label} isPhone={false} optionalSuffix={optionalSuffix} />
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
      : <FormInput field={field} value={values[field.id] ?? ''} error={errors[field.id]} onChange={onChange} locale={locale} />
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
const SUCCESSFUL_PAYMENT_STATUSES = new Set(['processing', 'in-transit', 'delivered']);

function isSuccessfulPaymentStatus(value: unknown): boolean {
  return typeof value === 'string' && SUCCESSFUL_PAYMENT_STATUSES.has(value);
}

function isFinishedPaymentStatus(value: unknown): boolean {
  return isSuccessfulPaymentStatus(value) || value === 'cancelled';
}

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
    script.onerror = () => {
      inpostGeowidgetPromise = null;
      reject(new Error('InPost Geowidget failed to load.'));
    };
    document.body.appendChild(script);
  });

  return inpostGeowidgetPromise;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fallbackInpostGeowidgetToken(): string {
  return process.env['NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN']?.trim() ?? '';
}

function readPublicInpostGeowidgetToken(data: unknown): string {
  if (!isPlainRecord(data)) return '';
  const shipping = data['shipping'];
  if (!isPlainRecord(shipping)) return '';
  const inpost = shipping['inpost'];
  if (!isPlainRecord(inpost)) return '';
  if (inpost['enabled'] === false) return '';
  const token = inpost['geowidgetToken'];
  return typeof token === 'string' ? token.trim() : '';
}

function readProviderEnabled(shipping: Record<string, unknown>, key: string): boolean | undefined {
  const provider = shipping[key];
  if (!isPlainRecord(provider)) return undefined;
  const enabled = provider['enabled'];
  return typeof enabled === 'boolean' ? enabled : undefined;
}

function readPublicShippingProviderAvailability(data: unknown): ShippingProviderAvailability {
  if (!isPlainRecord(data)) return {};
  const shipping = data['shipping'];
  if (!isPlainRecord(shipping)) return {};
  return {
    dpd: readProviderEnabled(shipping, 'dpd'),
    inpost: readProviderEnabled(shipping, 'inpost'),
    poczta_polska: readProviderEnabled(shipping, 'pocztaPolska'),
  };
}

function readPaymentProviderBool(payment: Record<string, unknown>, key: string): boolean | undefined {
  const provider = payment[key];
  if (!isPlainRecord(provider)) return undefined;
  const enabled = provider['enabled'];
  return typeof enabled === 'boolean' ? enabled : undefined;
}

function readPublicPaymentProviderAvailability(data: unknown): PaymentProviderAvailability {
  if (!isPlainRecord(data)) return {};
  const payment = data['payment'];
  if (!isPlainRecord(payment)) return {};
  return {
    payu: readPaymentProviderBool(payment, 'payu'),
    stripe: readPaymentProviderBool(payment, 'stripe'),
    paypal: readPaymentProviderBool(payment, 'paypal'),
    bankTransfer: readPaymentProviderBool(payment, 'bankTransfer'),
  };
}

function readPublicBankTransferSettings(data: unknown): BankTransferPublicSettings {
  const empty: BankTransferPublicSettings = { enabled: false, accountName: '', iban: '', bic: '', bankName: '' };
  if (!isPlainRecord(data)) return empty;
  const payment = data['payment'];
  if (!isPlainRecord(payment)) return empty;
  const bt = payment['bankTransfer'];
  if (!isPlainRecord(bt)) return empty;
  return {
    enabled: bt['enabled'] === true,
    accountName: typeof bt['accountName'] === 'string' ? bt['accountName'] : '',
    iban: typeof bt['iban'] === 'string' ? bt['iban'] : '',
    bic: typeof bt['bic'] === 'string' ? bt['bic'] : '',
    bankName: typeof bt['bankName'] === 'string' ? bt['bankName'] : '',
  };
}

function readPublicStripeSettings(data: unknown): StripePublicSettings {
  if (!isPlainRecord(data)) return { enabled: false, publishableKey: '' };
  const payment = data['payment'];
  if (!isPlainRecord(payment)) return { enabled: false, publishableKey: '' };
  const stripe = payment['stripe'];
  if (!isPlainRecord(stripe)) return { enabled: false, publishableKey: '' };
  return {
    enabled: stripe['enabled'] === true,
    publishableKey: typeof stripe['publishableKey'] === 'string' ? stripe['publishableKey'] : '',
  };
}

function readPublicPayPalSettings(data: unknown): PayPalPublicSettings {
  if (!isPlainRecord(data)) return { enabled: false, clientId: '', mode: 'sandbox' };
  const payment = data['payment'];
  if (!isPlainRecord(payment)) return { enabled: false, clientId: '', mode: 'sandbox' };
  const paypal = payment['paypal'];
  if (!isPlainRecord(paypal)) return { enabled: false, clientId: '', mode: 'sandbox' };
  return {
    enabled: paypal['enabled'] === true,
    clientId: typeof paypal['clientId'] === 'string' ? paypal['clientId'] : '',
    mode: paypal['mode'] === 'live' ? 'live' : 'sandbox',
  };
}

function ManualInpostPointInput({
  locale,
  value,
  error,
  invalid,
  onChange,
}: {
  locale: EcomLocale;
  value: string;
  error: string;
  invalid: boolean;
  onChange: (value: string) => void;
}): JSX.Element {
  const inputId = 'inpost-locker-code';
  const hintId = `${inputId}-hint`;
  const hasError = error !== '' || invalid;

  return (
    <div>
      <label className='type-label block mb-1.5' style={{ color: 'var(--fg)' }} htmlFor={inputId}>
        {locale === 'pl' ? 'Kod paczkomatu' : 'Parcel locker code'}
      </label>
      <input
        id={inputId}
        type='text'
        value={value}
        onChange={(event) => {
          onChange(event.target.value.toUpperCase());
        }}
        placeholder={locale === 'pl' ? 'np. WAW01A' : 'e.g. WAW01A'}
        aria-invalid={hasError}
        aria-describedby={hintId}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'var(--bg)',
          border: `1px solid ${hasError ? 'var(--accent)' : 'var(--border)'}`,
          outline: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          color: 'var(--fg)',
          letterSpacing: '0.08em',
        }}
      />
      <p id={hintId} className='type-label mt-2' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        {locale === 'pl'
          ? 'Wpisz kod paczkomatu, aby kontynuować bez mapy.'
          : 'Enter the parcel locker code to continue without the map.'}
      </p>
      {invalid && (
        <p className='type-label mt-2' style={{ color: 'var(--accent)' }}>
          {locale === 'pl' ? 'Wpisz prawidłowy kod paczkomatu.' : 'Enter a valid parcel locker code.'}
        </p>
      )}
    </div>
  );
}


// eslint-disable-next-line max-lines-per-function, complexity
function InpostPointSelector({
  geowidgetToken,
  locale,
  point,
  manualValue,
  error,
  manualInvalid,
  city,
  postcode,
  onSelect,
  onManualValueChange,
}: {
  geowidgetToken: string;
  locale: EcomLocale;
  point: InpostPoint | null;
  manualValue: string;
  error: string;
  manualInvalid: boolean;
  city?: string | undefined;
  postcode?: string | undefined;
  onSelect: (point: InpostPoint | null) => void;
  onManualValueChange: (value: string) => void;
}): JSX.Element {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const token = geowidgetToken.trim();
  const hasWidgetToken = Boolean(token);

  useEffect(() => {
    // widgetRef.current is only set when the modal is open and the div is in the DOM.
    if (!hasWidgetToken || !modalOpen || !widgetRef.current) return undefined;

    let active = true;
    const container = widgetRef.current;
    const eventName = 'onpointselect';
    const initEventName = 'inpost.geowidget.init';
    let widget: HTMLElement | null = null;
    const handlePointPayload = (payload: unknown): void => {
      const normalized = normalizeGeowidgetPoint(payload);
      if (normalized) { onSelect(normalized); setModalOpen(false); }
    };
    const handleSelect = (event: Event): void => {
      const normalized = normalizeGeowidgetEventPoint(event);
      if (normalized) { onSelect(normalized); setModalOpen(false); }
    };
    const handleInit = (event: Event): void => {
      const registerPointSelected = readGeowidgetPointSelectedRegistrar(event);
      if (registerPointSelected !== null) registerPointSelected(handlePointPayload);
    };

    // Intercept wheel events in the capture phase on the container div.
    // The wheel event is composed:true, so it always bubbles from inside the
    // shadow DOM (or custom element internals) to the light DOM. The capture
    // phase here fires before any listener inside the widget — including
    // Leaflet's gesture-handling overlay. When no modifier key is held the
    // user wants to scroll the page, so we stop the event and forward it.
    // Ctrl/Meta+wheel falls through so map zoom still works.
    const handleContainerWheel = (e: Event): void => {
      const we = e as WheelEvent;
      if (!we.ctrlKey && !we.metaKey) {
        we.stopImmediatePropagation();
        window.scrollBy({ top: we.deltaY, left: we.deltaX, behavior: 'instant' });
      }
    };
    container.addEventListener('wheel', handleContainerWheel, { capture: true });

    setLoadError('');
    ensureInpostGeowidgetAssets()
      .then(() => {
        if (!active) return;
        widget = document.createElement('inpost-geowidget');
        widget.setAttribute('token', token);
        widget.setAttribute('language', locale);
        widget.setAttribute('config', 'parcelCollect');
        widget.setAttribute('onpoint', eventName);
        // Use browser geolocation to centre the map on the user's area.
        // If the user denies geolocation, the widget falls back to its own default.
        widget.setAttribute('geolocation', 'true');
        // Pre-fill the widget's search origin with the shipping city/postcode so
        // the map opens focused on the right area without requiring geolocation.
        const origin = [postcode, city].filter(Boolean).join(' ');
        if (origin !== '') widget.setAttribute('origin', origin);
        widget.style.display = 'block';
        widget.style.height = '100%';
        widget.style.width = '100%';
        widget.addEventListener(initEventName, handleInit, { once: true });
        widget.addEventListener(eventName, handleSelect);
        container.replaceChildren(widget);
        document.addEventListener(eventName, handleSelect);
      })
      .catch(() => {
        if (active) setLoadError(locale === 'pl' ? 'Mapa InPost jest chwilowo niedostępna.' : 'InPost map is temporarily unavailable.');
      });

    return (): void => {
      active = false;
      container.removeEventListener('wheel', handleContainerWheel, { capture: true });
      document.removeEventListener(eventName, handleSelect);
      widget?.removeEventListener(initEventName, handleInit);
      widget?.removeEventListener(eventName, handleSelect);
      container.replaceChildren();
    };
  }, [hasWidgetToken, modalOpen, locale, onSelect, token, city, postcode]);

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
      <div className='type-label mb-1' style={{ color: 'var(--accent)' }}>
        {locale === 'pl' ? 'Paczkomat InPost' : 'InPost pickup point'}
      </div>

      {point ? (
        <div className='mt-3'>
          <div className='p-3 mb-3' style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--fg)', letterSpacing: '0.08em' }}>
              {point.name}
            </div>
            {selectedAddress !== '' && (
              <div className='type-label mt-1' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                {selectedAddress}
              </div>
            )}
          </div>
          <button
            type='button'
            className='btn-ghost w-full'
            onClick={() => setModalOpen(true)}
          >
            {locale === 'pl' ? 'Zmień paczkomat' : 'Change pickup point'}
          </button>
        </div>
      ) : (
        <div className='mt-3 space-y-3'>
          {hasWidgetToken && loadError === '' ? (
            <button
              type='button'
              className='btn-primary w-full'
              onClick={() => setModalOpen(true)}
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                <path d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z' />
                <circle cx='12' cy='10' r='3' />
              </svg>
              {locale === 'pl' ? 'Wybierz paczkomat' : 'Choose pickup point'}
            </button>
          ) : (
            <div className='space-y-3'>
              {loadError !== '' && (
                <p className='type-label' style={{ color: 'var(--accent)' }}>
                  {loadError}
                </p>
              )}
              {!hasWidgetToken && (
                <p className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                  {locale === 'pl'
                    ? 'Mapa paczkomatu jest chwilowo niedostępna. Wpisz kod paczkomatu poniżej.'
                    : 'The parcel locker map is temporarily unavailable. Enter the locker code below.'}
                </p>
              )}
              <ManualInpostPointInput
                locale={locale}
                value={manualValue}
                error={error}
                invalid={manualInvalid}
                onChange={onManualValueChange}
              />
            </div>
          )}
        </div>
      )}

      {error !== '' && (
        <p className='type-label mt-3' style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      )}

      {/* Map modal */}
      {modalOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center'
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className='relative flex flex-col'
            style={{
              width: 'min(96vw, 960px)',
              height: 'min(90vh, 720px)',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Modal header */}
            <div
              className='flex items-center justify-between px-5 py-3 shrink-0'
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className='type-label' style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
                {locale === 'pl' ? 'Wybierz paczkomat' : 'Choose pickup point'}
              </span>
              <button
                type='button'
                aria-label={locale === 'pl' ? 'Zamknij' : 'Close'}
                className='type-label transition-colors hover:text-[var(--fg)]'
                style={{ color: 'var(--muted)', lineHeight: 1, fontSize: '1.2rem' }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Map fills the modal */}
            <div
              ref={widgetRef}
              className='flex-1 min-h-0'
              style={{ width: '100%' }}
            />
          </div>
        </div>
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
  const summaryCurrencyCode = firstCartCurrencyCode(displayItems, locale);
  const freeShippingEnabled = freeShippingThreshold > 0;
  const freeShippingUnlocked = freeShippingEnabled && subtotal >= freeShippingThreshold;
  const freeShippingRemaining = roundMoneyAmount(Math.max(0, freeShippingThreshold - subtotal));
  const freeShippingUnlockedMessage = locale === 'pl' ? 'Darmowa dostawa odblokowana!' : 'Free shipping unlocked!';
  const freeShippingMessage = freeShippingUnlocked
    ? freeShippingUnlockedMessage
    : freeShippingBannerLabel.replace('{amount}', formatPrice(freeShippingRemaining, locale, summaryCurrencyCode));
  const discountRate = promoDiscountType === 'percentage'
    ? Math.round(promoDiscountValue * 100)
    : 0;
  const discountLabelSuffix = promoDiscountType === 'fixed'
    ? formatPrice(roundMoneyAmount(promoDiscountValue), locale, summaryCurrencyCode)
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
              <div className='relative h-16 w-14 flex-shrink-0 overflow-hidden'>
                <ProductImage
                  imageUrl={item.imageUrl}
                  gradient={item.gradient}
                  alt={item.name}
                  className='absolute inset-0'
                  sizes='56px'
                  fit='cover'
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

// ── Stripe (loaded from CDN) ─────────────────────────────────────────────────

type StripeSDK = {
  elements(options: { clientSecret: string; appearance?: Record<string, unknown> }): StripeElementsGroup;
  confirmPayment(options: {
    elements: StripeElementsGroup;
    confirmParams: { return_url: string };
    redirect?: 'if_required';
  }): Promise<{ error?: { message?: string } }>;
};
type StripeElementsGroup = {
  create(type: string): StripeElement;
  submit(): Promise<{ error?: { message?: string } }>;
};
type StripeElement = {
  mount(target: HTMLElement): void;
  destroy(): void;
  on(event: string, handler: () => void): void;
};

type StripePaymentSectionProps = {
  locale: EcomLocale;
  publishableKey: string;
  clientSecret: string;
  initiating: boolean;
  error: string;
  total: number;
  checkoutItemsEmpty: boolean;
  elementsReady: boolean;
  onInitiate(): void;
  onElementsReady(): void;
  onSuccess(orderId: string): void;
  onError(message: string): void;
  onReset(): void;
};

// eslint-disable-next-line max-lines-per-function, complexity
function StripePaymentSection({
  locale,
  publishableKey,
  clientSecret,
  initiating,
  error,
  checkoutItemsEmpty,
  elementsReady,
  onInitiate,
  onElementsReady,
  onSuccess,
  onError,
  onReset,
}: StripePaymentSectionProps): JSX.Element {
  const paymentRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<StripeSDK | null>(null);
  const elementsRef = useRef<StripeElementsGroup | null>(null);
  const elementRef = useRef<StripeElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const onElementsReadyRef = useRef(onElementsReady);
  onElementsReadyRef.current = onElementsReady;

  useEffect(() => {
    if (clientSecret === '' || publishableKey === '') return undefined;

    let active = true;

    const mountElements = (): void => {
      if (!active || !paymentRef.current) return;
      const win = window as unknown as { Stripe?: (key: string) => StripeSDK };
      if (!win.Stripe) return;
      const stripe = win.Stripe(publishableKey);
      const elements = stripe.elements({ clientSecret, appearance: { theme: 'flat' } });
      const paymentElement = elements.create('payment');
      paymentElement.on('ready', () => { if (active) onElementsReadyRef.current(); });
      paymentElement.mount(paymentRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;
      elementRef.current = paymentElement;
    };

    const existing = document.getElementById('stripe-js');
    if (existing !== null) {
      if (typeof (window as unknown as { Stripe?: unknown }).Stripe === 'function') mountElements();
      else existing.addEventListener('load', mountElements, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = 'stripe-js';
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = mountElements;
      script.onerror = (): void => { if (active) setScriptError('Failed to load Stripe. Please try again.'); };
      document.head.appendChild(script);
    }

    return (): void => {
      active = false;
      elementRef.current?.destroy();
      stripeRef.current = null;
      elementsRef.current = null;
      elementRef.current = null;
    };
  }, [clientSecret, publishableKey]);

  // eslint-disable-next-line complexity
  const handleConfirm = async (): Promise<void> => {
    if (!stripeRef.current || !elementsRef.current || submitting) return;
    setSubmitting(true);
    const { error: submitErr } = await elementsRef.current.submit();
    if (submitErr) { setSubmitting(false); onError(submitErr.message ?? 'Payment failed.'); return; }
    const returnUrl = `${window.location.origin}/order-status`;
    const { error: confirmErr } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (confirmErr) { onError(confirmErr.message ?? 'Payment was declined.'); return; }
    const oid = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stripe_pending_order_id') : null) ?? '';
    onSuccess(oid);
  };

  if (clientSecret === '') {
    return (
      <div>
        <div className='flex items-center gap-3 mb-6'>
          <div className='flex items-center justify-center px-3 py-1' style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600 }}>
            CARD
          </div>
          <span className='type-label' style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Płatność kartą' : 'Card payment'}
          </span>
        </div>
        <p className='type-label mb-6' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Bezpieczna płatność kartą przez Stripe.' : 'Secure card payment powered by Stripe.'}
        </p>
        {error !== '' && <p className='type-label mb-4' style={{ color: 'var(--accent)' }}>{error}</p>}
        <button
          className='btn-primary w-full flex items-center justify-center gap-2'
          onClick={onInitiate}
          disabled={initiating || checkoutItemsEmpty}
          style={{ opacity: initiating || checkoutItemsEmpty ? 0.5 : 1 }}
        >
          {initiating && (
            <svg className='animate-spin' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M12 3a9 9 0 1 1-9 9' />
            </svg>
          )}
          {locale === 'pl' ? 'Kontynuuj do płatności kartą' : 'Continue to card payment'}
          {!initiating && (
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M5 12h14M12 5l7 7-7 7' />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-3 mb-6'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center px-3 py-1' style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600 }}>
            CARD
          </div>
          <span className='type-label' style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Płatność kartą' : 'Card payment'}
          </span>
        </div>
        <button onClick={onReset} className='type-label hover:text-[var(--fg)] transition-colors' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Zmień' : 'Change'}
        </button>
      </div>
      {(error !== '' || scriptError !== '') && (
        <p className='type-label mb-4' style={{ color: 'var(--accent)' }}>{error !== '' ? error : scriptError}</p>
      )}
      {!elementsReady && scriptError === '' && (
        <div className='flex items-center gap-2 mb-3'>
          <svg className='animate-spin' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{ color: 'var(--muted)' }}>
            <path d='M12 3a9 9 0 1 1-9 9' />
          </svg>
          <span className='type-label' style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Ładowanie formularza...' : 'Loading payment form...'}
          </span>
        </div>
      )}
      <div
        ref={paymentRef}
        className='mb-6'
        style={{ minHeight: elementsReady ? undefined : 80, opacity: elementsReady ? 1 : 0.3, transition: 'opacity 0.3s ease' }}
      />
      <button
        className='btn-primary w-full flex items-center justify-center gap-2'
        onClick={() => { void handleConfirm(); }}
        disabled={!elementsReady || submitting || scriptError !== ''}
        style={{ opacity: !elementsReady || submitting ? 0.5 : 1 }}
      >
        {submitting && (
          <svg className='animate-spin' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
            <path d='M12 3a9 9 0 1 1-9 9' />
          </svg>
        )}
        {locale === 'pl' ? 'Potwierdź płatność' : 'Confirm payment'}
        {!submitting && (
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
            <path d='M5 12h14M12 5l7 7-7 7' />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── PayPal (loaded from CDN) ─────────────────────────────────────────────────

type PayPalButtonsInstance = { render(target: HTMLElement): Promise<void>; close(): Promise<void> };
type PayPalNamespace = {
  Buttons(config: {
    createOrder(): Promise<string>;
    onApprove(data: { orderID: string }): Promise<void>;
    onError?(err: unknown): void;
    style?: Record<string, unknown>;
  }): PayPalButtonsInstance;
};

type PayPalPaymentSectionProps = {
  locale: EcomLocale;
  clientId: string;
  mode: 'sandbox' | 'live';
  initiating: boolean;
  error: string;
  onCreateOrder(): Promise<string>;
  onCapture(paypalOrderId: string): Promise<void>;
};

// eslint-disable-next-line max-lines-per-function, complexity
function PayPalPaymentSection({
  locale,
  clientId,
  mode,
  initiating,
  error,
  onCreateOrder,
  onCapture,
}: PayPalPaymentSectionProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<PayPalButtonsInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState('');
  const onCreateOrderRef = useRef(onCreateOrder);
  const onCaptureRef = useRef(onCapture);
  onCreateOrderRef.current = onCreateOrder;
  onCaptureRef.current = onCapture;

  useEffect(() => {
    if (clientId === '') return undefined;

    let active = true;

    const renderButtons = (): void => {
      if (!active || !containerRef.current) return;
      const win = window as unknown as { paypal?: PayPalNamespace };
      if (!win.paypal) return;
      instanceRef.current?.close().catch(() => undefined);
      containerRef.current.innerHTML = '';
      const instance = win.paypal.Buttons({
        createOrder: async () => {
          const id = await onCreateOrderRef.current();
          if (id === '') throw new Error('Order creation failed.');
          return id;
        },
        onApprove: async (data: { orderID: string }) => {
          await onCaptureRef.current(data.orderID);
        },
        onError: (err: unknown): void => {
          if (!active) return;
          setSdkError(err instanceof Error ? err.message : 'PayPal error occurred.');
        },
        style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 48 },
      });
      instanceRef.current = instance;
      void instance.render(containerRef.current).then(() => { if (active) setSdkReady(true); });
    };

    const scriptSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&intent=capture&components=buttons`;
    const existing = document.querySelector('script[data-paypal-sdk]');
    if (existing !== null) {
      if ((window as unknown as { paypal?: unknown }).paypal !== undefined) renderButtons();
      else existing.addEventListener('load', renderButtons, { once: true });
    } else {
      const script = document.createElement('script');
      script.setAttribute('data-paypal-sdk', '1');
      script.src = scriptSrc;
      script.async = true;
      script.onload = renderButtons;
      script.onerror = (): void => { if (active) setSdkError('Failed to load PayPal. Please try again.'); };
      document.body.appendChild(script);
    }

    return (): void => {
      active = false;
      instanceRef.current?.close().catch(() => undefined);
      instanceRef.current = null;
    };
  }, [clientId, mode]);

  return (
    <div>
      <div className='flex items-center gap-3 mb-6'>
        <div
          className='flex items-center justify-center px-4 py-1'
          style={{ background: '#FFC439', fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700, color: '#003087', borderRadius: 2 }}
        >
          PayPal
        </div>
        <span className='type-label' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Płatność przez PayPal' : 'Pay with PayPal'}
        </span>
      </div>
      {(error !== '' || sdkError !== '') && (
        <p className='type-label mb-4' style={{ color: 'var(--accent)' }}>{error !== '' ? error : sdkError}</p>
      )}
      {!sdkReady && sdkError === '' && !initiating && (
        <div className='flex items-center gap-2 mb-4'>
          <svg className='animate-spin' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{ color: 'var(--muted)' }}>
            <path d='M12 3a9 9 0 1 1-9 9' />
          </svg>
          <span className='type-label' style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Ładowanie PayPal...' : 'Loading PayPal...'}
          </span>
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: 48 }} />
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
  const [form, setForm] = useState<Partial<Record<string, string>>>(() => initialCheckoutForm(locale));
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
  const [inpostPointManualValue, setInpostPointManualValue] = useState('');
  const [inpostPointError, setInpostPointError] = useState('');
  const [freshCartProducts, setFreshCartProducts] = useState<Partial<Record<string, FreshCartProduct>>>({});
  const [cartRefreshPending, setCartRefreshPending] = useState(false);
  const [inpostGeowidgetToken, setInpostGeowidgetToken] = useState('');
  const [paymentProviderAvailability, setPaymentProviderAvailability] =
    useState<PaymentProviderAvailability>({});
  const [shippingProviderAvailability, setShippingProviderAvailability] =
    useState<ShippingProviderAvailability>({});
  const [stripeSettings, setStripeSettings] = useState<StripePublicSettings>({ enabled: false, publishableKey: '' });
  const [paypalSettings, setPaypalSettings] = useState<PayPalPublicSettings>({ enabled: false, clientId: '', mode: 'sandbox' });
  const [bankTransferSettings, setBankTransferSettings] = useState<BankTransferPublicSettings>({ enabled: false, accountName: '', iban: '', bic: '', bankName: '' });
  const [activePaymentMethod, setActivePaymentMethod] = useState<ActivePaymentMethod>('blik');
  // Stripe state
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeInitiating, setStripeInitiating] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [stripeElementsReady, setStripeElementsReady] = useState(false);
  // PayPal state
  const [paypalInitiating, setPaypalInitiating] = useState(false);
  const [paypalError, setPaypalError] = useState('');
  // Bank transfer state
  const [bankTransferError, setBankTransferError] = useState('');
  const [bankTransferOrderId, setBankTransferOrderId] = useState('');

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

  useEffect(() => {
    let active = true;
    const loadProviderSettings = async (): Promise<void> => {
      try {
        const response = await fetch('/api/checkout/provider-settings', { cache: 'no-store' });
        const data = (await response.json().catch(() => null)) as unknown;
        if (active && response.ok) {
          setInpostGeowidgetToken(readPublicInpostGeowidgetToken(data));
          setPaymentProviderAvailability(readPublicPaymentProviderAvailability(data));
          setShippingProviderAvailability(readPublicShippingProviderAvailability(data));
          setStripeSettings(readPublicStripeSettings(data));
          setPaypalSettings(readPublicPayPalSettings(data));
          setBankTransferSettings(readPublicBankTransferSettings(data));
        } else if (active) {
          setInpostGeowidgetToken(fallbackInpostGeowidgetToken());
        }
      } catch {
        if (active) setInpostGeowidgetToken(fallbackInpostGeowidgetToken());
        if (active) setPaymentProviderAvailability({});
        if (active) setShippingProviderAvailability({});
      }
    };

    void loadProviderSettings();
    return (): void => {
      active = false;
    };
  }, []);

  const checkoutItems = useMemo(
    () => items.map((item) => mergeFreshCartItem(item, freshCartProducts[item.productId])),
    [freshCartProducts, items]
  );
  const checkoutCurrencyCode = firstCartCurrencyCode(checkoutItems, locale);
  const subtotal = roundMoneyAmount(checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const zoneMethods = useMemo(() => {
    const shippingCountry = form.country ?? '';
    const zone = getZoneForCountry(content.shippingZones, shippingCountry);
    const rawMethods = zone !== null
      ? zone.methods
      : content.shippingMethods;
    const countryMethods = filterShippingMethodsForCountry(rawMethods, shippingCountry);
    const providerMethods = filterShippingMethodsForProviderAvailability(
      countryMethods,
      shippingProviderAvailability,
    );
    return applyFreeThreshold(
      providerMethods,
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
    shippingProviderAvailability,
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
  const manualInpostPointInvalid = inpostPointManualValue.trim() !== ''
    && normalizeInpostPointCode(inpostPointManualValue) === null;
  const discount = calculatePromoDiscount(subtotal, promoDiscountType, promoDiscountValue);
  const total = roundMoneyAmount(subtotal - discount + selectedShipping.price);
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
  const isPayuPaymentAvailable = paymentProviderAvailability.payu !== false;
  const isStripePaymentAvailable = paymentProviderAvailability.stripe === true && stripeSettings.publishableKey !== '';
  const isPayPalPaymentAvailable = paymentProviderAvailability.paypal === true && paypalSettings.clientId !== '';
  const isBankTransferAvailable = paymentProviderAvailability.bankTransfer === true && bankTransferSettings.iban !== '';
  const availablePaymentMethods: ActivePaymentMethod[] = [
    ...(isPayuPaymentAvailable ? ['blik' as const] : []),
    ...(isStripePaymentAvailable ? ['stripe' as const] : []),
    ...(isPayPalPaymentAvailable ? ['paypal' as const] : []),
    ...(isBankTransferAvailable ? ['bank_transfer' as const] : []),
  ];
  const paymentUnavailableMessage = locale === 'pl'
    ? 'Płatność BLIK jest chwilowo niedostępna.'
    : 'BLIK payment is temporarily unavailable.';
  const inpostPointRequiredMessage = locale === 'pl' ? 'Wybierz paczkomat InPost.' : 'Choose an InPost pickup point.';
  const inpostPointInvalidMessage = locale === 'pl' ? 'Wpisz prawidłowy kod paczkomatu.' : 'Enter a valid parcel locker code.';

  useEffect(() => {
    if (zoneMethods.some((method) => method.id === shipping)) return;
    const firstMethodId = zoneMethods.at(0)?.id ?? 'standard';
    setShipping(firstMethodId);
  }, [shipping, zoneMethods]);

  useEffect(() => {
    // Clear only the validation error when the user switches away from InPost
    // so the previously chosen Paczkomat is retained if they switch back.
    if (!requiresInpostPoint) setInpostPointError('');
  }, [requiresInpostPoint]);

  // Pre-fill contact info from the logged-in user's session
  useEffect(() => {
    if (!user) return;
    const nameParts = user.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');
    setForm((f) => ({
      ...f,
      email: prefillText(f.email, user.email),
      firstName: prefillText(f.firstName, firstName),
      lastName: prefillText(f.lastName, lastName),
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
    setInpostPointManualValue(point?.name ?? '');
    if (point) setInpostPointError('');
  }, []);

  const handleManualInpostPointChange = useCallback((value: string) => {
    setInpostPointManualValue(value);
    const normalized = normalizeInpostPointCode(value);
    if (normalized === null) {
      setInpostPoint(null);
      return;
    }
    setInpostPoint({ id: normalized, name: normalized });
    setInpostPointError('');
  }, []);

  const validateInformationForm = (): boolean => {
    const result = buildCheckoutInfoSchema(locale).safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }
    const nextErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !Object.hasOwn(nextErrors, field)) {
        nextErrors[field] = issue.message;
      }
    }
    setErrors((current) => ({ ...current, ...nextErrors }));
    return false;
  };

  const validateShippingStep = (): boolean => {
    if (requiresInpostPoint && inpostPoint === null) {
      setInpostPointError(inpostPointManualValue.trim() === '' ? inpostPointRequiredMessage : inpostPointInvalidMessage);
      return false;
    }
    setInpostPointError('');
    return true;
  };

  const validatePaymentAvailability = (): boolean => {
    if (isPayuPaymentAvailable) return true;
    setBlikError(paymentUnavailableMessage);
    return false;
  };

  // eslint-disable-next-line complexity
  const handlePlaceOrder = async (): Promise<void> => {
    if (checkoutItems.length === 0 || placingOrder || cartRefreshPending) return;
    if (!validatePaymentAvailability()) return;
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

  // eslint-disable-next-line complexity
  const handleInitiateStripePayment = async (): Promise<void> => {
    if (!validateInformationForm()) { setStep('information'); return; }
    if (!validateShippingStep()) { setStep('shipping'); return; }
    setStripeError('');
    setStripeInitiating(true);
    try {
      const res = await fetch('/api/checkout/stripe', {
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
        }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      if (!res.ok || !isPlainRecord(data)) {
        const msg = isPlainRecord(data) && typeof data.error === 'string' ? data.error : 'Card payment setup failed.';
        setStripeError(msg);
        return;
      }
      const secret = typeof data.clientSecret === 'string' ? data.clientSecret : '';
      const pubKey = typeof data.publishableKey === 'string' ? data.publishableKey : '';
      const oid = typeof data.orderId === 'string' ? data.orderId : '';
      if (secret === '' || pubKey === '') { setStripeError('Card payment setup failed.'); return; }
      setConfirmedOrderId(oid);
      setStripeClientSecret(secret);
      setStripePublishableKey(pubKey);
      // Save orderId for 3DS redirect recovery
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('stripe_pending_order_id', oid);
      }
    } catch {
      setStripeError('Card payment setup failed. Please try again.');
    } finally {
      setStripeInitiating(false);
    }
  };

  // eslint-disable-next-line complexity
  const handlePayPalCreateOrder = async (): Promise<string> => {
    if (!validateInformationForm()) { setStep('information'); return ''; }
    if (!validateShippingStep()) { setStep('shipping'); return ''; }
    setPaypalError('');
    setPaypalInitiating(true);
    try {
      const res = await fetch('/api/checkout/paypal/create', {
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
        }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      if (!res.ok || !isPlainRecord(data)) {
        const msg = isPlainRecord(data) && typeof data.error === 'string' ? data.error : 'PayPal setup failed.';
        setPaypalError(msg);
        return '';
      }
      const ppOrderId = typeof data.paypalOrderId === 'string' ? data.paypalOrderId : '';
      const oid = typeof data.orderId === 'string' ? data.orderId : '';
      setConfirmedOrderId(oid);
      return ppOrderId;
    } catch {
      setPaypalError('PayPal setup failed. Please try again.');
      return '';
    } finally {
      setPaypalInitiating(false);
    }
  };

  const handlePayPalCaptureOrder = async (paypalOrderId: string): Promise<void> => {
    const oid = confirmedOrderId;
    if (oid === '' || paypalOrderId === '') { setPaypalError('Payment could not be completed.'); return; }
    try {
      const res = await fetch('/api/checkout/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: oid, paypalOrderId }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      if (res.ok) {
        setStep('confirmation');
        clearCart();
        toast({ type: 'success', title: content.orderPlacedToastTitle, message: oid });
      } else {
        const msg = isPlainRecord(data) && typeof data.error === 'string' ? data.error : 'PayPal payment was declined.';
        setPaypalError(msg);
      }
    } catch {
      setPaypalError('PayPal payment failed. Please try again.');
    }
  };

  const handlePlaceBankTransferOrder = async (): Promise<void> => {
    if (!validateInformationForm()) { setStep('information'); return; }
    if (!validateShippingStep()) { setStep('shipping'); return; }
    setBankTransferError('');
    setPlacingOrder(true);
    try {
      const res = await fetch('/api/checkout/bank-transfer', {
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
        }),
      });
      const data = (await res.json().catch(() => undefined)) as unknown;
      if (!res.ok || !isPlainRecord(data)) {
        const msg = isPlainRecord(data) && typeof data.error === 'string' ? data.error : 'Order failed. Please try again.';
        setBankTransferError(msg);
        return;
      }
      const oid = typeof data.orderId === 'string' ? data.orderId : '';
      setConfirmedOrderId(oid);
      setBankTransferOrderId(oid);
      setStep('confirmation');
      clearCart();
      toast({ type: 'success', title: content.orderPlacedToastTitle, message: oid });
    } catch {
      setBankTransferError('Order failed. Please try again.');
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
          if (!isFinishedPaymentStatus(status)) return;
          if (!active) return;
          clearInterval(intervalId);
          clearInterval(tickId);
          clearTimeout(timeoutId);
          setBlikPending(false);
          if (isSuccessfulPaymentStatus(status)) {
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
          {/* Bank transfer instructions shown on the confirmation page */}
          {bankTransferOrderId !== '' && bankTransferSettings.iban !== '' && (
            <div
              className='mb-8 px-6 py-5 text-left'
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', maxWidth: '420px', width: '100%' }}
            >
              <p className='type-label mb-4' style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
                {locale === 'pl' ? 'Dane do przelewu' : 'Bank transfer details'}
              </p>
              <div className='space-y-2'>
                {bankTransferSettings.bankName !== '' && (
                  <div className='flex justify-between gap-4'>
                    <span className='type-label' style={{ color: 'var(--muted)' }}>{locale === 'pl' ? 'Bank' : 'Bank'}</span>
                    <span className='type-label' style={{ color: 'var(--fg)' }}>{bankTransferSettings.bankName}</span>
                  </div>
                )}
                <div className='flex justify-between gap-4'>
                  <span className='type-label' style={{ color: 'var(--muted)' }}>{locale === 'pl' ? 'Odbiorca' : 'Recipient'}</span>
                  <span className='type-label' style={{ color: 'var(--fg)' }}>{bankTransferSettings.accountName}</span>
                </div>
                <div className='flex justify-between gap-4'>
                  <span className='type-label' style={{ color: 'var(--muted)' }}>IBAN</span>
                  <span className='type-label' style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{bankTransferSettings.iban}</span>
                </div>
                {bankTransferSettings.bic !== '' && (
                  <div className='flex justify-between gap-4'>
                    <span className='type-label' style={{ color: 'var(--muted)' }}>BIC / SWIFT</span>
                    <span className='type-label' style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{bankTransferSettings.bic}</span>
                  </div>
                )}
                <div className='flex justify-between gap-4 pt-2' style={{ borderTop: '1px solid var(--border)' }}>
                  <span className='type-label' style={{ color: 'var(--muted)' }}>{locale === 'pl' ? 'Tytuł przelewu' : 'Reference'}</span>
                  <span className='type-label' style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{bankTransferOrderId}</span>
                </div>
              </div>
            </div>
          )}
          {inpostPoint !== null && (
            <div
              className='mb-8 px-6 py-4 rounded-lg text-left'
              style={{ border: '1px solid var(--border)', maxWidth: '360px', width: '100%' }}
            >
              <p
                className='type-label mb-1'
                style={{ color: 'var(--muted)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {locale === 'pl' ? 'Paczkomat InPost' : 'InPost pickup point'}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem' }}>
                {inpostPoint.name}
              </p>
              {(inpostPoint.addressLine1 ?? inpostPoint.city) !== undefined && (
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                  {[
                    inpostPoint.addressLine1,
                    [inpostPoint.postCode, inpostPoint.city].filter(Boolean).join(' '),
                  ].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
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
                      geowidgetToken={inpostGeowidgetToken}
                      locale={locale}
                      point={inpostPoint}
                      manualValue={inpostPointManualValue}
                      error={inpostPointError}
                      manualInvalid={manualInpostPointInvalid}
                      city={form.city}
                      postcode={form.postcode}
                      onSelect={handleInpostPointSelect}
                      onManualValueChange={handleManualInpostPointChange}
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

                {/* Payment method selector — only shown when multiple methods are available */}
                {availablePaymentMethods.length > 1 && !blikPending && stripeClientSecret === '' && (
                  <div className='flex gap-2 mb-8'>
                    {availablePaymentMethods.map((method) => {
                      const labels: Record<ActivePaymentMethod, string> = {
                        blik: 'BLIK',
                        stripe: locale === 'pl' ? 'Karta' : 'Card',
                        paypal: 'PayPal',
                        bank_transfer: locale === 'pl' ? 'Przelew' : 'Bank transfer',
                      };
                      return (
                        <button
                          key={method}
                          className='type-label px-4 py-2 transition-colors'
                          style={{
                            border: `1px solid ${activePaymentMethod === method ? 'var(--fg)' : 'var(--border)'}`,
                            background: activePaymentMethod === method ? 'var(--surface)' : 'transparent',
                            color: activePaymentMethod === method ? 'var(--fg)' : 'var(--muted)',
                          }}
                          onClick={() => {
                            setActivePaymentMethod(method);
                            setStripeError('');
                            setPaypalError('');
                          }}
                        >
                          {labels[method]}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── BLIK payment ── */}
                {activePaymentMethod === 'blik' && (
                  blikPending ? (
                    <div className='flex flex-col items-center text-center py-8 gap-6'>
                      <svg className='animate-spin' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{ color: 'var(--fg)' }}>
                        <path d='M12 3a9 9 0 1 1-9 9' />
                      </svg>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '0.5rem' }}>
                          {blikPendingTitle}
                        </p>
                        <p className='type-label' style={{ color: 'var(--muted)', maxWidth: '320px' }}>
                          {blikPendingBody}
                        </p>
                        {blikSecondsLeft > 0 && (
                          <p className='type-label mt-3' style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                            {String(Math.floor(blikSecondsLeft / 60)).padStart(2, '0')}:{String(blikSecondsLeft % 60).padStart(2, '0')}
                          </p>
                        )}
                      </div>
                      <button className='type-label hover:text-[var(--fg)] transition-colors' style={{ color: 'var(--muted)' }}
                        onClick={() => { setBlikPending(false); setBlikSecondsLeft(0); setBlikCode(''); setBlikError(''); }}
                      >
                        {locale === 'pl' ? 'Anuluj i spróbuj ponownie' : 'Cancel and try again'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className='flex items-center gap-3 mb-6'>
                        <div className='flex items-center justify-center px-3 py-1' style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600 }}>
                          BLIK
                        </div>
                        <span className='type-label' style={{ color: 'var(--muted)' }}>
                          {locale === 'pl' ? 'Płatność mobilna' : 'Mobile payment'}
                        </span>
                      </div>
                      <div className='mb-2'>
                        <label htmlFor='blik-code' className='type-label block mb-1.5' style={{ color: 'var(--fg)' }}>{blikLabel}</label>
                        <input
                          id='blik-code'
                          type='text'
                          inputMode='numeric'
                          pattern='\d{6}'
                          maxLength={6}
                          disabled={!isPayuPaymentAvailable}
                          value={blikCode}
                          onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 6); setBlikCode(digits); if (blikError !== '') setBlikError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handlePlaceOrder(); }}
                          placeholder={blikPlaceholder}
                          autoComplete='one-time-code'
                          aria-invalid={blikError !== '' || !isPayuPaymentAvailable}
                          aria-describedby={blikError !== '' || !isPayuPaymentAvailable ? 'blik-error' : 'blik-hint'}
                          style={{ width: '100%', padding: '1rem 1.25rem', background: 'transparent', border: `1px solid ${blikError !== '' ? 'var(--accent)' : 'var(--border)'}`, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '1.75rem', letterSpacing: '0.4em', color: 'var(--fg)', textAlign: 'center', transition: 'border-color 0.2s ease', opacity: isPayuPaymentAvailable ? 1 : 0.5 }}
                          onFocus={(e) => {
                            const input = e.currentTarget;
                            input.style.borderColor = 'var(--fg)';
                          }}
                          onBlur={(e) => {
                            const input = e.currentTarget;
                            input.style.borderColor = blikError !== '' ? 'var(--accent)' : 'var(--border)';
                          }}
                        />
                        {blikError !== '' || !isPayuPaymentAvailable ? (
                          <p id='blik-error' className='type-label mt-1.5' style={{ color: 'var(--accent)' }}>
                            {blikError !== '' ? blikError : paymentUnavailableMessage}
                          </p>
                        ) : (
                          <p id='blik-hint' className='type-label mt-1.5' style={{ color: 'var(--muted)' }}>{blikHint}</p>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* ── Stripe card payment ── */}
                {activePaymentMethod === 'stripe' && (
                  <StripePaymentSection
                    locale={locale}
                    publishableKey={stripePublishableKey !== '' ? stripePublishableKey : stripeSettings.publishableKey}
                    clientSecret={stripeClientSecret}
                    initiating={stripeInitiating}
                    error={stripeError}
                    total={total}
                    checkoutItemsEmpty={checkoutItems.length === 0}
                    elementsReady={stripeElementsReady}
                    onInitiate={() => {
                      handleInitiateStripePayment().catch(() => undefined);
                    }}
                    onElementsReady={() => setStripeElementsReady(true)}
                    onSuccess={(oid) => {
                      setConfirmedOrderId(oid !== '' ? oid : confirmedOrderId);
                      setStep('confirmation');
                      clearCart();
                      toast({ type: 'success', title: content.orderPlacedToastTitle, message: oid !== '' ? oid : confirmedOrderId });
                    }}
                    onError={(msg) => setStripeError(msg)}
                    onReset={() => { setStripeClientSecret(''); setStripePublishableKey(''); setStripeError(''); setStripeElementsReady(false); }}
                  />
                )}

                {/* ── PayPal payment ── */}
                {activePaymentMethod === 'paypal' && (
                  <PayPalPaymentSection
                    locale={locale}
                    clientId={paypalSettings.clientId}
                    mode={paypalSettings.mode}
                    initiating={paypalInitiating}
                    error={paypalError}
                    onCreateOrder={handlePayPalCreateOrder}
                    onCapture={handlePayPalCaptureOrder}
                  />
                )}

                {/* ── Bank transfer payment ── */}
                {activePaymentMethod === 'bank_transfer' && (
                  <div>
                    <div className='flex items-center gap-3 mb-6'>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{ color: 'var(--accent)', flexShrink: 0 }}>
                        <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
                        <polyline points='9 22 9 12 15 12 15 22' />
                      </svg>
                      <span className='type-label' style={{ color: 'var(--muted)' }}>
                        {locale === 'pl' ? 'Przelew tradycyjny' : 'Traditional bank transfer'}
                      </span>
                    </div>
                    <div className='p-4 mb-4 space-y-2' style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {bankTransferSettings.bankName !== '' && (
                        <div className='flex justify-between gap-4'>
                          <span className='type-label' style={{ color: 'var(--muted)' }}>{locale === 'pl' ? 'Bank' : 'Bank'}</span>
                          <span className='type-label' style={{ color: 'var(--fg)' }}>{bankTransferSettings.bankName}</span>
                        </div>
                      )}
                      <div className='flex justify-between gap-4'>
                        <span className='type-label' style={{ color: 'var(--muted)' }}>{locale === 'pl' ? 'Odbiorca' : 'Recipient'}</span>
                        <span className='type-label' style={{ color: 'var(--fg)' }}>{bankTransferSettings.accountName}</span>
                      </div>
                      <div className='flex justify-between gap-4'>
                        <span className='type-label' style={{ color: 'var(--muted)' }}>IBAN</span>
                        <span className='type-label' style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{bankTransferSettings.iban}</span>
                      </div>
                      {bankTransferSettings.bic !== '' && (
                        <div className='flex justify-between gap-4'>
                          <span className='type-label' style={{ color: 'var(--muted)' }}>BIC / SWIFT</span>
                          <span className='type-label' style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{bankTransferSettings.bic}</span>
                        </div>
                      )}
                    </div>
                    <p className='type-label mb-4' style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                      {locale === 'pl'
                        ? 'Po złożeniu zamówienia otrzymasz numer referencyjny do wpisania w tytule przelewu. Zamówienie zostanie zrealizowane po zaksięgowaniu wpłaty.'
                        : 'After placing your order you will receive a reference number to use as the transfer description. Your order will be processed once payment is confirmed.'}
                    </p>
                    {bankTransferError !== '' && (
                      <p className='type-label mb-3' style={{ color: 'var(--accent)' }}>{bankTransferError}</p>
                    )}
                  </div>
                )}

                <div className='flex items-center justify-between mt-10'>
                  <button
                    className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors'
                    style={{ color: 'var(--muted)' }}
                    onClick={() => {
                      if (blikPending) return;
                      if (stripeClientSecret !== '') { setStripeClientSecret(''); setStripePublishableKey(''); setStripeElementsReady(false); return; }
                      setStep('shipping');
                    }}
                    disabled={blikPending}
                  >
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M19 12H5M12 5l-7 7 7 7' />
                    </svg>
                    {content.backLabel}
                  </button>
                  {activePaymentMethod === 'blik' && !blikPending && (
                    <button
                      className='btn-primary'
                      onClick={() => { handlePlaceOrder().catch(() => undefined); }}
                      disabled={checkoutItems.length === 0 || placingOrder || cartRefreshPending || !isPayuPaymentAvailable}
                      style={{ opacity: checkoutItems.length === 0 || placingOrder || cartRefreshPending || !isPayuPaymentAvailable ? 0.5 : 1 }}
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
                  {activePaymentMethod === 'bank_transfer' && (
                    <button
                      className='btn-primary'
                      onClick={() => { handlePlaceBankTransferOrder().catch(() => undefined); }}
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
