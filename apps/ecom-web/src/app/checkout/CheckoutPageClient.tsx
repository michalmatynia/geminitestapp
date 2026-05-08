'use client';

import { useState, useEffect, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { formatPrice } from '@/lib/locales';
import { SiteNav } from '@/components/SiteNav';
import type { CartItem } from '@/context/CartContext';
import type { Product } from '@/data/products';
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

function FieldRows({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: CheckoutFieldContent[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
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
              <FormInput field={field} value={values[field.id] ?? ''} error={errors[field.id]} onChange={onChange} />
              {next && <FormInput field={next} value={values[next.id] ?? ''} error={errors[next.id]} onChange={onChange} />}
            </div>
          );
        }
        if (isSecondOfPair) return null;
        return <FormInput key={field.id} field={field} value={values[field.id] ?? ''} error={errors[field.id]} onChange={onChange} />;
      })}
    </>
  );
}

const VALID_CODES: Record<string, number> = {
  ARCANA10: 0.10,
  ARCANA15: 0.15,
  WELCOME20: 0.20,
};

function OrderSummary({
  content,
  shippingPrice,
  subtotal,
  discount,
  total,
  promoCode,
  onPromoCodeChange,
}: {
  content: CheckoutSummaryContent;
  shippingPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  onPromoCodeChange: (code: string | null) => void;
}): JSX.Element {
  const { items } = useCart();
  const locale = useLocale();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(false);
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
  const discountPct = promoCode ? (VALID_CODES[promoCode] ?? 0) : 0;

  const applyPromo = () => {
    const upper = promoInput.trim().toUpperCase();
    if (VALID_CODES[upper] !== undefined) {
      onPromoCodeChange(upper);
      setPromoError(false);
      setPromoOpen(false);
    } else {
      setPromoError(true);
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
              onClick={() => { onPromoCodeChange(null); setPromoInput(''); }}
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
                  className="type-label px-4 py-2 transition-colors hover:opacity-80"
                  style={{ background: 'var(--fg)', color: 'var(--bg)', flexShrink: 0 }}
                >
                  {content.promoApplyLabel}
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
  const [paymentForm, setPaymentForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState('');

  const selectedShipping: CheckoutShippingMethodContent = content.shippingMethods.find((method) => method.id === shipping)
    ?? content.shippingMethods[0]
    ?? { id: 'standard', label: 'Standard', detail: '', price: 0, priceLabel: 'Free' };
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountPct = promoCode ? (VALID_CODES[promoCode] ?? 0) : 0;
  const discount = Math.round(subtotal * discountPct);
  const total = subtotal - discount + selectedShipping.price;
  const requiredMessage = locale === 'pl' ? 'To pole jest wymagane.' : 'This field is required.';
  const invalidEmailMessage = locale === 'pl' ? 'Wpisz poprawny adres email.' : 'Enter a valid email address.';
  const invalidCardMessage = locale === 'pl' ? 'Wpisz 16 cyfr numeru karty.' : 'Enter a 16-digit card number.';
  const invalidExpiryMessage = locale === 'pl' ? 'Wpisz poprawna date MM/YY.' : 'Enter a valid MM/YY expiry.';
  const expiredCardMessage = locale === 'pl' ? 'Data waznosci musi byc aktualna lub przyszla.' : 'Card expiry must be current or future.';
  const invalidCvvMessage = locale === 'pl' ? 'Wpisz 3-4 cyfry kodu CVV.' : 'Enter a 3-4 digit security code.';

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
  const setPaymentField = (id: string, v: string) => {
    setPaymentForm((f) => ({ ...f, [id]: v }));
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

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

  const validatePaymentForm = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const cardNumber = (paymentForm.cardNumber ?? '').replace(/\s+/g, '');
    const expiry = (paymentForm.expiry ?? '').replace(/\s+/g, '');
    const securityCode = (paymentForm.securityCode ?? '').trim();

    if (!/^\d{16}$/.test(cardNumber)) nextErrors.cardNumber = invalidCardMessage;
    if (!(paymentForm.cardName ?? '').trim()) nextErrors.cardName = requiredMessage;

    const expiryMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
    if (!expiryMatch) {
      nextErrors.expiry = invalidExpiryMessage;
    } else {
      const expiryMonth = Number(expiryMatch[1]);
      const expiryYear = 2000 + Number(expiryMatch[2]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        nextErrors.expiry = expiredCardMessage;
      }
    }

    if (!/^\d{3,4}$/.test(securityCode)) nextErrors.securityCode = invalidCvvMessage;

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0 || placingOrder) return;
    if (!validateInformationForm()) {
      setStep('information');
      return;
    }
    if (!validatePaymentForm()) return;

    setPlacingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          items,
          shippingMethod: selectedShipping.label,
          shippingPrice: selectedShipping.price,
          shippingAddress: { ...form },
          subtotal,
          discount,
          promoCode: promoCode ?? undefined,
          total,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { orderId?: string };
      if (!res.ok || typeof data.orderId !== 'string') throw new Error('Order failed');

      setConfirmedOrderId(data.orderId);
      setStep('confirmation');
      clearCart();
      toast({ type: 'success', title: content.orderPlacedToastTitle, message: data.orderId });
    } catch {
      toast({ type: 'error', title: 'Order failed', message: 'Please try again.' });
    } finally {
      setPlacingOrder(false);
    }
  };

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
            <button className="btn-ghost">{content.trackOrderLabel}</button>
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
                  <FieldRows fields={content.informationFields} values={form} errors={errors} onChange={setField} />
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
                      {form.address || content.deliveryAddressFallback}, {form.city || content.deliveryAddressFallback} {form.postcode || content.deliveryAddressFallback}
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
                  {content.shippingMethods.map((method) => (
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
                        onChange={() => setShipping(method.id)}
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
                      </div>
                      <span className="type-price" style={{ color: method.price === 0 ? '#4A7C5A' : 'var(--fg)' }}>
                        {method.priceLabel}
                      </span>
                    </label>
                  ))}
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
                  <button className="btn-primary" onClick={() => setStep('payment')}>
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

                {/* Card form */}
                <div className="space-y-4">
                  <FieldRows fields={content.paymentFields} values={paymentForm} errors={errors} onChange={setPaymentField} />
                </div>

                {/* Billing address toggle */}
                <label className="flex items-center gap-3 mt-6 cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only" />
                  <div
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--fg)', border: '1px solid var(--fg)' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span className="type-label" style={{ color: 'var(--muted)' }}>
                    {content.billingSameLabel}
                  </span>
                </label>

                <div className="flex items-center justify-between mt-10">
                  <button
                    className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => setStep('shipping')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {content.backLabel}
                  </button>
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
              promoCode={promoCode}
              onPromoCodeChange={setPromoCode}
            />
          </div>
        </div>
      </main>
    </>
  );
}
