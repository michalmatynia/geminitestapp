'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { formatPrice } from '@/lib/locales';
import { applyFreeThreshold, calcDeliveryRange, getZoneForCountry } from '@/lib/shipping';
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
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-3">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = step.key === current;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                style={{
                  background: done || active ? 'var(--fg)' : 'transparent',
                  border: `1px solid ${done || active ? 'var(--fg)' : 'var(--border)'}`,
                  color: done || active ? 'var(--bg)' : 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="type-label hidden md:block"
                style={{ color: active ? 'var(--fg)' : 'var(--muted)' }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-px" style={{ background: 'var(--border)' }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function FormInput({ field, value, error, onChange }: {
  field: CheckoutFieldContent;
  value: string;
  error?: string;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
  const describedBy = error ? `${field.id}-error` : undefined;
  const label = field.id === 'phone'
    ? field.label.replace(/\s*\((optional|opcjonalnie)\)\s*$/i, '')
    : field.label;
  return (
    <div className={field.half ? 'flex-1 min-w-0' : 'w-full'}>
      <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>
        {label}
      </label>
      <input
        type={field.type ?? 'text'}
        id={field.id}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'transparent',
          border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
          outline: 'none',
          fontFamily: field.monospace ? 'var(--font-mono)' : 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 300,
          color: 'var(--fg)',
          letterSpacing: field.monospace ? '0.08em' : undefined,
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
        onBlur={(e) => { e.target.style.borderColor = error ? 'var(--accent)' : 'var(--border)'; }}
      />
      {error && (
        <p id={describedBy} className="type-label mt-1.5" style={{ color: 'var(--accent)' }}>
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
  const describedBy = error ? `${field.id}-error` : undefined;
  return (
    <div className={field.half ? 'flex-1 min-w-0' : 'w-full'}>
      <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>
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
          border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 300,
          color: value ? 'var(--fg)' : 'var(--muted)',
          transition: 'border-color 0.2s ease',
          appearance: 'none',
        }}
        onFocus={(event) => { event.target.style.borderColor = 'var(--fg)'; }}
        onBlur={(event) => { event.target.style.borderColor = error ? 'var(--accent)' : 'var(--border)'; }}
      >
        <option value="">{locale === 'pl' ? 'Wybierz kraj' : 'Select country'}</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.name}>
            {locale === 'pl' ? country.namePl : country.name}
          </option>
        ))}
      </select>
      {error && (
        <p id={describedBy} className="type-label mt-1.5" style={{ color: 'var(--accent)' }}>
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
  values: Record<string, string>;
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
        const prevHalf = i > 0 && fields[i - 1].half;
        const isFirstOfPair = field.half && !prevHalf;
        const isSecondOfPair = field.half && prevHalf;
        if (isFirstOfPair) {
          const next = fields[i + 1];
          return (
            <div key={field.id} className="flex gap-4">
              {renderField(field)}
              {next && renderField(next)}
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
  if (!name) return null;

  const address = readNestedRecord(value, 'address');
  const addressDetails = readNestedRecord(value, 'address_details');
  const location = readNestedRecord(value, 'location');
  const addressLine1 = readPointString(address, 'line1')
    || readPointString(value, 'address')
    || [
      readPointString(addressDetails, 'street'),
      readPointString(addressDetails, 'building_number'),
    ].filter(Boolean).join(' ');
  const addressLine2 = readPointString(address, 'line2');

  return {
    id: name,
    name,
    description: readPointString(value, 'description') || undefined,
    addressLine1: addressLine1 || undefined,
    addressLine2: addressLine2 || undefined,
    city: readPointString(addressDetails, 'city') || undefined,
    postCode: readPointString(addressDetails, 'post_code') || undefined,
    latitude: typeof location['latitude'] === 'number' ? location['latitude'] : undefined,
    longitude: typeof location['longitude'] === 'number' ? location['longitude'] : undefined,
  };
}

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
    if (!hasWidgetToken || !widgetRef.current) return;

    let active = true;
    const container = widgetRef.current;
    const eventName = 'onpointselect';
    const handleSelect = (event: Event) => {
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

    return () => {
      active = false;
      document.removeEventListener(eventName, handleSelect);
      container.replaceChildren();
    };
  }, [hasWidgetToken, locale, onSelect, token]);

  const selectedAddress = [
    point?.addressLine1,
    point?.addressLine2,
    [point?.postCode, point?.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');

  return (
    <div
      className="mt-4 p-4"
      style={{
        border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="type-label mb-1" style={{ color: 'var(--accent)' }}>
            {locale === 'pl' ? 'Paczkomat InPost' : 'InPost pickup point'}
          </div>
          <p className="type-label" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            {locale === 'pl'
              ? 'Wybierz paczkomat dla tej przesyłki.'
              : 'Choose the parcel locker for this shipment.'}
          </p>
        </div>
        {point && (
          <button
            type="button"
            className="type-label hover:text-[var(--fg)] transition-colors"
            style={{ color: 'var(--muted)', flexShrink: 0 }}
            onClick={() => onSelect(null)}
          >
            {locale === 'pl' ? 'Zmień' : 'Change'}
          </button>
        )}
      </div>

      {point && (
        <div className="mb-4 p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--fg)', letterSpacing: '0.08em' }}>
            {point.name}
          </div>
          {selectedAddress && (
            <div className="type-label mt-1" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              {selectedAddress}
            </div>
          )}
        </div>
      )}

      {hasWidgetToken ? (
        <>
          <div ref={widgetRef} style={{ minHeight: 420 }} />
          {loadError && (
            <p className="type-label mt-3" style={{ color: 'var(--accent)' }}>
              {loadError}
            </p>
          )}
        </>
      ) : (
        <div>
          <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>
            {locale === 'pl' ? 'Kod paczkomatu' : 'Parcel locker code'}
          </label>
          <input
            type="text"
            value={point?.name ?? ''}
            onChange={(event) => {
              const value = event.target.value.trim().toUpperCase();
              onSelect(value ? { id: value, name: value } : null);
            }}
            placeholder={locale === 'pl' ? 'np. WAW01A' : 'e.g. WAW01A'}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg)',
              border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
              outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              color: 'var(--fg)',
              letterSpacing: '0.08em',
            }}
          />
          <p className="type-label mt-2" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            {locale === 'pl'
              ? 'Dodaj NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN, aby włączyć mapę wyboru.'
              : 'Set NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN to enable the map selector.'}
          </p>
        </div>
      )}

      {error && (
        <p className="type-label mt-3" style={{ color: 'var(--accent)' }}>
          {error}
        </p>
      )}
    </div>
  );
}


function OrderSummary({
  content,
  shippingPrice,
  subtotal,
  discount,
  total,
  freeShippingThreshold,
  freeShippingBannerLabel,
  promoCode,
  promoDiscountPct,
  onPromoCodeChange,
}: {
  content: CheckoutSummaryContent;
  shippingPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingBannerLabel: string;
  promoCode: string | null;
  promoDiscountPct: number;
  onPromoCodeChange: (code: string | null, discountPct: number) => void;
}): JSX.Element {
  const { items } = useCart();
  const locale = useLocale();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [freshData, setFreshData] = useState<Record<string, Product>>({});
  const idKey = items.map((item) => item.productId).join(',');

  useEffect(() => {
    if (!idKey) {
      setFreshData({});
      return;
    }
    fetch(`/api/products?ids=${encodeURIComponent(idKey)}&locale=${locale}`)
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        const next: Record<string, Product> = {};
        for (const product of data.products ?? []) next[product.id] = product;
        setFreshData(next);
      })
      .catch(() => {});
  }, [idKey, locale]);

  const displayItems: CartItem[] = items.map((item) => {
    const fresh = freshData[item.productId];
    if (!fresh) return item;
    return {
      ...item,
      name: fresh.name || item.name,
      category: fresh.category || item.category,
      price: fresh.price || item.price,
      priceDisplay: fresh.priceDisplay || item.priceDisplay,
      gradient: fresh.gradient || item.gradient,
      imageUrl: fresh.imageUrl ?? item.imageUrl,
    };
  });
  const discountPct = promoDiscountPct;
  const freeShippingEnabled = freeShippingThreshold > 0;
  const freeShippingUnlocked = freeShippingEnabled && subtotal >= freeShippingThreshold;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingMessage = freeShippingUnlocked
    ? (locale === 'pl' ? 'Darmowa dostawa odblokowana!' : 'Free shipping unlocked!')
    : freeShippingBannerLabel.replace('{amount}', formatPrice(freeShippingRemaining, locale));

  const applyPromo = async () => {
    const upper = promoInput.trim().toUpperCase();
    if (!upper) return;
    setPromoApplying(true);
    try {
      const res = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: upper }),
      });
      const data = await res.json() as { valid: boolean; discountPct?: number };
      if (data.valid) {
        onPromoCodeChange(upper, data.discountPct ?? 0);
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
      className="sticky top-24 p-8"
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
      <div className="space-y-4 mb-6">
        {items.length === 0 ? (
          <p className="type-label" style={{ color: 'var(--muted)' }}>{content.emptyBagLabel}</p>
        ) : (
          displayItems.map((item) => (
            <div key={`${item.productId}::${item.size}`} className="flex gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className="w-14 h-16"
                  style={{ background: item.gradient }}
                />
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                  style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                >
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex justify-between gap-2">
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 300, color: 'var(--fg)' }}>
                    {item.name}
                  </p>
                  {item.size && (
                    <p className="type-label" style={{ color: 'var(--muted)' }}>{item.size}</p>
                  )}
                </div>
                <span className="type-price flex-shrink-0" style={{ color: 'var(--fg)' }}>
                  {formatPrice(item.price * item.quantity, locale)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Promo code */}
      <div className="mb-6" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        {promoCode ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: '#4A7C5A' }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="type-label" style={{ color: '#4A7C5A' }}>
                {promoCode} {content.promoAppliedSuffix}
              </span>
            </div>
            <button
              onClick={() => { onPromoCodeChange(null, 0); setPromoInput(''); }}
              className="type-label hover:text-[var(--fg)] transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              {content.removePromoLabel}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setPromoOpen(!promoOpen)}
              className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              {content.promoToggleLabel}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ transform: promoOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {promoOpen && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoError(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(); }}
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
                  onClick={applyPromo}
                  disabled={promoApplying}
                  className="type-label px-4 py-2 transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--fg)', color: 'var(--bg)', flexShrink: 0 }}
                >
                  {promoApplying ? '…' : content.promoApplyLabel}
                </button>
              </div>
            )}
            {promoError && (
              <p className="type-label mt-1.5" style={{ color: 'var(--accent)' }}>
                {content.promoInvalidLabel}
              </p>
            )}
          </>
        )}
      </div>

      <div className="divider mb-4" />

      {/* Totals */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="type-label" style={{ color: 'var(--muted)' }}>{content.subtotalLabel}</span>
          <span className="type-price" style={{ color: 'var(--fg)' }}>{formatPrice(subtotal, locale)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="type-label" style={{ color: '#4A7C5A' }}>
              {content.discountLabel} ({Math.round(discountPct * 100)}%)
            </span>
            <span className="type-price" style={{ color: '#4A7C5A' }}>
              − {formatPrice(discount, locale)}
            </span>
          </div>
        )}
        {freeShippingEnabled && (
          <div
            className="type-label"
            style={{
              color: freeShippingUnlocked ? '#4A7C5A' : 'var(--muted)',
              paddingTop: '0.25rem',
              lineHeight: 1.5,
            }}
          >
            {freeShippingMessage}
          </div>
        )}
        <div className="flex justify-between">
          <span className="type-label" style={{ color: 'var(--muted)' }}>{content.shippingLabel}</span>
          <span className="type-price" style={{ color: shippingPrice === 0 ? '#4A7C5A' : 'var(--fg)' }}>
            {shippingPrice === 0 ? content.freeLabel : formatPrice(shippingPrice, locale)}
          </span>
        </div>
      </div>

      <div className="divider mb-4" />

      <div className="flex justify-between items-center">
        <span
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--fg)' }}
        >
          {content.totalLabel}
        </span>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--fg)' }}
        >
          {formatPrice(total, locale)}
        </span>
      </div>
    </div>
  );
}

