import { randomUUID } from 'node:crypto';
import { getDb } from './mongodb';
import { getPatternPricingCatalog } from './patternsRepository';
import type { PatternLicenseId } from './types';

export type DownloadOrderItemInput = {
  patternId: string;
  licenseId: PatternLicenseId;
  quantity: number;
};

export type CreateDownloadOrderInput = {
  email: string;
  items: DownloadOrderItemInput[];
};

export type DownloadOrder = {
  id: string;
  code: string;
  accessToken: string;
  email: string;
  items: Array<{
    patternId: string;
    slug: string;
    name: string;
    licenseId: PatternLicenseId;
    licenseLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  currency: 'EUR';
  subtotal: number;
  status: 'ready';
  createdAt: string;
  downloadExpiresAt: string;
};

export type DownloadLink = {
  patternId: string;
  name: string;
  format: 'SVG';
  href: string;
};

const orderCode = (): string =>
  `MBDP-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const accessToken = (): string =>
  `${randomUUID()}-${randomUUID()}`;

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function createDownloadOrder(input: CreateDownloadOrderInput): Promise<DownloadOrder> {
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) {
    throw new Error('A valid email address is required.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one pattern is required.');
  }

  const catalog = await getPatternPricingCatalog();
  const byId = new Map(catalog.map((pattern) => [pattern.id, pattern]));

  const items = input.items.map((item) => {
    const pattern = byId.get(item.patternId);
    if (pattern === undefined) {
      throw new Error(`Pattern ${item.patternId} is not available.`);
    }
    const license = pattern.licenses.find((entry) => entry.id === item.licenseId);
    if (license === undefined) {
      throw new Error(`License ${item.licenseId} is not available for ${pattern.name}.`);
    }
    const quantity = Math.max(1, Math.min(99, Math.round(item.quantity)));
    const lineTotal = license.price * quantity;

    return {
      patternId: pattern.id,
      slug: pattern.slug,
      name: pattern.name,
      licenseId: license.id,
      licenseLabel: license.label,
      quantity,
      unitPrice: license.price,
      lineTotal,
    };
  });

  const order: DownloadOrder = {
    id: randomUUID(),
    code: orderCode(),
    accessToken: accessToken(),
    email,
    items,
    currency: 'EUR',
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    status: 'ready',
    createdAt: new Date().toISOString(),
    downloadExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };

  const db = await getDb();
  await db.collection<DownloadOrder>('download_orders').insertOne(order);
  return order;
}

export function getOrderDownloadLinks(order: DownloadOrder): DownloadLink[] {
  const token = encodeURIComponent(order.accessToken);
  return order.items.map((item) => ({
    patternId: item.patternId,
    name: item.name,
    format: 'SVG',
    href: `/api/download-orders/${encodeURIComponent(order.code)}/downloads/${encodeURIComponent(item.patternId)}?token=${token}`,
  }));
}

export async function getDownloadOrderByCode(
  code: string,
  token: string
): Promise<DownloadOrder | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (normalizedCode.length === 0 || token.trim().length === 0) return null;

  const db = await getDb();
  const order = await db.collection<DownloadOrder>('download_orders').findOne(
    { code: normalizedCode, accessToken: token },
    { projection: { _id: 0 } }
  );
  if (order === null) return null;

  const expiresAt = new Date(order.downloadExpiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) return null;

  return order;
}
