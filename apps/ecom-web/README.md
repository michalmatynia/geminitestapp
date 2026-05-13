---
owner: 'Platform Team'
last_reviewed: '2026-05-13'
status: 'active'
doc_type: 'overview'
scope: 'workspace:@app/ecom-web'
canonical: true
---

# STARGATER Ecommerce Web Workspace

`apps/ecom-web` is a standalone Next.js storefront workspace for the STARGATER
ecommerce experience. It owns the customer-facing shop, product browsing,
product detail pages, cart drawer, wishlist, checkout flow, account orders,
editorial content, and the read-only product API for this storefront.

The app is intentionally isolated from the repository-root platform runtime. It
uses workspace-local source under `apps/ecom-web/src`, workspace-local Tailwind
and Next config, and the `@/*` alias for imports inside the ecommerce app.

## Workspace Role

- Owns the STARGATER ecommerce storefront runtime.
- Runs independently from the root platform app, StudiQ app, and CMS Builder
  app.
- Reads exported storefront product copies from the ecommerce MongoDB when configured.
- Falls back to checked-in static demo products when MongoDB is unavailable or
  the Mentios catalog has no matching products.
- Provides a Super Admin CMS layer for storefront copy, global navigation,
  editorial content, stories, lookbook entries, contact, wishlist, and checkout
  content.
- Keeps cart, wishlist, recently viewed products, quick view, toast, theme,
  announcement, and cookie consent state inside the storefront.
- Provides a read-only `/api/products` endpoint for product listing data.

## Common Commands

| Command | Effect |
| --- | --- |
| `npm run dev:ecom` | Starts the ecommerce dev server on port `3300`. |
| `npm run build:ecom` | Builds the ecommerce workspace. |
| `npm run start:ecom` | Starts the built ecommerce workspace on port `3300`. |
| `npm run typecheck:ecom` | Runs TypeScript checks for the ecommerce workspace. |
| `npm run mongo:ecom:up` | Starts the local ecommerce MongoDB on `127.0.0.1:27021`. |
| `npm run mongo:ecom:status` | Prints the local ecommerce MongoDB pid, port, data dir, and log path. |
| `npm run mongo:ecom:down` | Stops the local ecommerce MongoDB. |

Direct workspace commands are equivalent:

| Command | Effect |
| --- | --- |
| `npm run dev -w @app/ecom-web` | Starts `next dev --webpack --port 3300`. |
| `npm run build -w @app/ecom-web` | Runs `next build`. |
| `npm run start -w @app/ecom-web` | Starts `next start --port 3300`. |
| `npm run typecheck -w @app/ecom-web` | Runs `tsc -p tsconfig.json --noEmit --pretty false`. |

Port `3300` is reserved for this workspace so it can run beside
`@app/studiq-web` on `3100` and `@app/cms-builder-web` on `3200`.

## Local Ecommerce MongoDB

Product List EC quick export and the ecommerce storefront local catalog both
use the local ecommerce MongoDB at `mongodb://127.0.0.1:27021/ecom_local`.
Start it from the repository root before exporting products locally:

```sh
npm run mongo:ecom:up
```

Check whether it is running:

```sh
npm run mongo:ecom:status
mongosh "mongodb://127.0.0.1:27021/ecom_local" --quiet --eval 'db.runCommand({ ping: 1 })'
```

Stop it when it is no longer needed:

```sh
npm run mongo:ecom:down
```

The script uses the local `mongod` binary, stores data in
`../database/ecom-mongo-data`, and writes runtime files/logs under
`../database/ecom-mongo-runtime`. If EC quick export reports that the local
ecommerce database is not reachable, run `npm run mongo:ecom:status` first and
then `npm run mongo:ecom:up` if it is not running.

In development, local loopback MongoDB connections fail fast when the service is
down so public pages can fall back without waiting on the full cloud timeout.

## Product Pricing Sync

