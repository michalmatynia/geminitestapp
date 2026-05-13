'use client';

import { useEffect, useState, type JSX } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { useLocale } from '@/context/LocaleContext';
import type { EcomLocale } from '@/lib/locales';
import type { Order } from '@/lib/orders';

type OrderStatus = Order['status'];

interface OrderStatusResponse {
  status?: string;
  shippingSummary?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  error?: string;
}

interface OrderStatusLookupResult {
  status: OrderStatus;
  shippingSummary: string;
  trackingNumber: string;
  trackingUrl: string;
}

interface OrderStatusCopy {
  title: string;
  eyebrow: string;
  body: string;
  inputLabel: string;
  inputPlaceholder: string;
  buttonLabel: string;
  loadingLabel: string;
  notFoundLabel: string;
  invalidLabel: string;
  statusPrefix: string;
  deliveryLabel: string;
  trackingLabel: string;
  statuses: Record<OrderStatus, string>;
}

const COPY: Record<EcomLocale, OrderStatusCopy> = {
  en: {
    title: 'Track order',
    eyebrow: 'Order status',
    body: 'Enter your order number to check the current checkout and delivery status.',
    inputLabel: 'Order number',
    inputPlaceholder: 'ARC-2026-ABCD1234',
    buttonLabel: 'Check status',
    loadingLabel: 'Checking...',
    notFoundLabel: 'Order not found.',
    invalidLabel: 'Enter a valid order number.',
    statusPrefix: 'Current status',
    deliveryLabel: 'Delivery',
    trackingLabel: 'Tracking',
    statuses: {
      pending_payment: 'Pending payment',
      processing: 'Processing',
      'in-transit': 'In transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
  },
  pl: {
    title: 'Śledź zamówienie',
    eyebrow: 'Status zamówienia',
    body: 'Wpisz numer zamówienia, aby sprawdzić aktualny status płatności i dostawy.',
    inputLabel: 'Numer zamówienia',
    inputPlaceholder: 'ARC-2026-ABCD1234',
    buttonLabel: 'Sprawdź status',
    loadingLabel: 'Sprawdzam...',
    notFoundLabel: 'Nie znaleziono zamówienia.',
    invalidLabel: 'Wpisz prawidłowy numer zamówienia.',
    statusPrefix: 'Aktualny status',
    deliveryLabel: 'Dostawa',
    trackingLabel: 'Tracking',
    statuses: {
      pending_payment: 'Oczekuje na płatność',
      processing: 'W realizacji',
      'in-transit': 'W drodze',
      delivered: 'Dostarczone',
      cancelled: 'Anulowane',
    },
  },
};

function normalizeOrderId(value: string): string {
  return value.trim().toUpperCase();
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === 'pending_payment'
    || value === 'processing'
    || value === 'in-transit'
    || value === 'delivered'
    || value === 'cancelled';
}

function readResponseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

interface OrderStatusFormProps {
  copy: OrderStatusCopy;
  loading: boolean;
  orderId: string;
  onOrderIdChange: (value: string) => void;
  onSubmit: () => void;
}

function OrderStatusForm({
  copy,
  loading,
  orderId,
  onOrderIdChange,
  onSubmit,
}: OrderStatusFormProps): JSX.Element {
  return (
    <form
      className='mt-10 grid gap-4'
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className='type-label' style={{ color: 'var(--fg)' }} htmlFor='order-status-id'>
        {copy.inputLabel}
      </label>
      <div className='flex flex-col sm:flex-row gap-3'>
        <input
          id='order-status-id'
          value={orderId}
          onChange={(event) => onOrderIdChange(event.target.value)}
          placeholder={copy.inputPlaceholder}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.85rem 1rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            letterSpacing: '0.06em',
            outline: 'none',
          }}
        />
        <button className='btn-primary' type='submit' disabled={loading}>
          {loading ? copy.loadingLabel : copy.buttonLabel}
        </button>
      </div>
    </form>
  );
}

function OrderStatusResult({
  copy,
  error,
  result,
}: {
  copy: OrderStatusCopy;
  error: string;
  result: OrderStatusLookupResult | null;
}): JSX.Element | null {
  if (result === null && error.length === 0) return null;
  return (
    <div className='mt-8 p-5' style={{ border: '1px solid var(--border)', background: 'rgba(171,217,208,0.03)' }}>
      {result !== null ? (
        <>
          <div className='type-label mb-2' style={{ color: 'var(--muted)' }}>
            {copy.statusPrefix}
          </div>
          <div className='mb-5' style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
            {copy.statuses[result.status]}
          </div>
          {result.shippingSummary.length > 0 && (
            <div className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
              {copy.deliveryLabel}: <span style={{ color: 'var(--fg)' }}>{result.shippingSummary}</span>
            </div>
          )}
          {result.trackingNumber.length > 0 && (
            <div className='type-label mt-2' style={{ color: 'var(--accent)' }}>
              {copy.trackingLabel}:{' '}
              {result.trackingUrl.length > 0 ? (
                <a href={result.trackingUrl} target='_blank' rel='noreferrer' style={{ color: 'var(--accent)' }}>
                  {result.trackingNumber}
                </a>
              ) : result.trackingNumber}
            </div>
          )}
        </>
      ) : (
        <div className='type-label' style={{ color: 'var(--coral-red)' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function OrderStatusIntro({ copy }: { copy: OrderStatusCopy }): JSX.Element {
  return (
    <>
      <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>
        {copy.eyebrow}
      </div>
      <h1 className='type-display-lg mb-4' style={{ color: 'var(--fg)' }}>
        {copy.title}
      </h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.8, maxWidth: '34rem' }}>
        {copy.body}
      </p>
    </>
  );
}

export function OrderStatusPageClient({ initialOrderId }: { initialOrderId: string }): JSX.Element {
  const locale = useLocale();
  const copy = COPY[locale];
  const [orderId, setOrderId] = useState(normalizeOrderId(initialOrderId));
  const [result, setResult] = useState<OrderStatusLookupResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkStatus = async (nextOrderId = orderId): Promise<void> => {
    const normalizedOrderId = normalizeOrderId(nextOrderId);
    setOrderId(normalizedOrderId);
    setResult(null);
    setError('');
    if (normalizedOrderId.length === 0) {
      setError(copy.invalidLabel);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(normalizedOrderId)}/status?locale=${locale}`);
      const body = (await response.json().catch(() => ({}))) as OrderStatusResponse;
      if (!response.ok || !isOrderStatus(body.status)) {
        setError(response.status === 404 ? copy.notFoundLabel : copy.invalidLabel);
        return;
      }
      setResult({
        status: body.status,
        shippingSummary: readResponseString(body.shippingSummary),
        trackingNumber: readResponseString(body.trackingNumber),
        trackingUrl: readResponseString(body.trackingUrl),
      });
    } catch {
      setError(copy.invalidLabel);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId.trim().length === 0) return;
    void checkStatus(initialOrderId);
  }, [initialOrderId]);

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>
        <section className='max-w-2xl mx-auto px-8 py-20'>
          <OrderStatusIntro copy={copy} />
          <OrderStatusForm
            copy={copy}
            loading={loading}
            orderId={orderId}
            onOrderIdChange={setOrderId}
            onSubmit={() => { void checkStatus(); }}
          />
          <OrderStatusResult copy={copy} error={error} result={result} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