export function CheckoutPageClient({ content }: { content: CheckoutContent }): JSX.Element {
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const [step, setStep] = useState<Step>('information');
  const [shipping, setShipping] = useState(content.shippingMethods[0]?.id ?? 'standard');
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const handlePromoCodeChange = useCallback((code: string | null, pct: number) => {
    setPromoCode(code);
    setPromoDiscountPct(pct);
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

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const zoneMethods = useMemo(() => {
    const zone = getZoneForCountry(content.shippingZones, form.country ?? '');
    const rawMethods = zone && zone.methods.length > 0 ? zone.methods : content.shippingMethods;
    return applyFreeThreshold(
      rawMethods,
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
  const selectedShipping: CheckoutShippingMethodContent = zoneMethods.find((method) => method.id === shipping)
    ?? zoneMethods[0]
    ?? { id: 'standard', label: 'Standard', detail: '', price: 0, priceLabel: 'Free', businessDaysMin: 3, businessDaysMax: 5 };
  const requiresInpostPoint = selectedShipping.carrier === 'inpost' && Boolean(selectedShipping.requiresPickupPoint);
  const discount = Math.round(subtotal * promoDiscountPct);
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
    setShipping(zoneMethods[0]?.id ?? 'standard');
  }, [shipping, zoneMethods]);

  useEffect(() => {
    if (requiresInpostPoint) return;
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
      email: f.email || user.email,
      firstName: f.firstName || firstName,
      lastName: f.lastName || lastName,
    }));
  }, [user]);

  const setField = (id: string, v: string) => {
    setForm((f) => ({ ...f, [id]: v }));
    setErrors((current) => {
      if (!current[id]) return current;
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
      if (!(form[field] ?? '').trim()) nextErrors[field] = requiredMessage;
    }
    if ((form.email ?? '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = invalidEmailMessage;
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateShippingStep = (): boolean => {
    if (requiresInpostPoint && !inpostPoint) {
      setInpostPointError(inpostPointRequiredMessage);
      return false;
    }
    setInpostPointError('');
    return true;
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0 || placingOrder) return;
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
          email: form.email,
          items,
          shippingMethod: selectedShipping.label,
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
      const data = (await res.json().catch(() => ({}))) as { orderId?: string; error?: string };

      if (!res.ok || typeof data.orderId !== 'string') {
        setBlikError(data.error ?? (locale === 'pl' ? 'Błąd płatności. Spróbuj ponownie.' : 'Payment failed. Please try again.'));
        return;
      }

      setConfirmedOrderId(data.orderId);
      setBlikPendingOrderId(data.orderId);
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
    if (!blikPending || !blikPendingOrderId) return;

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

    const intervalId = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(blikPendingOrderId)}/status`);
        const data = (await res.json()) as { status?: string };
        if (!active) return;

        if (data.status === 'processing') {
          clearInterval(intervalId);
          clearInterval(tickId);
          clearTimeout(timeoutId);
          setBlikPending(false);
          setStep('confirmation');
          clearCart();
          toast({ type: 'success', title: content.orderPlacedToastTitle, message: blikPendingOrderId });
        } else if (data.status === 'cancelled') {
          clearInterval(intervalId);
          clearInterval(tickId);
          clearTimeout(timeoutId);
          setBlikPending(false);
          setBlikSecondsLeft(0);
          setBlikError(locale === 'pl' ? 'Płatność BLIK odrzucona.' : 'BLIK payment was declined.');
        }
      } catch {
        // Transient error — keep polling
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
      clearInterval(tickId);
      clearTimeout(timeoutId);
    };
  }, [blikPending, blikPendingOrderId, clearCart, content.orderPlacedToastTitle, locale, toast]);

  if (step === 'confirmation') {
    return (
      <>
        <SiteNav />
        <main
          className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
          style={{ paddingTop: 'var(--nav-h)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1
            className="type-display-lg mb-4"
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
            <strong style={{ color: 'var(--fg)' }}>{form.email || content.confirmationEmailFallback}</strong>
            {content.confirmationBodySuffix}
          </p>
          {confirmedOrderId && (
            <p className="type-label mb-8" style={{ color: 'var(--accent)' }}>
              {confirmedOrderId}
            </p>
          )}
          <div className="flex gap-3">
            <a href={localizedHref(content.continueShoppingHref)} className="btn-primary">{content.continueShoppingLabel}</a>
            <a href={localizedHref('/account')} className="btn-ghost">{content.trackOrderLabel}</a>
          </div>

          {/* Manifesto quote */}
          <p
            className="mt-20"
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
          className="px-8 md:px-16 py-5 flex items-center justify-between"
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
        <div className="grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_440px] min-h-[calc(100vh-var(--nav-h)-64px)]">
          {/* Form column */}
          <div className="px-8 md:px-16 py-12" style={{ borderRight: '1px solid var(--border)' }}>
            {/* ── Step: Information ─── */}
            {step === 'information' && (
              <div>
                <h2 className="type-display-md mb-8" style={{ color: 'var(--fg)' }}>
                  {content.informationTitle}
                </h2>
                <div className="space-y-4">
                  <FieldRows fields={content.informationFields} values={form} errors={errors} locale={locale} onChange={setField} />
                </div>

                <div className="flex items-center justify-between mt-10">
                  <a href={localizedHref(content.returnToBagHref)} className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors" style={{ color: 'var(--muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {content.returnToBagLabel}
                  </a>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (validateInformationForm()) setStep('shipping');
                    }}
                  >
                    {content.continueToShippingLabel}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Shipping ─── */}
            {step === 'shipping' && (
              <div>
                <h2 className="type-display-md mb-8" style={{ color: 'var(--fg)' }}>
                  {content.shippingTitle}
                </h2>

                {/* Delivery address recap */}
                <div
                  className="p-4 mb-8 flex justify-between items-start gap-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <div className="type-label mb-0.5" style={{ color: 'var(--muted)' }}>{content.deliveryRecapLabel}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--fg)' }}>
                      {form.address || content.deliveryAddressFallback}, {form.city || content.deliveryAddressFallback} {form.postcode || content.deliveryAddressFallback}, {form.country || content.deliveryAddressFallback}
                    </div>
                  </div>
                  <button
                    className="type-label hover:text-[var(--fg)] transition-colors"
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                    onClick={() => setStep('information')}
                  >
                    {content.changeLabel}
                  </button>
                </div>

                {/* Shipping options */}
                <div className="space-y-3 mb-10">
                  {zoneMethods.map((method) => (
                    <label
                      key={method.id}
                      className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${shipping === method.id ? 'var(--fg)' : 'var(--border)'}`,
                        background: shipping === method.id ? 'var(--surface)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={method.id}
                        checked={shipping === method.id}
                        onChange={() => {
                          setShipping(method.id);
                          if (method.carrier !== 'inpost') setInpostPointError('');
                        }}
                        className="sr-only"
                      />
                      <div
                        className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: shipping === method.id ? 'var(--fg)' : 'var(--border)' }}
                      >
                        {shipping === method.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--fg)' }} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--fg)' }}>
                          {method.label}
                        </div>
                        <div className="type-label" style={{ color: 'var(--muted)' }}>{method.detail}</div>
                        <div className="type-label" style={{ color: 'var(--accent)', marginTop: '0.3rem' }}>
                          {estimatedDeliveryLabel} {calcDeliveryRange(method.businessDaysMin, method.businessDaysMax, locale)}
                        </div>
                      </div>
                      <span className="type-price" style={{ color: method.price === 0 ? '#4A7C5A' : 'var(--fg)' }}>
                        {method.price === 0 ? content.orderSummary.freeLabel : method.priceLabel}
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

                <div className="flex items-center justify-between">
                  <button
                    className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => setStep('information')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {content.backLabel}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (validateShippingStep()) setStep('payment');
                    }}
                  >
                    {content.continueToPaymentLabel}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Payment ─── */}
            {step === 'payment' && (
              <div>
                <h2 className="type-display-md mb-8" style={{ color: 'var(--fg)' }}>
                  {content.paymentTitle}
                </h2>

                {/* Security note */}
                <div
                  className="flex items-center gap-3 p-4 mb-8"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#4A7C5A', flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="type-label" style={{ color: 'var(--muted)' }}>
                    {content.securityNote}
                  </span>
                </div>

                {blikPending ? (
                  /* ── BLIK pending: customer is confirming in banking app ── */
                  <div className="flex flex-col items-center text-center py-8 gap-6">
                    <svg
                      className="animate-spin"
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ color: 'var(--fg)' }}
                    >
                      <path d="M12 3a9 9 0 1 1-9 9" />
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
                      <p className="type-label" style={{ color: 'var(--muted)', maxWidth: '320px' }}>
                        {blikPendingBody}
                      </p>
                      {blikSecondsLeft > 0 && (
                        <p
                          className="type-label mt-3"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
                        >
                          {String(Math.floor(blikSecondsLeft / 60)).padStart(2, '0')}
                          :{String(blikSecondsLeft % 60).padStart(2, '0')}
                        </p>
                      )}
                    </div>
                    <button
                      className="type-label hover:text-[var(--fg)] transition-colors"
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
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="flex items-center justify-center px-3 py-1"
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
                      <span className="type-label" style={{ color: 'var(--muted)' }}>
                        {locale === 'pl' ? 'Płatność mobilna' : 'Mobile payment'}
                      </span>
                    </div>

                    <div className="mb-2">
                      <label
                        htmlFor="blik-code"
                        className="type-label block mb-1.5"
                        style={{ color: 'var(--fg)' }}
                      >
                        {blikLabel}
                      </label>
                      <input
                        id="blik-code"
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        value={blikCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setBlikCode(digits);
                          if (blikError) setBlikError('');
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handlePlaceOrder(); }}
                        placeholder={blikPlaceholder}
                        autoComplete="one-time-code"
                        aria-invalid={Boolean(blikError)}
                        aria-describedby={blikError ? 'blik-error' : 'blik-hint'}
                        style={{
                          width: '100%',
                          padding: '1rem 1.25rem',
                          background: 'transparent',
                          border: `1px solid ${blikError ? 'var(--accent)' : 'var(--border)'}`,
                          outline: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.75rem',
                          letterSpacing: '0.4em',
                          color: 'var(--fg)',
                          textAlign: 'center',
                          transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                        onBlur={(e) => { e.target.style.borderColor = blikError ? 'var(--accent)' : 'var(--border)'; }}
                      />
                      {blikError ? (
                        <p id="blik-error" className="type-label mt-1.5" style={{ color: 'var(--accent)' }}>
                          {blikError}
                        </p>
                      ) : (
                        <p id="blik-hint" className="type-label mt-1.5" style={{ color: 'var(--muted)' }}>
                          {blikHint}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-10">
                  <button
                    className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => { if (!blikPending) setStep('shipping'); }}
                    disabled={blikPending}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {content.backLabel}
                  </button>
                  {!blikPending && (
                    <button
                      className="btn-primary"
                      onClick={handlePlaceOrder}
                      disabled={items.length === 0 || placingOrder}
                      style={{ opacity: items.length === 0 || placingOrder ? 0.5 : 1 }}
                    >
                      {placingOrder && (
                        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M12 3a9 9 0 1 1-9 9" />
                        </svg>
                      )}
                      {items.length === 0 ? content.addItemsFirstLabel : content.placeOrderLabel}
                      {items.length > 0 && !placingOrder && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order summary column */}
          <div className="px-8 md:px-10 py-12" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
            <OrderSummary
              content={content.orderSummary}
              shippingPrice={selectedShipping.price}
              subtotal={subtotal}
              discount={discount}
              total={total}
              freeShippingThreshold={content.freeShippingThreshold}
              freeShippingBannerLabel={content.freeShippingBannerLabel}
              promoCode={promoCode}
              promoDiscountPct={promoDiscountPct}
              onPromoCodeChange={handlePromoCodeChange}
            />
          </div>
        </div>
      </main>
    </>
  );
}