Product List is the source of truth for ecommerce product prices and pricing
rules. EC quick export writes the product copy with its base price,
`sourcePrice`, source currency metadata, and default price group id. It does not
push price group multipliers or currency records on every product export.

Push currencies and price groups from Products through:

```text
Products -> Pages -> Ecommerce -> Data Synchronisation -> Push pricing system
```

The storefront reads the synced `price_groups` collection and recalculates
catalog, cart, checkout, and PayU BLIK prices from that pricing system. After
changing Product List currencies or price groups, push the pricing system before
checking local or cloud ecommerce storefront prices.

## Environment

Copy `.env.local.example` to `.env.local` when live catalog data is needed.
The app works without these variables by using static fallback products.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | For runtime data | `mongodb://127.0.0.1:27021/ecom_local` | Ecommerce runtime MongoDB connection string for auth, wishlist, orders, and CMS data. Product catalog reads use source-specific ecommerce/product variables first. |
| `MONGODB_DB` | No | `ecom_local` | Database name used by the ecommerce Mongo client. |
| `PRODUCTS_MONGODB_CLOUD_URI` | For deployed live catalog fallback | none | Cloud Product List MongoDB connection. Used by the storefront when `ECOM_MONGODB_CLOUD_URI` is not set. |
| `PRODUCTS_MONGODB_CLOUD_DB` | For deployed live catalog fallback | none | Database name for `PRODUCTS_MONGODB_CLOUD_URI`. |
| `ECOM_MONGODB_LOCAL_URI` | For live catalog | `mongodb://127.0.0.1:27021/ecom_local` | Local ecommerce product catalog MongoDB connection. |
| `ECOM_MONGODB_LOCAL_DB` | For live catalog | `ecom_local` | Local ecommerce product catalog database name. |
| `ECOM_MONGODB_CLOUD_URI` | No | none | Cloud ecommerce product catalog MongoDB connection. |
| `ECOM_MONGODB_CLOUD_DB` | No | none | Cloud ecommerce product catalog database name. Must match the Product List ecommerce export target. |
| `ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT` | No | `local` | Selects local or cloud ecommerce product catalog source. Use `cloud` when testing add/delete visibility against the shared ecommerce export database. |
| `ECOM_MONGODB_FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR` | No | `false` | In development, if connecting to the selected ecommerce/product source fails with a retryable MongoDB error, try the alternate source (local↔cloud) before failing. |
| `MONGODB_FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR` | No | `false` | In development, if CMS/auth/runtime DB connection fails with a retryable MongoDB error, try the alternate source (local↔cloud) before failing. Skipped when `MONGODB_URI` is explicitly set. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` / `MONGODB_CONNECT_TIMEOUT_MS` | No | `1500` local loopback in development, otherwise `12000` | Runtime MongoDB timeout overrides for auth, wishlist, orders, and CMS data. |
| `ECOM_MONGODB_SERVER_SELECTION_TIMEOUT_MS` / `ECOM_MONGODB_CONNECT_TIMEOUT_MS` | No | `1500` local loopback in development, otherwise `12000` | Ecommerce product catalog MongoDB timeout overrides. |
| `MENTIOS_CATALOG_ID` | No | none | Catalog id used to filter products and categories. When omitted, the storefront uses active products from the selected product database. |
| `NEXT_PUBLIC_FILE_BASE_URL` | No | none | Public FastComet file origin used to render `/uploads/products/...` records from Vercel. |
| `NEXT_PUBLIC_ECOM_URL` | Recommended for production | local fallback | Public storefront origin used for sitemap/robots and transactional order tracking links. |
| `NEXT_PUBLIC_BASE_URL` | For PayU BLIK webhooks | `NEXT_PUBLIC_ECOM_URL` / Vercel URL fallback | Public storefront origin used to build the PayU `notifyUrl`. Must be reachable by PayU. |
| `NEXT_PUBLIC_MAIN_APP_URL` | No | none | Main Products app origin used only for legacy `/api/files/preview` image fallback and local upload URL rewrites. |
| `NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN` | For InPost map selector | none | Public InPost Geowidget token used by checkout to show the Paczkomat map selector for Poland-only InPost delivery. |
| `PAYU_API_URL` | For BLIK payments | `https://secure.snd.payu.com` | PayU API origin. Use sandbox for development and `https://secure.payu.com` for production. |
| `PAYU_POS_ID` / `PAYU_CLIENT_ID` / `PAYU_CLIENT_SECRET` | For BLIK payments | none | PayU POS and OAuth credentials used when creating BLIK orders. |
| `PAYU_SECOND_KEY` | For PayU webhooks | none | Verifies `OpenPayU-Signature` for `/api/webhooks/payu`. |
| `RESEND_API_KEY` | For order emails | none | Sends order confirmation emails. Without it, order creation still works but confirmation email delivery is skipped. |
| `INPOST_API_URL` / `INPOST_API_TOKEN` / `INPOST_ORGANIZATION_ID` | For InPost fulfillment | sandbox URL / none | ShipX settings used to create InPost parcel-locker shipments after payment confirmation. |
| `INPOST_GROUP_API_URL` / `INPOST_OAUTH_TOKEN_URL` / `INPOST_OAUTH_CLIENT_ID` / `INPOST_OAUTH_CLIENT_SECRET` | For InPost labels/status refresh | stage URL / none | InPost Group Shipping API v2 settings for label downloads and manual status refresh. If OAuth credentials are omitted, `INPOST_API_TOKEN` is reused as a bearer token. |
| `INPOST_WEBHOOK_SECRET` | For InPost tracking webhooks | none | Shared HMAC secret for `/api/webhooks/inpost`. Unsigned events are rejected. |
| `FASTCOMET_STORAGE_UPLOAD_URL` | For CMS image uploads | none | FastComet PHP upload endpoint used by admin CMS image uploaders. |
| `FASTCOMET_STORAGE_AUTH_TOKEN` | For CMS image uploads | none | Bearer token expected by the FastComet upload endpoint. |
| `FASTCOMET_STORAGE_BASE_URL` | For CMS image uploads | `NEXT_PUBLIC_FILE_BASE_URL` | Public FastComet origin used when upload responses return relative paths. |

