---
owner: 'Platform Team'
last_reviewed: '2026-05-07'
status: 'active'
doc_type: 'overview'
scope: 'workspace:@app/ecom-web'
canonical: true
---

# ARCANA Ecommerce Web Workspace

`apps/ecom-web` is a standalone Next.js storefront workspace for the ARCANA
ecommerce experience. It owns the customer-facing shop, product browsing,
product detail pages, cart drawer, wishlist, checkout flow, account mock,
editorial content, and the read-only product API for this storefront.

The app is intentionally isolated from the repository-root platform runtime. It
uses workspace-local source under `apps/ecom-web/src`, workspace-local Tailwind
and Next config, and the `@/*` alias for imports inside the ecommerce app.

## Workspace Role

- Owns the ARCANA ecommerce storefront runtime.
- Runs independently from the root platform app, StudiQ app, and CMS Builder
  app.
- Reads live Mentios catalog products from MongoDB when configured.
- Falls back to checked-in static demo products when MongoDB is unavailable or
  the Mentios catalog has no matching products.
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

Direct workspace commands are equivalent:

| Command | Effect |
| --- | --- |
| `npm run dev -w @app/ecom-web` | Starts `next dev --webpack --port 3300`. |
| `npm run build -w @app/ecom-web` | Runs `next build`. |
| `npm run start -w @app/ecom-web` | Starts `next start --port 3300`. |
| `npm run typecheck -w @app/ecom-web` | Runs `tsc -p tsconfig.json --noEmit --pretty false`. |

Port `3300` is reserved for this workspace so it can run beside
`@app/studiq-web` on `3100` and `@app/cms-builder-web` on `3200`.

## Environment

Copy `.env.local.example` to `.env.local` when live catalog data is needed.
The app works without these variables by using static fallback products.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | For live catalog | none | MongoDB connection string. |
| `MONGODB_DB` | No | `app` | Database name used by the ecommerce Mongo client. |
| `MENTIOS_CATALOG_ID` | No | `catalog-mentios` | Catalog id used to filter products and categories. |
| `NEXT_PUBLIC_MAIN_APP_URL` | No | none | Reserved for future product image URL construction. The current UI renders product visuals as CSS gradient compositions. |

The Mongo client is implemented in `src/lib/mongodb.ts`. In development, it is
cached on `globalThis._ecomMongoClient` to avoid reconnecting on every Next.js
reload.

## Route Map

| Route | File | Behavior |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Home page. Fetches up to 6 live Mentios products, then falls back to static featured products. |
| `/collections/[slug]` | `src/app/collections/[slug]/page.tsx` | Collection page for `womenswear`, `menswear`, `objects`, or `accessories`. Fetches live products first, static collection fallback second. |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` | Product detail page. Resolves live Mentios product first, static product fallback second. |
| `/checkout` | `src/app/checkout/page.tsx` | Client checkout UI with information, shipping, payment, and confirmation steps. Clears local cart on mock order placement. |
| `/wishlist` | `src/app/wishlist/page.tsx` | Local wishlist page. Supports static and live products by using the saved product snapshot. |
| `/account` | `src/app/account/page.tsx` | Mock customer account dashboard with order history and settings. |
| `/about` | `src/app/about/page.tsx` | Brand story page. |
| `/values` | `src/app/values/page.tsx` | Sustainability and values page. |
| `/lookbook` | `src/app/lookbook/page.tsx` | Editorial lookbook page backed by `src/data/lookbook.ts`. |
| `/stories` | `src/app/stories/page.tsx` | Story index backed by `src/data/stories.ts`. |
| `/stories/[slug]` | `src/app/stories/[slug]/page.tsx` | Story detail page. |
| `/contact` | `src/app/contact/page.tsx` | Contact form UI. Submits locally and shows a toast, with no backend send step yet. |
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
| `imageLinks`, `images.imageFile.filepath`, and SKU upload folders | `imageUrl`, normalized to `/uploads/products/...` when possible |
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
| Theme | `src/components/SiteNav.tsx` | `localStorage` key `arcana-theme`. |
| Announcement banner | `src/components/SiteNav.tsx` | `localStorage` key `arcana-banner-v1`. |
| Cookie consent | `src/components/CookieConsent.tsx` | Browser storage in the component. |

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

## Styling System

The design system is local to the ecommerce workspace.

- Fonts are loaded in `src/app/layout.tsx` through `next/font/google`:
  `Cormorant_SC`, `Jost`, and `Courier_Prime`.
- Theme tokens live in `src/app/globals.css` as CSS custom properties.
- Tailwind reads `src/**/*.{ts,tsx}` through `tailwind.config.ts`.
- Dark mode is class-based and toggled on the document root.
- Core reusable classes include `type-display-*`, `type-label`,
  `type-price`, `btn-primary`, `btn-ghost`, `product-card`, and `grain`.

Product imagery currently reuses the local `public/uploads/products` folder.
Static fallback products are temporarily mapped to existing upload files, and
live catalog products normalize MongoDB image paths or matching SKU folders to
`/uploads/products/...` when possible.

## Implementation Status

Completed or working locally:

- Standalone Next.js 16 workspace.
- Root command aliases for dev, build, start, and typecheck.
- Static product fallback catalog.
- Live Mentios product listing, collection, and product-detail resolution.
- Product cards, quick add, quick view, cart drawer, wishlist, and recently
  viewed products.
- Multi-step checkout UI with promo-code handling and local confirmation state.
- Account, contact, about, values, lookbook, and stories surfaces.
- Read-only product API.

Partial or mocked:

- Checkout does not create orders, charge cards, calculate tax, or call a
  payment provider.
- Account data and order history are mock UI only.
- Contact form shows a local success state but does not send messages.
- Reviews are static and only exist for fallback product slugs.
- Search overlay currently searches only `src/data/products.ts`, not live
  Mentios products.
- Live products currently map `details`, `care`, and `sizes` to empty arrays.
- Real product image rendering is not wired yet.
- There is no admin/catalog mutation surface in this workspace.
- There is no ecommerce-specific test script yet.

Quality notes:

- `npm run typecheck:ecom` is the main local validation command.
- `npm run build:ecom` validates types through Next.js and produces the
  production bundle.
- `npm run dev:ecom` currently uses the webpack dev bundler because Turbopack
  dev compilation hangs on the first page in this workspace. Production builds
  still use the default Next.js build path.
- Before production deployment, wire the checkout backend and add focused tests
  for catalog fallback, wishlist/cart behavior, and `/api/products`.

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

## Troubleshooting

If the storefront shows only demo products:

- Confirm `MONGODB_URI` is set in `apps/ecom-web/.env.local`.
- Confirm `MONGODB_DB` points at the database containing `products` and
  `product_categories`.
- Confirm products are in `MENTIOS_CATALOG_ID` through `catalogId` or
  `catalogs[].catalogId`.
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
