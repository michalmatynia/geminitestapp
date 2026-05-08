import { getDb, getProductsDb } from '@/lib/mongodb';

let productIndexesEnsured = false;
let appIndexesEnsured = false;

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
    const db = await getProductsDb();
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

    await Promise.all([
      // Orders lookup by userId (account order history)
      db.collection('ecom_orders').createIndex(
        { userId: 1, createdAt: -1 },
        { background: true, name: 'orders_user_date' },
      ),
      // Orders lookup by orderId (confirmation, admin)
      db.collection('ecom_orders').createIndex(
        { orderId: 1 },
        { background: true, name: 'orders_order_id', unique: true, sparse: true },
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
    ]);
  } catch {
    // Non-fatal.
  }
}