The Mongo client is implemented in `src/lib/mongodb.ts`. Storefront product
catalog reads use `ECOM_MONGODB_*` first, then `PRODUCTS_MONGODB_*` as a cloud
fallback. Generic `MONGODB_URI` is only a last-resort product catalog fallback
when no ecommerce/product catalog variables are configured. Auth, wishlist,
order, and CMS paths use the ecommerce `MONGODB_*` routing. In development,
clients are cached to avoid reconnecting on every Next.js reload.

## Route Map

| Route | File | Behavior |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Home page. Fetches up to 6 live Mentios products, then falls back to static featured products. |
| `/collections/[slug]` | `src/app/collections/[slug]/page.tsx` | CMS-labeled collection page for `womenswear`, `menswear`, `objects`, or `accessories`. Fetches live products first, static collection fallback second. |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` | CMS-labeled product detail page. Resolves live Mentios product first, static product fallback second. |
| `/checkout` | `src/app/checkout/page.tsx` | CMS-backed checkout UI with information, shipping, payment, and confirmation steps. Clears local cart after confirmed payment. |
| `/order-status` | `src/app/order-status/page.tsx` | Guest order status lookup. Confirmation and email links can pass `?order=ARC-...` to prefill and check status. |
| `/wishlist` | `src/app/wishlist/page.tsx` | CMS-backed local wishlist page. Supports static and live products by using the saved product snapshot. |
| `/account` | `src/app/account/page.tsx` | CMS-backed customer account dashboard with real order history, settings UI, and Super Admin CMS/order tools. |
| `/about` | `src/app/about/page.tsx` | CMS-backed brand story page. |
| `/values` | `src/app/values/page.tsx` | CMS-backed sustainability and values page. |
| `/lookbook` | `src/app/lookbook/page.tsx` | CMS-backed editorial lookbook page with database-backed lookbook entries and static fallback. |
| `/stories` | `src/app/stories/page.tsx` | CMS-backed story index with database-backed stories and static fallback. |
| `/stories/[slug]` | `src/app/stories/[slug]/page.tsx` | CMS-backed story detail page. |
| `/contact` | `src/app/contact/page.tsx` | CMS-backed contact form UI. Submits locally and shows a toast, with no backend send step yet. |
| `/api/products` | `src/app/api/products/route.ts` | Read-only JSON product listing endpoint with live Mentios data and static fallback. |

## Product API

`GET /api/products` returns ecommerce product data.

Query parameters:

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `collection` | string | none | Filters to a resolved collection slug after Mongo category mapping. |
| `q` | string | none | Searches product name, SKU, category, and description where the source supports it. |
| `ids` | comma-separated string | none | Restricts the result to specific product ids. Live lookup still respects the configured catalog. |
| `limit` | number | `100` | Capped at `200`. |
| `skip` | number | `0` | Passed to Mongo before collection filtering. |

Response shape:

```json
{
  "products": [],
  "total": 0,
  "source": "mentios"
}
```

`source` is either `mentios` or `static`. The route is marked
`dynamic = 'force-dynamic'` because it is intended to read current catalog
state.

## Catalog Data Model

The storefront renders the local `Product` shape from `src/data/products.ts`:

```ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  collectionSlug: string;
  price: number;
  priceDisplay: string;
  tag?: string;
  gradient: string;
  gradientAlt?: string;
  description: string;
  details: string[];
  care: string[];
  sizes: string[];
  isNew?: boolean;
  isSoldOut?: boolean;
};
```

Static fallback data lives in `src/data/products.ts` and defines:

- `PRODUCTS`, the demo product list.
- `COLLECTIONS`, the four public collection definitions.
- `getProduct(slug)`.
- `getProductsByCollection(collectionSlug)`.

Live catalog mapping lives in `src/lib/mentios.ts`. It reads:

- `products` collection for product documents.
- `product_categories` collection for category labels.

Mentios catalog membership is accepted when either condition is true:

- `catalogId === MENTIOS_CATALOG_ID`
- `catalogs[].catalogId === MENTIOS_CATALOG_ID`

The live product filter also excludes products where `published === false` or
`archived === true`.

Live field mapping:

| Mongo field | Storefront field |
| --- | --- |
| `_id` | `id` |
| `sku` | Preferred source for `slug`, slugified |
| `_id` | Fallback source for `slug` |
| localized `name` | `name` |
| localized `description` | `description` |
| `price` | `price` and formatted `priceDisplay` |
| `categoryId` plus `product_categories.name` | `category` and heuristic `collectionSlug` |
| `imageLinks`, `images.imageFile.filepath`, and SKU upload folders | `imageUrl`, preserving absolute URLs and converting `/uploads/products/...` paths through `NEXT_PUBLIC_FILE_BASE_URL` when configured |
| `isNew` | `isNew` and `New` tag |
| `stock` | `Last pieces` or `Sold out` tag |

Category-to-collection mapping is heuristic. Category names containing womens
terms map to `womenswear`; mens terms map to `menswear`; bags, accessories,
jewelry, belts, scarves, wallets, purses, hats, caps, shoes, or boots map to
`accessories`; everything else maps to `objects`.

Live product visuals use the existing public product-upload folder when MongoDB
stores an `imageLinks` value or `images.imageFile.filepath` under
`/uploads/products/...`. When those fields are missing, the app also checks for
a matching SKU folder under `public/uploads/products/<SKU>/` and uses the first
image in that folder. If no usable image is available, the app falls back to
deterministic CSS gradients.

## Runtime Data Flow

Home:

1. `src/app/page.tsx` calls `getMentiosProducts({ limit: 6 })`.
2. If live products are returned, `FeaturedProducts` renders them.
3. If live products are empty or MongoDB is unavailable, static featured
   products render.

Collections:

1. `src/app/collections/[slug]/page.tsx` validates the slug against
   `COLLECTIONS`.
2. It calls `getMentiosProducts({ limit: 100, collectionSlug: slug })`.
3. It falls back to `getProductsByCollection(slug)` when no live products match.

Product detail:

1. `src/app/products/[slug]/page.tsx` calls `getMentiosProduct(slug)`.
2. Live lookup stays inside the configured Mentios catalog.
3. If no live product is found, `getProduct(slug)` resolves static data.
4. Related products come from live products in the same collection when
   possible, otherwise static products.

Checkout and orders:

1. `/checkout` refreshes cart item prices from `/api/products` before payment.
2. Shipping methods come from checkout CMS zones. InPost is shown only for
   Poland addresses and requires a Paczkomat from the geowidget or manual code
   fallback. Poczta Polska and DPD are regular tracked carrier methods.
3. The BLIK route validates canonical product prices, currency, discounts, and
   shipping price server-side before any payment request.
4. A `pending_payment` order is inserted before the PayU order is created. PayU
   receives the local `orderId` as `extOrderId`, so early IPN webhooks can
   confirm the order even before `payuOrderId` is attached locally.
5. If PayU rejects the BLIK code or the gateway call fails after the local order
   is created, that order is marked `cancelled`. If PayU accepts the request,
   the route stores `payuOrderId` and the client polls `/api/orders/[orderId]/status`.
6. The PayU webhook only promotes `pending_payment` orders to `processing` on
   `COMPLETED`, queues the confirmation email once, and creates an InPost
   shipment when applicable. Late `PENDING`, `CANCELED`, or repeated
   `COMPLETED` events do not downgrade completed orders.
7. InPost tracking webhooks update order status to `in-transit`, `delivered`,
   or `cancelled`. Late conflicting terminal events are recorded as stale
   tracking history without flipping a delivered/cancelled order.
8. Signed-in customers see orders under `/account?tab=orders`; guests can use
   `/order-status?order=ARC-...`. Public tracking output exposes only safe
   `http`/`https` tracking links.

Wishlist:

1. Product detail and quick view save a product snapshot to local storage.
2. `/wishlist` renders that snapshot directly.
3. Moving an item to the bag uses the saved snapshot, so live Mentios products
   do not need to exist in `PRODUCTS`.

## Client State

| State | Owner | Persistence |
| --- | --- | --- |
| Cart | `src/context/CartContext.tsx` | In memory only. Clears on refresh or checkout confirmation. |
| Wishlist | `src/context/WishlistContext.tsx` | `localStorage` key `arcana-wishlist`. |
| Recently viewed | `src/context/RecentlyViewedContext.tsx` | `localStorage` key `arcana-recently-viewed`, max 6 items. |
| Quick view | `src/context/QuickViewContext.tsx` | In memory only. |
| Toasts | `src/context/ToastContext.tsx` | In memory only. |
| Theme | `src/components/SiteNav.tsx` plus root init script in `src/app/layout.tsx` | `localStorage` key `arcana-theme`, either `nightly` or `daily`. |
| Announcement banner | `src/components/SiteNav.tsx` | CMS-controlled dismiss key, default `arcana-banner-v2`. |
| Cookie consent | `src/components/CookieConsent.tsx` | CMS-controlled storage key, default `arcana-cookie-consent`. |

Providers are mounted in `src/app/layout.tsx` around the whole app. Global UI
such as the cart drawer, toast container, back-to-top button, quick view modal,
and cookie consent are mounted once in the root layout.

`src/proxy.ts` is intentionally a no-op proxy. It keeps the ecommerce workspace
isolated from the repository-root platform proxy when Next.js infers a broader
workspace root in this monorepo.

## Component Map

Primary storefront components:

- `SiteNav`: fixed navigation, search trigger, theme toggle, cart, wishlist,
  account link, mobile menu, announcement banner.
- `SearchOverlay`: client search overlay over static fallback products.
- `HeroSection`: home hero.
- `CategoriesGrid`: home category cards.
- `FeaturedProducts`: home featured grid with live/static product support.
- `QuickViewModal`: live/static product quick view.
- `CartDrawer`: bag drawer and quantity controls.
- `RecentlyViewed`: home module backed by recently viewed local storage.
- `ProductReviews`: static review display from `src/data/reviews.ts`.
- `SiteFooter`: footer navigation and brand links.
- `CookieConsent`: cookie notice.
- `BackToTop`: scroll affordance.

Content data:

- `src/data/products.ts`: product and collection fallback data.
- `src/data/stories.ts`: editorial story content.
- `src/data/lookbook.ts`: lookbook content.
- `src/data/reviews.ts`: static review content.
- `src/data/*Content.ts`: CMS defaults and validators for page/global content.

## CMS Layer

The content CMS is intentionally simple and local to this workspace. It stores
validated content documents in MongoDB collection `ecom_cms_pages`, keyed by
`{ page, locale }`, and stores editable story/lookbook entries in dedicated
collections.

CMS access:

- The editor is mounted on `/account` for Super Admin users.
- Current Super Admin gate is handled by `src/lib/auth.ts`; the expected admin
  account is `mmatynia@gmail.com`.
- Public pages read CMS content server-side through `src/lib/cms.ts`.
- If MongoDB is unavailable, public pages fall back to checked-in defaults.
- CMS mutation routes require a Super Admin session and return `403` for public
  users.

Main CMS routes:

| Route | Purpose |
| --- | --- |
| `/api/cms/home` | Home hero, categories, featured section, manifesto, editorial strip, and recently viewed labels. |
| `/api/cms/site` | Global nav, announcement, footer, search overlay, cookie consent, cart drawer, auth modal, quick view, back-to-top, and 404-page labels. |
| `/api/cms/about` | About page copy and structured sections. |
| `/api/cms/values` | Values page copy, stats, materials, commitments, and closing CTAs. |
| `/api/cms/contact` | Contact hero, info links, form labels, subject options, and success state. |
| `/api/cms/account` | Account dashboard, signed-out state, sidebar, orders, settings, and Super Admin console labels. |
| `/api/cms/wishlist` | Wishlist header, empty state, action labels, and toast labels. |
| `/api/cms/checkout` | Checkout steps, form fields, shipping methods, payment labels, confirmation text, and order summary labels. |
| `/api/cms/products` | Product listing, collection filters, product detail labels, size guide, reviews, and shipping/returns copy. |
| `/api/cms/stories-page` | Story index/detail page labels and filters. |
| `/api/cms/lookbook-page` | Lookbook masthead, archive, and CTA copy. |
| `/api/cms/stories` and `/api/cms/stories/[slug]` | Editable story entries in `ecom_stories`. |
| `/api/cms/lookbook` and `/api/cms/lookbook/[id]` | Editable lookbook entries in `ecom_lookbook`. |

CMS source files:

| File | Role |
| --- | --- |
| `src/lib/cms.ts` | Shared `get*Content`, `save*Content`, parser, fallback, and snapshot functions. |
| `src/lib/storiesCms.ts` | Story collection access with static fallback. |
| `src/lib/lookbookCms.ts` | Lookbook collection access with static fallback. |
| `src/components/AdminCmsEditor.tsx` | Super Admin editing surface. |
| `src/context/SiteContentContext.tsx` | Client context for global site CMS content. |
| `src/data/homeContent.ts` | Home CMS schema/defaults/validation. |
| `src/data/siteContent.ts` | Global site CMS schema/defaults/validation. |
| `src/data/aboutContent.ts` | About page CMS schema/defaults/validation. |
| `src/data/valuesContent.ts` | Values page CMS schema/defaults/validation. |
| `src/data/contactContent.ts` | Contact page CMS schema/defaults/validation. |
| `src/data/accountContent.ts` | Account page CMS schema/defaults/validation. |
| `src/data/wishlistContent.ts` | Wishlist page CMS schema/defaults/validation. |
| `src/data/checkoutContent.ts` | Checkout page CMS schema/defaults/validation. |
| `src/data/productsContent.ts` | Product listing/detail CMS schema/defaults/validation. |
| `src/data/storiesPageContent.ts` | Stories page CMS schema/defaults/validation. |
| `src/data/lookbookPageContent.ts` | Lookbook page CMS schema/defaults/validation. |

Operational notes:

- Save actions call `revalidatePath` for the affected public routes.
- The site-wide CMS document calls `revalidatePath('/', 'layout')` because nav,
  footer, search, cart, and cookie content are mounted from the root layout.
- Missing locale documents can be inspected with
  `npm run cms:ecom:locales:backfill`. Use
  `npm run cms:ecom:locales:backfill:apply` to create missing records after
  reviewing the dry-run report. The backfill covers page CMS documents,
  stories, and lookbook entries, and preserves legacy default-locale records by
  adding `locale: "en"` instead of duplicating them.
- Structured editor fields that represent lists use pipe-delimited rows, for
  example `label | href` or `id | label | detail | price | priceLabel`.
- Story and lookbook entry editors use JSON drafts because the entries are
  larger content records.
- This CMS covers content only. Styling, layout, product catalog mutations,
  payments, and order management are still outside this layer.

## Styling System

The design system is local to the ecommerce workspace.

- Fonts are loaded in `src/app/layout.tsx` through `next/font/google`:
  `Cormorant_SC`, `Jost`, and `Courier_Prime`.
- Theme tokens live in `src/app/globals.css` as CSS custom properties. The default
  theme is `nightly`; `daily` is the light alternate and maps semantic tokens
  back to the same STARGATER brand palette.
- Tailwind reads `src/**/*.{ts,tsx}` through `tailwind.config.ts`.
- Theme mode is class-based and toggled on the document root.
- Core reusable classes include `type-display-*`, `type-label`,
  `type-price`, `btn-primary`, `btn-ghost`, `product-card`, and `grain`.

Product imagery can render from FastComet by setting
`NEXT_PUBLIC_FILE_BASE_URL`. Static fallback products and live catalog records
that still contain `/uploads/products/...` paths are served from that file host;
legacy `https://qubrick.io/uploads/...` records are rewritten to the configured
file host. While FastComet routing is unavailable in local development,
`NEXT_PUBLIC_FILE_FALLBACK_BASE_URL=http://localhost:3000` lets failed upload
images retry through the Product List app's local `/uploads/...` route.

