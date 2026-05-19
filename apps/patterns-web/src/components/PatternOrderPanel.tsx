'use client';

import { Download, ShoppingBag } from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type JSX } from 'react';
import type { PatternLicenseId, PatternProduct } from '@/lib/types';

type PatternOrderPanelProps = {
  pattern: PatternProduct;
};

type DownloadLink = {
  patternId: string;
  name: string;
  format: 'SVG';
  href: string;
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function PatternOrderPanel({ pattern }: PatternOrderPanelProps): JSX.Element {
  const [licenseId, setLicenseId] = useState<PatternLicenseId>(pattern.defaultLicense);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadLink[]>([]);

  const selectedLicense = useMemo(
    () => pattern.licenses.find((license) => license.id === licenseId) ?? pattern.licenses[0],
    [licenseId, pattern.licenses]
  );

  const createOrder = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    setDownloads([]);

    try {
      const response = await fetch('/api/download-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          items: [{ patternId: pattern.id, licenseId, quantity: 1 }],
        }),
      });
      const payload = (await response.json()) as {
        order?: { code: string; downloadExpiresAt: string };
        downloads?: DownloadLink[];
        error?: string;
      };

      if (!response.ok) {
        setStatus(payload.error ?? 'Unable to create order.');
        return;
      }

      setDownloads(payload.downloads ?? []);
      setStatus(`Order ${payload.order?.code ?? ''} is ready.`);
    } catch {
      setStatus('Unable to reach the local order endpoint.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail-order-panel">
      <div>
        <span className="label">license</span>
        <div className="detail-license-list">
          {pattern.licenses.map((license) => (
            <button
              key={license.id}
              type="button"
              className={licenseId === license.id ? 'active' : ''}
              onClick={() => setLicenseId(license.id)}
            >
              <span>{license.label}</span>
              <strong>{money.format(license.price)}</strong>
            </button>
          ))}
        </div>
      </div>

      <p className="license-summary">{selectedLicense.summary}</p>

      <label className="filter-label" htmlFor="detail-order-email">Email</label>
      <input
        id="detail-order-email"
        className="email-input"
        value={email}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
        placeholder="studio@example.com"
        type="email"
      />

      <button
        type="button"
        className="checkout-btn"
        disabled={busy}
        onClick={() => void createOrder()}
      >
        <ShoppingBag size={16} strokeWidth={1.5} />
        <span>{busy ? 'creating order' : 'create order'}</span>
      </button>

      {status ? <p className="order-status">{status}</p> : null}

      {downloads.length > 0 ? (
        <div className="download-link-list">
          {downloads.map((download) => (
            <a key={`${download.patternId}-${download.format}`} href={download.href}>
              <Download size={15} strokeWidth={1.5} />
              <span>Download {download.format}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
