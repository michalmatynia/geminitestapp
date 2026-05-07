'use client';

import { useState, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { SiteNav } from '@/components/SiteNav';

type Step = 'information' | 'shipping' | 'payment' | 'confirmation';

const STEPS: { key: Step; label: string }[] = [
  { key: 'information', label: 'Information' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
];

type FormField = {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  half?: boolean;
};

const INFO_FIELDS: FormField[] = [
  { id: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
  { id: 'firstName', label: 'First name', placeholder: 'Marie', half: true },
  { id: 'lastName', label: 'Last name', placeholder: 'Curie', half: true },
  { id: 'address', label: 'Address', placeholder: '12 Rue de Rivoli' },
  { id: 'apartment', label: 'Apartment / suite (optional)', placeholder: 'Floor 3' },
  { id: 'city', label: 'City', placeholder: 'Paris', half: true },
  { id: 'postcode', label: 'Postcode', placeholder: '75001', half: true },
  { id: 'country', label: 'Country', placeholder: 'France' },
  { id: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+33 6 12 34 56 78' },
];

const SHIPPING_METHODS = [
  { id: 'standard', label: 'Standard Delivery', detail: '5–7 business days', price: 0, priceLabel: 'Free' },
  { id: 'express', label: 'Express Delivery', detail: '2–3 business days', price: 18, priceLabel: '€ 18' },
  { id: 'overnight', label: 'Overnight', detail: 'Next business day before 12:00', price: 35, priceLabel: '€ 35' },
];

function StepProgress({ current }: { current: Step }): JSX.Element {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Checkout steps" className="flex items-center gap-3">
      {STEPS.map((step, i) => {
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
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px" style={{ background: 'var(--border)' }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function FormInput({ field, value, onChange }: {
  field: FormField;
  value: string;
  onChange: (id: string, v: string) => void;
}): JSX.Element {
  return (
    <div className={field.half ? 'flex-1 min-w-0' : 'w-full'}>
      <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>
        {field.label}
      </label>
      <input
        type={field.type ?? 'text'}
        id={field.id}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'transparent',
          border: '1px solid var(--border)',
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 300,
          color: 'var(--fg)',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
      />
    </div>
  );
}

function OrderSummary(): JSX.Element {
  const { items, totalPrice } = useCart();
  const shipping = 0;
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
        Order Summary
      </h2>

      {/* Items */}
      <div className="space-y-4 mb-6">
        {items.length === 0 ? (
          <p className="type-label" style={{ color: 'var(--muted)' }}>No items in bag</p>
        ) : (
          items.map((item) => (
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
                  € {(item.price * item.quantity).toLocaleString('de-DE')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="divider mb-4" />

      {/* Totals */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="type-label" style={{ color: 'var(--muted)' }}>Subtotal</span>
          <span className="type-price" style={{ color: 'var(--fg)' }}>€ {totalPrice.toLocaleString('de-DE')}</span>
        </div>
        <div className="flex justify-between">
          <span className="type-label" style={{ color: 'var(--muted)' }}>Shipping</span>
          <span className="type-price" style={{ color: shipping === 0 ? '#4A7C5A' : 'var(--fg)' }}>
            {shipping === 0 ? 'Free' : `€ ${shipping}`}
          </span>
        </div>
      </div>

      <div className="divider mb-4" />

      <div className="flex justify-between items-center">
        <span
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--fg)' }}
        >
          Total
        </span>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--fg)' }}
        >
          € {(totalPrice + shipping).toLocaleString('de-DE')}
        </span>
      </div>
    </div>
  );
}

export default function CheckoutPage(): JSX.Element {
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('information');
  const [shipping, setShipping] = useState('standard');
  const [form, setForm] = useState<Record<string, string>>({});

  const setField = (id: string, v: string) => setForm((f) => ({ ...f, [id]: v }));

  const handlePlaceOrder = () => {
    setStep('confirmation');
    clearCart();
    toast({ type: 'success', title: 'Order placed!', message: 'A confirmation has been sent to your email.' });
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
            Order confirmed
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
            Thank you. Your order has been received and is being prepared. You will receive a confirmation at{' '}
            <strong style={{ color: 'var(--fg)' }}>{form.email || 'your email'}</strong>.
          </p>
          <div className="flex gap-3">
            <a href="/" className="btn-primary">Continue shopping</a>
            <button className="btn-ghost">Track order</button>
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
            &ldquo;Objects of enduring beauty — made to last.&rdquo;
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
            href="/"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.25em', color: 'var(--fg)' }}
          >
            ARCANA
          </a>
          <StepProgress current={step} />
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
                  Contact & Delivery
                </h2>
                <div className="space-y-4">
                  {INFO_FIELDS.map((field, i) => {
                    const prevHalf = i > 0 && INFO_FIELDS[i - 1].half;
                    const isFirstOfPair = field.half && !prevHalf;
                    const isSecondOfPair = field.half && prevHalf;
                    if (isFirstOfPair) {
                      const next = INFO_FIELDS[i + 1];
                      return (
                        <div key={field.id} className="flex gap-4">
                          <FormInput field={field} value={form[field.id] ?? ''} onChange={setField} />
                          {next && <FormInput field={next} value={form[next.id] ?? ''} onChange={setField} />}
                        </div>
                      );
                    }
                    if (isSecondOfPair) return null;
                    return <FormInput key={field.id} field={field} value={form[field.id] ?? ''} onChange={setField} />;
                  })}
                </div>

                <div className="flex items-center justify-between mt-10">
                  <a href="/" className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors" style={{ color: 'var(--muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Return to bag
                  </a>
                  <button
                    className="btn-primary"
                    onClick={() => setStep('shipping')}
                  >
                    Continue to shipping
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
                  Shipping method
                </h2>

                {/* Delivery address recap */}
                <div
                  className="p-4 mb-8 flex justify-between items-start gap-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <div className="type-label mb-0.5" style={{ color: 'var(--muted)' }}>Delivering to</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--fg)' }}>
                      {form.address || '—'}, {form.city || '—'} {form.postcode || '—'}
                    </div>
                  </div>
                  <button
                    className="type-label hover:text-[var(--fg)] transition-colors"
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                    onClick={() => setStep('information')}
                  >
                    Change
                  </button>
                </div>

                {/* Shipping options */}
                <div className="space-y-3 mb-10">
                  {SHIPPING_METHODS.map((method) => (
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
                    Back
                  </button>
                  <button className="btn-primary" onClick={() => setStep('payment')}>
                    Continue to payment
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
                  Payment
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
                    All transactions are secure and encrypted with SSL
                  </span>
                </div>

                {/* Card form */}
                <div className="space-y-4">
                  <div>
                    <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>Card number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        background: 'transparent', border: '1px solid var(--border)',
                        outline: 'none', fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem', color: 'var(--fg)',
                        letterSpacing: '0.08em',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                  </div>
                  <div>
                    <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>Name on card</label>
                    <input
                      type="text"
                      placeholder="Marie Curie"
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        background: 'transparent', border: '1px solid var(--border)',
                        outline: 'none', fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem', fontWeight: 300, color: 'var(--fg)',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>Expiry date</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        maxLength={7}
                        style={{
                          width: '100%', padding: '0.75rem 1rem',
                          background: 'transparent', border: '1px solid var(--border)',
                          outline: 'none', fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem', color: 'var(--fg)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="type-label block mb-1.5" style={{ color: 'var(--fg)' }}>Security code</label>
                      <input
                        type="text"
                        placeholder="CVV"
                        maxLength={4}
                        style={{
                          width: '100%', padding: '0.75rem 1rem',
                          background: 'transparent', border: '1px solid var(--border)',
                          outline: 'none', fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem', color: 'var(--fg)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                      />
                    </div>
                  </div>
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
                    Billing address same as delivery
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
                    Back
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handlePlaceOrder}
                    disabled={items.length === 0}
                    style={{ opacity: items.length === 0 ? 0.5 : 1 }}
                  >
                    {items.length === 0 ? 'Add items first' : 'Place order'}
                    {items.length > 0 && (
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
            <OrderSummary />
          </div>
        </div>
      </main>
    </>
  );
}
