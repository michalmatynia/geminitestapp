/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, complexity, max-lines, max-lines-per-function, no-console, require-atomic-updates */
import { createHmac, timingSafeEqual } from 'crypto';
import type { Filter, UpdateFilter } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import {
  ORDERS_COLLECTION,
  serializeOrder,
  type InpostShipment,
  type InpostTrackingEventRecord,
  type Order,
} from '@/lib/orders';
import { readInpostProviderSettings } from '@/lib/providerSettings';

const DEFAULT_SHIPX_API_URL = 'https://sandbox-api-shipx-pl.easypack24.net';
const DEFAULT_INPOST_GROUP_API_URL = 'https://stage-api.inpost-group.com';
const DEFAULT_INPOST_GROUP_TOKEN_URL = 'https://stage-api.inpost-group.com/oauth2/token';
const DEFAULT_PARCEL_TEMPLATE = 'small';
const DEFAULT_LOCKER_SERVICE = 'inpost_locker_standard';
const DEFAULT_SENDING_METHOD = 'dispatch_order';
const DEFAULT_LABEL_ACCEPT = 'application/pdf;format=A6';
const MAX_INPOST_TRACKING_EVENTS = 25;

interface ShipXConfig {
  apiUrl: string;
  token: string;
  organizationId: string;
  parcelTemplate: string;
  sendingMethod: string;
}