## Implementation Status

Completed or working locally:

- Standalone Next.js 16 workspace.
- Root command aliases for dev, build, start, and typecheck.
- Static product fallback catalog.
- Live Mentios product listing, collection, and product-detail resolution.
- Product cards, quick add, quick view, cart drawer, wishlist, and recently
  viewed products.
- Multi-step checkout UI with server-validated promo-code handling, PayU BLIK
  payment creation, local order persistence, order-status polling, and
  confirmation state.
- Poczta Polska, DPD, and Poland-only InPost shipping methods, including
  Paczkomat selection, manual carrier tracking, InPost shipment creation,
  label download, status refresh, and webhook-based tracking updates.
- Account order history, guest order-status lookup, contact, about, values,
  lookbook, and stories surfaces.
- Read-only product API.
- Super Admin content CMS for home, global site content, about, values,
  contact, account, wishlist, checkout, products, stories, and lookbook.

Partial or mocked:

- Card payments and tax calculation are not implemented; checkout currently
  supports PayU BLIK only.
- Account profile/settings data is still mostly static outside real order
  history and Super Admin tools.
- Contact form shows a local success state but does not send messages.
- Reviews are static and only exist for fallback product slugs.
- Search overlay currently searches only `src/data/products.ts`, not live
  Mentios products.
