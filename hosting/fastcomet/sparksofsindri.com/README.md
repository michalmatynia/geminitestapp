# FastComet File Storage Endpoint

This folder contains the PHP endpoint expected by the app's FastComet storage
client. Copy the contents of `public_html/` into your FastComet account's
`public_html/` folder.

## FastComet Account Details

Support confirmed these routing details for this account:

- Server hostname: `s13612.fra1.stableserver.net`
- Server IP: `209.42.31.54`
- Public domain: `sparksofsindri.com`
- Public web root: `public_html`

`public_ftp` is not used for this flow. Files that need public URLs for the
local Products app and the Vercel storefront must live under `public_html`.

DNS must point the public domain at FastComet before the Products app or Vercel
can use the normal URL:

```text
sparksofsindri.com.      A      209.42.31.54
www.sparksofsindri.com.  CNAME  sparksofsindri.com.
```

The server hostname `s13612.fra1.stableserver.net` is useful for support and
FTP/cPanel orientation, but it does not serve the `sparksofsindri.com` public web root
as the app's upload endpoint.

## Layout On FastComet

```text
public_html/
  .htaccess
  api/
    uploads/
      index.php
      bootstrap.php
      config.php
      delete/
        index.php
      .htaccess
  uploads/
    .htaccess
```

The `.htaccess` files include `PassengerEnabled off` so an existing cPanel
Node.js/Passenger app cannot catch `/api/uploads/index.php` and return the old
Express storefront HTML. If the endpoint still returns `x-powered-by: Express`,
upload the root `public_html/.htaccess` too or disable the Node.js app for the
domain in cPanel Application Manager.

Create `public_html/api/uploads/config.php` from
`config.example.php`, then set:

- `username`: the same value used as `FASTCOMET_STORAGE_USERNAME`
- `auth_token`: the same value used as `FASTCOMET_STORAGE_TOKEN`
- `public_base_url`: `https://sparksofsindri.com` when SSL is active, otherwise `http://sparksofsindri.com`

Uploaded app files are written below `public_html/uploads/...`, so a product
image public path like `/uploads/products/SKU/file.webp` is served as:

```text
https://sparksofsindri.com/uploads/products/SKU/file.webp
```

## App Configuration

Configure the local Products app with local mirroring enabled:

```sh
npm run storage:configure:fastcomet -- \
  --source=fastcomet \
  --base-url=https://sparksofsindri.com \
  --upload-endpoint=https://sparksofsindri.com/api/uploads/index.php \
  --delete-endpoint=https://sparksofsindri.com/api/uploads/delete/index.php \
  --server=sparksofsindri.com \
  --port=443 \
  --username="$FASTCOMET_STORAGE_USERNAME" \
  --token="$FASTCOMET_STORAGE_TOKEN" \
  --keep-local-copy=true \
  --timeout-ms=20000
```

Configure `apps/ecom-web` on Vercel with:

```text
NEXT_PUBLIC_FILE_BASE_URL=https://sparksofsindri.com
```

Prefer HTTPS for both Products and Vercel. Use `http://sparksofsindri.com` only if SSL
is not installed for the domain yet.

## Health Checks

After copying the PHP scaffold into the active FastComet `public_html`, the
upload endpoint should return JSON, not the storefront or an old static app:

```sh
curl -i https://sparksofsindri.com/api/uploads/index.php
```

Expected before auth/config is complete: `application/json` with `401`, `405`,
or a JSON configuration error. If this returns `text/html` or the old
`Medieval Traders` page, the domain is still pointed at the wrong app or
document root. If it returns LiteSpeed `403 Forbidden`, the PHP scaffold is not
readable/executable from the active `public_html` path; re-upload the
`api/uploads/` files and `.htaccess` files, then check file permissions in
cPanel.

Uploaded product files must also return an image content type:

```sh
curl -I https://sparksofsindri.com/uploads/products/SKU/file.webp
```

Expected: `200` with `Content-Type: image/...`. A `200` with
`Content-Type: text/html` means the app is serving a fallback page instead of
the uploaded file.

## Milkbar Designers CMS Media

Milkbar Designers CMS uploads use the same FastComet token, but the app uses
the Milkbar-specific FastComet PHP endpoint and rewrites public upload URLs to:

```text
https://uploads.milkbardesigners.com/uploads/cms/...
```

For this to work, keep `milkbardesigners.com` on Vercel and point a storage
subdomain such as `uploads.milkbardesigners.com` at the FastComet account.

The app writes Milkbar CMS files to these public paths:

```text
/uploads/cms/visualisation  # images
/uploads/cms/models         # .glb / .gltf assets
```

The FastComet `api/uploads/config.php` used by that endpoint must allow 3D
model extensions and MIME types. The bundled `config.example.php` allows
`glb`, `gltf`, `model/gltf-binary`, `model/gltf+json`, and the common
`application/octet-stream` fallback, with a 100MB maximum file size.

A copy-ready Milkbar-specific scaffold is available here:

```text
hosting/fastcomet/milkbardesigners.com/public_html/
```

Copy the contents of that `public_html/` directory into the FastComet document
root for `milkbardesigners.com`, then create `api/uploads/config.php` from the
included `config.example.php`.