interface ShipXShipmentPayload {
  receiver: {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  parcels: {
    template: string;
  };
  custom_attributes: {
    target_point: string;
    sending_method: string;
  };
  service: string;
  reference: string;
}

interface ShipXShipmentResponse {
  id?: string | number;
  tracking_number?: string;
  trackingNumber?: string;
  status?: string;
  href?: string;
  service?: string;
  created_at?: string;
  createdAt?: string;
}

interface ShippingApiConfig {
  apiUrl: string;
  tokenUrl: string;
  token: string;
  clientId: string;
  clientSecret: string;
  organizationId: string;
}

export type InpostFulfillmentSkipReason =
  | 'not_inpost'
  | 'missing_point'
  | 'already_fulfilled'
  | 'not_configured'
  | 'not_ready';

export interface InpostFulfillmentResult {
  order: Order;
  shipment: InpostShipment | null;
  created: boolean;
  skippedReason?: InpostFulfillmentSkipReason;
}

export type InpostRefreshSkipReason =
  | 'not_inpost'
  | 'missing_tracking'
  | 'not_configured';

export interface InpostRefreshResult {
  order: Order;
  shipment: InpostShipment | null;
  refreshed: boolean;
  skippedReason?: InpostRefreshSkipReason;
}

export interface InpostLabelDownload {
  bytes: Buffer;
  contentType: string;
}

export interface InpostTrackingEvent {
  customerReference?: string;
  trackingNumber: string;
  eventId: string;
  eventCode: string;
  timestamp: string;
}

export interface InpostWebhookApplyResult {
  matched: boolean;
  modified: boolean;
  duplicate?: boolean;
  stale?: boolean;
  orderStatus?: Order['status'];
}

let oauthTokenCache: { token: string; expiresAt: number; scope: string } | null = null;

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getEnvConfig(): ShipXConfig {
  return {
    apiUrl: (env('INPOST_API_URL') || DEFAULT_SHIPX_API_URL).replace(/\/+$/, ''),
    token: env('INPOST_API_TOKEN'),
    organizationId: env('INPOST_ORGANIZATION_ID'),
    parcelTemplate: env('INPOST_DEFAULT_PARCEL_TEMPLATE') || DEFAULT_PARCEL_TEMPLATE,
    sendingMethod: env('INPOST_SENDING_METHOD') || DEFAULT_SENDING_METHOD,
  };
}

async function getConfig(): Promise<ShipXConfig> {
  const settings = await readInpostProviderSettings();
  if (settings !== null && settings.enabled === false) {
    return {
      apiUrl: (settings.apiUrl || DEFAULT_SHIPX_API_URL).replace(/\/+$/, ''),
      token: '',
      organizationId: '',
      parcelTemplate: settings.defaultParcelTemplate || DEFAULT_PARCEL_TEMPLATE,
      sendingMethod: settings.sendingMethod || DEFAULT_SENDING_METHOD,
    };
  }
  const envConfig = getEnvConfig();
  return {
    apiUrl: (settings?.apiUrl || envConfig.apiUrl || DEFAULT_SHIPX_API_URL).replace(/\/+$/, ''),
    token: settings?.apiToken || envConfig.token,
    organizationId: settings?.organizationId || envConfig.organizationId,
    parcelTemplate: settings?.defaultParcelTemplate || envConfig.parcelTemplate,
    sendingMethod: settings?.sendingMethod || envConfig.sendingMethod,
  };
}

function getEnvShippingApiConfig(): ShippingApiConfig {
  const apiUrl = (
    env('INPOST_GROUP_API_URL')
    || env('INPOST_SHIPPING_API_URL')
    || DEFAULT_INPOST_GROUP_API_URL
  ).replace(/\/+$/, '');
  const tokenUrl = env('INPOST_OAUTH_TOKEN_URL')
    || (apiUrl.includes('api.inpost-group.com') && !apiUrl.includes('stage-')
      ? 'https://api.inpost-group.com/oauth2/token'
      : DEFAULT_INPOST_GROUP_TOKEN_URL);

  return {
    apiUrl,
    tokenUrl,
    token: env('INPOST_API_TOKEN'),
    clientId: env('INPOST_OAUTH_CLIENT_ID'),
    clientSecret: env('INPOST_OAUTH_CLIENT_SECRET'),
    organizationId: env('INPOST_ORGANIZATION_ID'),
  };
}

async function getShippingApiConfig(): Promise<ShippingApiConfig> {
  const settings = await readInpostProviderSettings();
  if (settings !== null && settings.enabled === false) {
    return {
      apiUrl: (settings.apiUrl || DEFAULT_INPOST_GROUP_API_URL).replace(/\/+$/, ''),
      tokenUrl: settings.oauthTokenUrl || DEFAULT_INPOST_GROUP_TOKEN_URL,
      token: '',
      clientId: '',
      clientSecret: '',
      organizationId: '',
    };
  }
  const envConfig = getEnvShippingApiConfig();
  const apiUrl = (
    settings?.apiUrl ||
    envConfig.apiUrl ||
    DEFAULT_INPOST_GROUP_API_URL
  ).replace(/\/+$/, '');
  return {
    apiUrl,
    tokenUrl: settings?.oauthTokenUrl || envConfig.tokenUrl,
    token: settings?.apiToken || envConfig.token,
    clientId: settings?.oauthClientId || envConfig.clientId,
    clientSecret: settings?.oauthClientSecret || envConfig.clientSecret,
    organizationId: settings?.organizationId || envConfig.organizationId,
  };
}

export function isInpostConfigured(): boolean {
  const config = getEnvConfig();
  return Boolean(config.token && config.organizationId);
}

export function isInpostShippingApiConfigured(): boolean {
  const config = getEnvShippingApiConfig();
  return Boolean(config.organizationId && (config.token || (config.clientId && config.clientSecret)));
}

async function isRuntimeInpostConfigured(): Promise<boolean> {
  const config = await getConfig();
  return Boolean(config.token && config.organizationId);
}

async function isRuntimeInpostShippingApiConfigured(): Promise<boolean> {
  const config = await getShippingApiConfig();
  return Boolean(config.organizationId && (config.token || (config.clientId && config.clientSecret)));
}

export async function verifyInpostWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const settings = await readInpostProviderSettings();
  const secret = settings !== null && settings.enabled === false
    ? ''
    : settings?.webhookSecret || env('INPOST_WEBHOOK_SECRET');
  if (!secret) return false;
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader.trim());

  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function parseInpostTrackingEvent(value: unknown): InpostTrackingEvent | null {
  if (!isRecord(value)) return null;

  const trackingNumber = readString(value['trackingNumber']);
  const eventId = readString(value['eventId']);
  const eventCode = readString(value['eventCode']);
  const timestamp = readString(value['timestamp']);
  if (!trackingNumber || !eventId || !eventCode || !timestamp) return null;

  return {
    customerReference: readString(value['customerReference']) || undefined,
    trackingNumber,
    eventId,
    eventCode,
    timestamp,
  };
}

export function mapInpostEventToOrderStatus(eventCode: string): Order['status'] | null {
  if (/^EOL\.100[1-8]$/.test(eventCode)) return 'delivered';
  if (eventCode === 'EOL.9004' || eventCode === 'EOL.9005') return 'cancelled';
  if (
    eventCode.startsWith('FMD.')
    || eventCode.startsWith('MMD.')
    || eventCode.startsWith('LMD.')
    || eventCode.startsWith('RTS.')
  ) {
    return 'in-transit';
  }
  return null;
}

function isTerminalOrderStatus(value: unknown): boolean {
  return value === 'delivered' || value === 'cancelled';
}