- Live products currently map `details`, `care`, and `sizes` to empty arrays.
- Product image rendering uses local upload folders and CSS fallback visuals,
  but still needs a permanent asset/CDN strategy.
- There is no admin product-catalog mutation surface in this workspace.
- The ecommerce workspace has a Vitest script; run targeted tests with
  `npm run test --workspace @app/ecom-web -- <path>`.

Quality notes:

- `npm run typecheck:ecom` is the main local validation command.
- `npm run build:ecom` validates types through Next.js and produces the
  production bundle.
- `npm run dev:ecom` currently uses the webpack dev bundler because Turbopack
  dev compilation hangs on the first page in this workspace. Production builds
  still use the default Next.js build path.
- Before production deployment, complete live payment-provider credential
  configuration, production webhook URLs, tax handling, and focused tests for
  catalog fallback, wishlist/cart behavior, and `/api/products`.

## Development Workflow

1. Copy environment values when live catalog data is needed:

   ```bash
   cp apps/ecom-web/.env.local.example apps/ecom-web/.env.local
   ```

2. Start the storefront:

   ```bash
   npm run dev:ecom
   ```

3. Open `http://localhost:3300`.

4. Validate local changes:

   ```bash
   npm run typecheck:ecom
   ```

5. Build when preparing a deployment:

   ```bash
   npm run build:ecom
   ```

