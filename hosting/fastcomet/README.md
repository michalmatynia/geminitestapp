# FastComet File Storage Endpoint

This folder contains the PHP endpoint expected by the app's FastComet storage
client. Copy the contents of `public_html/` into your FastComet account's
`public_html/` folder.

## FastComet Account Details

Support confirmed these routing details for this account:

- Server hostname: `s13612.fra1.stableserver.net`
- Server IP: `209.42.31.54`
- Public domain: `qubrick.io`
- Public web root: `public_html`

`public_ftp` is not used for this flow. Files that need public URLs for the
local Products app and the Vercel storefront must live under `public_html`.

DNS must point the public domain at FastComet before the Products app or Vercel
can use the normal URL:

```text
qubrick.io.      A      209.42.31.54
www.qubrick.io.  CNAME  qubrick.io.
```

The server hostname `s13612.fra1.stableserver.net` is useful for support and
FTP/cPanel orientation, but it does not serve the `qubrick.io` public web root
as the app's upload endpoint.

## Layout On FastComet

```text
public_html/
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

Create `public_html/api/uploads/config.php` from
`config.example.php`, then set:

- `auth_token`: the same value used as `FASTCOMET_STORAGE_AUTH_TOKEN`
- `public_base_url`: `https://qubrick.io` when SSL is active, otherwise `http://qubrick.io`

Uploaded app files are written below `public_html/uploads/...`, so a product
image public path like `/uploads/products/SKU/file.webp` is served as:

```text
https://qubrick.io/uploads/products/SKU/file.webp
```

## App Configuration

Configure the local Products app with local mirroring enabled:

```sh
npm run storage:configure:fastcomet -- \
  --source=fastcomet \
  --base-url=https://qubrick.io \
  --upload-endpoint=https://qubrick.io/api/uploads/index.php \
  --delete-endpoint=https://qubrick.io/api/uploads/delete/index.php \
  --auth-token="$FASTCOMET_STORAGE_AUTH_TOKEN" \
  --keep-local-copy=true \
  --timeout-ms=20000
```

Configure `apps/ecom-web` on Vercel with:

```text
NEXT_PUBLIC_FILE_BASE_URL=https://qubrick.io
```

Prefer HTTPS for both Products and Vercel. Use `http://qubrick.io` only if SSL
is not installed for the domain yet.