function statusTransitionGuard(orderStatus: Order['status'] | null): Filter<Order> {
  if (orderStatus === 'in-transit') {
    return { status: { $nin: ['delivered', 'cancelled'] } };
  }
  if (orderStatus === 'delivered') {
    return { status: { $ne: 'cancelled' } };
  }
  if (orderStatus === 'cancelled') {
    return { status: { $ne: 'delivered' } };
  }
  return {};
}

function isStaleInpostStatus(existingStatus: unknown, incomingStatus: Order['status'] | null): boolean {
  if (incomingStatus === 'in-transit') return isTerminalOrderStatus(existingStatus);
  if (incomingStatus === 'delivered') return existingStatus === 'cancelled';
  if (incomingStatus === 'cancelled') return existingStatus === 'delivered';
  return false;
}

function hasRecordedInpostEvent(doc: unknown, eventId: string): boolean {
  if (!isRecord(doc)) return false;
  const eventIds = doc['inpostEventIds'];
  return Array.isArray(eventIds) && eventIds.includes(eventId);
}

function buildInpostTrackingEventRecord(
  event: InpostTrackingEvent,
  receivedAt: string,
  stale = false,
): InpostTrackingEventRecord {
  return {
    customerReference: event.customerReference,
    trackingNumber: event.trackingNumber,
    eventId: event.eventId,
    eventCode: event.eventCode,
    timestamp: event.timestamp,
    receivedAt,
    stale: stale || undefined,
  };
}

function cleanPhone(value: string): string {
  return value.replace(/[^\d+]/g, '').slice(0, 24);
}

function readAddress(order: Order, key: string): string {
  return order.shippingAddress[key]?.trim() ?? '';
}

export function buildShipXShipmentPayload(order: Order, config = getEnvConfig()): ShipXShipmentPayload {
  if (!order.inpostPoint?.id) {
    throw new Error('InPost pickup point is missing.');
  }

  const service = order.shippingService?.trim() || DEFAULT_LOCKER_SERVICE;

  return {
    receiver: {
      email: order.email,
      phone: cleanPhone(readAddress(order, 'phone')),
      first_name: readAddress(order, 'firstName'),
      last_name: readAddress(order, 'lastName'),
    },
    parcels: {
      template: config.parcelTemplate,
    },
    custom_attributes: {
      target_point: order.inpostPoint.id,
      sending_method: config.sendingMethod,
    },
    service,
    reference: order.orderId,
  };
}

function inpostCustomerTrackingUrl(trackingNumber: string | undefined): string | undefined {
  if (!trackingNumber) return undefined;
  return `https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(trackingNumber)}`;
}