6. For CMS work, log in as `mmatynia@gmail.com`, open `/account`, and use the
   Super Admin CMS editor. Public users should receive `403` from CMS mutation
   and snapshot routes.

## Troubleshooting

If the storefront shows only demo products:

- Confirm `ECOM_MONGODB_CLOUD_URI`/`ECOM_MONGODB_CLOUD_DB`,
  `PRODUCTS_MONGODB_CLOUD_URI`/`PRODUCTS_MONGODB_CLOUD_DB`, or
  `MONGODB_URI`/`MONGODB_DB` points at a cloud database containing `products` and
  `product_categories`.
- On Vercel, localhost product DB settings are ignored when a cloud product DB is
  configured, so a copied local `*_ACTIVE_SOURCE_DEFAULT=local` value should not
  force the storefront into static fallback.
- Confirm products are in `MENTIOS_CATALOG_ID` through `catalogId` or
  `catalogs[].catalogId`, or leave `MENTIOS_CATALOG_ID` unset to show all active
  products in the selected product database.
- Confirm products are not explicitly unpublished or archived.

If a live product card opens a 404 page:

- Confirm the product still belongs to the configured Mentios catalog.
- Confirm the product has a stable SKU. SKU is the preferred slug source.
- If SKU values changed, old links can stop resolving because slugs are derived
  from the current SKU.

If wishlist "Move to bag" adds a product at price `0`:

- The wishlist item probably came from older local storage before price was
  saved. Remove and re-save the product, or clear the `arcana-wishlist` key.

If the port is already in use:

- Stop the process using port `3300`, or run the Next.js command manually from
  `apps/ecom-web` with a temporary port.

## Related Docs

- Workspace command reference:
  [`../../docs/build/application-workspaces-and-commands.md`](../../docs/build/application-workspaces-and-commands.md)
- Root repository guide: [`../../README.md`](../../README.md)
- Static products: [`src/data/products.ts`](src/data/products.ts)
- Mentios catalog adapter: [`src/lib/mentios.ts`](src/lib/mentios.ts)
- Mongo client: [`src/lib/mongodb.ts`](src/lib/mongodb.ts)
