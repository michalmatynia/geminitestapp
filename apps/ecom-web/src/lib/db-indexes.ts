import { getDb, getEcommerceProductsDb } from './mongodb';

let productIndexesEnsured = false;
let appIndexesEnsured = false;

type MongoIndexDescription = {
  key?: Record<string, unknown>;
};

const isSingleKeyIndex = (index: MongoIndexDescription): boolean => {
  const key = index.key;
  return key != null && Object.keys(key).length === 1 && key['key'] === 1;
};

/**
 * Ensure indexes exist on the products collection.
 * Called lazily on first use — `createIndex` is a no-op when the index already exists.
 * The compound index on catalogId+published+archived+stock matches the base filter
 * used by every catalog listing query.
 */
export async function ensureProductIndexes(): Promise<void> {
  if (productIndexesEnsured) return;
  productIndexesEnsured = true;

  try {
    const db = await getEcommerceProductsDb();
    const col = db.collection('products');

    await Promise.all([
      // Primary catalog listing: catalogId filter + active/in-stock gate + createdAt sort
      col.createIndex(
        { catalogId: 1, published: 1, archived: 1, stock: 1, createdAt: -1 },
        { background: true, name: 'catalog_active_date' },
      ),
      // Multi-catalog assignment path
      col.createIndex(
        { 'catalogs.catalogId': 1, published: 1, archived: 1, stock: 1 },
        { background: true, name: 'catalogs_active' },
      ),
      // Category filter (combined with catalog filter by query planner)
      col.createIndex(
        { categoryId: 1, catalogId: 1 },
        { background: true, name: 'category_catalog' },
      ),
      // Price sort queries
      col.createIndex(
        { catalogId: 1, price: 1 },
        { background: true, name: 'catalog_price_asc' },
      ),
      col.createIndex(
        { catalogId: 1, price: -1 },
        { background: true, name: 'catalog_price_desc' },
      ),
      // Single-product lookup by SKU (used as slug)
      col.createIndex(
        { sku: 1 },
        { background: true, name: 'sku', unique: false },
      ),
    ]);
  } catch {
    // Non-fatal: index creation may fail if MongoDB user lacks the privilege.
    // The app continues to work without indexes, just slower.
  }
}

/**
 * Ensure indexes on the main app DB (orders, wishlists, users).
 * Called lazily — safe to call from any API route on first use.
 */
export async function ensureAppIndexes(): Promise<void> {
  if (appIndexesEnsured) return;
  appIndexesEnsured = true;

  try {
    const db = await getDb();
    const ecomSettingsCollection = db.collection('ecom_settings');
    const ensureEcomSettingsKeyIndex = async (): Promise<void> => {
      const indexes = await ecomSettingsCollection.indexes();
      if (indexes.some(isSingleKeyIndex)) return;
      await ecomSettingsCollection.createIndex(
        { key: 1 },
        { background: true, name: 'ecom_settings_key' },
      );
    };

    await Promise.all([
      // Orders lookup by userId (account order history)
      db.collection('ecom_orders').createIndex(
        { userId: 1, createdAt: -1 },
        { background: true, name: 'orders_user_date' },
      ),
      // Orders lookup by orderId (confirmation, status polling, admin)
      db.collection('ecom_orders').createIndex(
        { orderId: 1 },
        { background: true, name: 'orders_order_id', unique: true, sparse: true },
      ),
      // Orders lookup by payuOrderId (PayU IPN webhook handler)
      db.collection('ecom_orders').createIndex(
        { payuOrderId: 1 },
        { background: true, name: 'orders_payu_id', sparse: true },
      ),
      // Fulfillment dashboard: filter carrier-specific orders and sort newest first
      db.collection('ecom_orders').createIndex(
        { shippingCarrier: 1, createdAt: -1 },
        { background: true, name: 'orders_shipping_carrier_date', sparse: true },
      ),
      // InPost webhook lookup by tracking number
      db.collection('ecom_orders').createIndex(
        { 'inpostShipment.trackingNumber': 1 },
        { background: true, name: 'orders_inpost_tracking', sparse: true },
      ),
      // InPost webhook event audit/idempotency history
      db.collection('ecom_orders').createIndex(
        { inpostEventIds: 1 },
        { background: true, name: 'orders_inpost_event_ids', sparse: true },
      ),
      // Wishlist lookup by userId (one doc per user, upserted)
      db.collection('ecom_wishlists').createIndex(
        { userId: 1 },
        { background: true, name: 'wishlists_user', unique: true },
      ),
      // User lookup by email (login, register duplicate check)
      db.collection('ecom_users').createIndex(
        { email: 1 },
        { background: true, name: 'users_email', unique: true },
      ),
      ensureEcomSettingsKeyIndex(),
    ]);
  } catch {
    // Non-fatal.
  }
}