function parseShipmentResponse(data: unknown): InpostShipment {
  const response = typeof data === 'object' && data !== null
    ? data as ShipXShipmentResponse
    : {};
  const trackingNumber = response.tracking_number ?? response.trackingNumber;

  return {
    shipmentId: response.id === null ? undefined : String(response.id),
    trackingNumber,
    trackingUrl: inpostCustomerTrackingUrl(trackingNumber),
    status: response.status,
    shipmentUrl: response.href,
    service: response.service,
    createdAt: response.created_at ?? response.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

async function getInpostShippingAccessToken(scope: string, config?: ShippingApiConfig): Promise<string> {
  const resolvedConfig = config ?? await getShippingApiConfig();
  if (resolvedConfig.clientId && resolvedConfig.clientSecret) {
    const now = Date.now();
    if (oauthTokenCache?.scope === scope && oauthTokenCache.expiresAt > now + 30_000) {
      return oauthTokenCache.token;
    }

    const res = await fetch(resolvedConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope,
        client_id: resolvedConfig.clientId,
        client_secret: resolvedConfig.clientSecret,
      }).toString(),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) {
      throw new Error(`InPost OAuth failed: ${res.status}`);
    }
    const nextToken = {
      token: data.access_token,
      expiresAt: now + Math.max(60, data.expires_in ?? 300) * 1000,
      scope,
    };
    oauthTokenCache = nextToken;
    return nextToken.token;
  }

  if (resolvedConfig.token) return resolvedConfig.token;
  throw new Error('InPost API token or OAuth client credentials are not configured.');
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

async function persistShipment(orderId: string, shipment: InpostShipment): Promise<void> {
  const db = await getDb();
  await db.collection(ORDERS_COLLECTION).updateOne(
    { orderId },
    {
      $set: {
        inpostShipment: shipment,
      },
      $unset: {
        'inpostShipment.error': '',
      },
    },
  );
}

async function persistShipmentError(orderId: string, error: unknown): Promise<void> {
  const db = await getDb();
  await db.collection(ORDERS_COLLECTION).updateOne(
    { orderId },
    {
      $set: {
        'inpostShipment.status': 'failed',
        'inpostShipment.error': safeErrorMessage(error),
        'inpostShipment.updatedAt': new Date().toISOString(),
      },
    },
  );
}

export async function createInpostShipment(order: Order): Promise<InpostShipment> {
  const config = await getConfig();
  if (!config.token || !config.organizationId) {
    throw new Error('InPost API token or organization ID is not configured.');
  }

  const payload = buildShipXShipmentPayload(order, config);
  const res = await fetch(`${config.apiUrl}/v1/organizations/${encodeURIComponent(config.organizationId)}/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const rawBody = await res.text();
  let data: unknown = {};
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = { rawBody };
    }
  }

  if (!res.ok) {
    const detail = rawBody ? `: ${rawBody.slice(0, 500)}` : '';
    throw new Error(`InPost shipment creation failed (${res.status})${detail}`);
  }

  const shipment = parseShipmentResponse(data);
  await persistShipment(order.orderId, shipment);
  return shipment;
}

export async function fulfillInpostOrder(order: Order): Promise<InpostShipment | null> {
  if (order.shippingCarrier !== 'inpost') return null;
  if (!order.inpostPoint) return null;
  if (order.inpostShipment?.shipmentId) return order.inpostShipment;

  if (!(await isRuntimeInpostConfigured())) {
    console.warn('InPost shipment skipped: INPOST_API_TOKEN or INPOST_ORGANIZATION_ID is not configured.');
    return null;
  }

  try {
    return await createInpostShipment(order);
  } catch (error) {
    await persistShipmentError(order.orderId, error);
    throw error;
  }
}

export async function fulfillInpostOrderByOrderId(orderId: string): Promise<InpostFulfillmentResult | null> {
  const db = await getDb();
  const doc = await db.collection(ORDERS_COLLECTION).findOne({ orderId });
  if (!doc) return null;

  const order = serializeOrder(doc);
  if (order.shippingCarrier !== 'inpost') {
    return { order, shipment: null, created: false, skippedReason: 'not_inpost' };
  }
  if (!order.inpostPoint) {
    return { order, shipment: null, created: false, skippedReason: 'missing_point' };
  }
  if (order.inpostShipment?.shipmentId) {
    return {
      order,
      shipment: order.inpostShipment,
      created: false,
      skippedReason: 'already_fulfilled',
    };
  }
  if (order.status !== 'processing') {
    return { order, shipment: null, created: false, skippedReason: 'not_ready' };
  }
  if (!(await isRuntimeInpostConfigured())) {
    return { order, shipment: null, created: false, skippedReason: 'not_configured' };
  }

  const shipment = await createInpostShipment(order);
  return {
    order: { ...order, inpostShipment: shipment },
    shipment,
    created: true,
  };
}

export async function applyInpostTrackingEvent(event: InpostTrackingEvent): Promise<InpostWebhookApplyResult> {
  const db = await getDb();
  const orderStatus = mapInpostEventToOrderStatus(event.eventCode);
  const receivedAt = new Date().toISOString();
  const eventRecord = buildInpostTrackingEventRecord(event, receivedAt);
  const lookupFilter = (event.customerReference
    ? {
        $or: [
          { orderId: event.customerReference },
          { 'inpostShipment.trackingNumber': event.trackingNumber },
        ],
      }
    : { 'inpostShipment.trackingNumber': event.trackingNumber }) as Filter<Order>;

  const update: UpdateFilter<Order> = {
    $set: {
      ...(orderStatus ? { status: orderStatus } : {}),
      'inpostShipment.trackingNumber': event.trackingNumber,
      'inpostShipment.trackingUrl': inpostCustomerTrackingUrl(event.trackingNumber),
      'inpostShipment.status': event.eventCode,
      'inpostShipment.eventCode': event.eventCode,
      'inpostShipment.eventId': event.eventId,
      'inpostShipment.eventTimestamp': event.timestamp,
      'inpostShipment.updatedAt': receivedAt,
    },
    $addToSet: {
      inpostEventIds: event.eventId,
    },
    $push: {
      inpostTrackingEvents: {
        $each: [eventRecord],
        $slice: -MAX_INPOST_TRACKING_EVENTS,
      },
    },
  };

  const collection = db.collection<Order>(ORDERS_COLLECTION);
  const result = await collection.updateOne(
    {
      ...lookupFilter,
      inpostEventIds: { $ne: event.eventId },
      ...statusTransitionGuard(orderStatus),
    },
    update,
  );

  if (result.matchedCount === 0) {
    const existing = await collection.findOne(
      lookupFilter,
      { projection: { _id: 1, status: 1, inpostEventIds: 1 } },
    );
    const duplicate = hasRecordedInpostEvent(existing, event.eventId);
    const stale = isStaleInpostStatus(existing?.status, orderStatus);

    if (stale && !duplicate) {
      const staleResult = await collection.updateOne(
        {
          ...lookupFilter,
          inpostEventIds: { $ne: event.eventId },
        },
        {
          $addToSet: {
            inpostEventIds: event.eventId,
          },
          $push: {
            inpostTrackingEvents: {
              $each: [buildInpostTrackingEventRecord(event, receivedAt, true)],
              $slice: -MAX_INPOST_TRACKING_EVENTS,
            },
          },
        } satisfies UpdateFilter<Order>,
      );

      return {
        matched: true,
        modified: staleResult.modifiedCount > 0,
        stale: true,
        orderStatus: orderStatus ?? undefined,
      };
    }

    return {
      matched: Boolean(existing),
      modified: false,
      duplicate: duplicate || undefined,
      orderStatus: orderStatus ?? undefined,
    };
  }

  return {
    matched: true,
    modified: result.modifiedCount > 0,
    orderStatus: orderStatus ?? undefined,
  };
}

async function fetchShippingApiShipmentDetails(trackingNumber: string): Promise<InpostShipment> {
  const config = await getShippingApiConfig();
  if (!config.organizationId) {
    throw new Error('InPost organization ID is not configured.');
  }

  const token = await getInpostShippingAccessToken('openid api:shipments:read', config);
  const url = `${config.apiUrl}/shipping/v2/organizations/${encodeURIComponent(config.organizationId)}/shipments/${encodeURIComponent(trackingNumber)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const rawBody = await res.text();
  let data: unknown = {};
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = { rawBody };
    }
  }
  if (!res.ok) {
    const detail = rawBody ? `: ${rawBody.slice(0, 500)}` : '';
    throw new Error(`InPost shipment refresh failed (${res.status})${detail}`);
  }

  return parseShipmentResponse(data);
}

export async function refreshInpostShipmentByOrderId(orderId: string): Promise<InpostRefreshResult | null> {
  const db = await getDb();
  const doc = await db.collection(ORDERS_COLLECTION).findOne({ orderId });
  if (!doc) return null;

  const order = serializeOrder(doc);
  if (order.shippingCarrier !== 'inpost') {
    return { order, shipment: null, refreshed: false, skippedReason: 'not_inpost' };
  }

  const trackingNumber = order.inpostShipment?.trackingNumber;
  if (!trackingNumber) {
    return { order, shipment: null, refreshed: false, skippedReason: 'missing_tracking' };
  }
  if (!(await isRuntimeInpostShippingApiConfigured())) {
    return { order, shipment: null, refreshed: false, skippedReason: 'not_configured' };
  }

  const shipment = {
    ...order.inpostShipment,
    ...await fetchShippingApiShipmentDetails(trackingNumber),
    trackingNumber,
    updatedAt: new Date().toISOString(),
  };
  await persistShipment(order.orderId, shipment);

  return {
    order: { ...order, inpostShipment: shipment },
    shipment,
    refreshed: true,
  };
}

export async function downloadInpostLabel(order: Order, accept = DEFAULT_LABEL_ACCEPT): Promise<InpostLabelDownload> {
  const trackingNumber = order.inpostShipment?.trackingNumber;
  if (order.shippingCarrier !== 'inpost' || !trackingNumber) {
    throw new Error('InPost tracking number is missing.');
  }

  const config = await getShippingApiConfig();
  if (!config.organizationId) {
    throw new Error('InPost organization ID is not configured.');
  }

  const token = await getInpostShippingAccessToken('openid api:shipments:read', config);
  const url = `${config.apiUrl}/shipping/v2/organizations/${encodeURIComponent(config.organizationId)}/shipments/${encodeURIComponent(trackingNumber)}/label`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
    },
    cache: 'no-store',
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    const body = bytes.toString('utf8').slice(0, 500);
    throw new Error(`InPost label download failed (${res.status})${body ? `: ${body}` : ''}`);
  }

  return {
    bytes,
    contentType: res.headers.get('Content-Type') ?? accept,
  };
}
