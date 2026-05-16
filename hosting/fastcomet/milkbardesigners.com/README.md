# Milkbar Designers FastComet Upload Endpoint

Copy the contents of `public_html/` in this folder into the FastComet document
root for `milkbardesigners.com`.

The GeminiTest app uses these public paths for Milkbar CMS uploads:

```text
/uploads/cms/visualisation  # CMS images
/uploads/cms/models         # .glb / .gltf models
```

The `milkbardesigners.com` website can stay on Vercel. FastComet should be
used as a file origin through a storage subdomain:

```text
uploads.milkbardesigners.com -> 209.42.31.54
```

In cPanel, create `uploads.milkbardesigners.com` as a subdomain/addon domain
whose document root is the same `public_html` folder used below. Do not point
the subdomain document root at `public_html/uploads`, because the app stores
public file paths with the `/uploads/...` prefix. After the DNS record exists,
issue AutoSSL/SSL for `uploads.milkbardesigners.com`.

After copying, create:

```text
public_html/api/uploads/config.php
```

from:

```text
public_html/api/uploads/config.example.php
```

Set `username` and `auth_token` to the same values configured in the app's
FastComet File Storage settings. The app reads those credentials from the
persisted `fastcomet_storage_config_v1` setting first, with `FASTCOMET_STORAGE_*`
environment variables only as a fallback. You do not need separate
`MILKBAR_FASTCOMET_STORAGE_TOKEN` or `MILKBAR_FASTCOMET_STORAGE_USERNAME` values
for normal CMS uploads when the Stargater/Product FastComet settings are already
saved. Keep `public_base_url` as:

```text
https://uploads.milkbardesigners.com
```

Optional app-side overrides are available for routing only:

```text
MILKBAR_FASTCOMET_PUBLIC_BASE_URL=https://uploads.milkbardesigners.com
MILKBAR_FASTCOMET_UPLOAD_URL=https://milkbardesigners.com/api/uploads/index.php
MILKBAR_FASTCOMET_DELETE_URL=https://milkbardesigners.com/api/uploads/delete/index.php
MILKBAR_FASTCOMET_SERVER=milkbardesigners.com
MILKBAR_FASTCOMET_PORT=443
MILKBAR_FASTCOMET_RESOLVE_IP=209.42.31.54
```

Do not use these to duplicate credentials. Credentials stay in the shared
FastComet File Storage settings unless you explicitly need a local smoke-test
override.

Required copied files:

```text
public_html/.htaccess
public_html/api/uploads/.htaccess
public_html/api/uploads/bootstrap.php
public_html/api/uploads/index.php
public_html/api/uploads/delete/index.php
public_html/api/uploads/config.example.php
public_html/uploads/.htaccess
```

Health check:

```sh
curl -i --resolve milkbardesigners.com:443:209.42.31.54 https://milkbardesigners.com/api/uploads/index.php
```

Expected before auth: JSON with `401`, `405`, or a JSON configuration error.
If HTML is returned, the domain is routed to the wrong document root or a
Passenger/Node app is intercepting the request.

Uploaded file checks:

```sh
curl -I https://uploads.milkbardesigners.com/uploads/cms/visualisation/example.webp
curl -I https://uploads.milkbardesigners.com/uploads/cms/models/example.glb
```

These URLs must return `200` over HTTPS before the Vercel-hosted website can
load the assets. A certificate mismatch or a `404` on
`uploads.milkbardesigners.com` means the cPanel subdomain document root or
AutoSSL certificate is still not configured for the upload origin.

Repo smoke test from the GeminiTest app root:

```sh
npm run storage:smoke:milkbar-fastcomet
```

Export the current arch-web procedural models into the FastComet `public_html`
tree from the GeminiTest app root:

```sh
npm run storage:export:milkbar-procedural-models
```

This writes:

```text
hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural/milkbar-hero-background.gltf
hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural/milkbar-every-line-interior.gltf
hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural/milkbar-project-mbd-001.gltf
hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural/milkbar-project-mbd-002.gltf
hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural/milkbar-project-mbd-003.gltf
```

Upload and assign Milkbar CMS model files from the GeminiTest app root:

```sh
npm run storage:upload:milkbar-models -- \
  --hero=/absolute/path/hero.glb \
  --interior=/absolute/path/interior.glb \
  --project=MBD-001=/absolute/path/project-001.glb \
  --push-cloud
```

This uses the same `milkbarCms` storage profile as the CMS UI. Files are
uploaded to `/uploads/cms/models`, mirrored locally under this repo's
`public_html/uploads/cms/models` FastComet tree, asset records are created, the
CMS hero, interior, and project model assignments are updated, and
`--push-cloud` copies the public FastComet URLs into the arch-web runtime
MongoDB Cloud data.

If the files and CMS assignments are already present and only the Vercel runtime
database needs refreshing, run:

```sh
npm run storage:push:milkbar-runtime
```

Without credentials, it verifies that the PHP endpoint is reachable on
FastComet and should return JSON. With credentials in the app's Mongo
`fastcomet_storage_config_v1` setting, or with `MILKBAR_FASTCOMET_STORAGE_TOKEN`
and `MILKBAR_FASTCOMET_STORAGE_USERNAME` supplied explicitly, it uploads a small
`.gltf` to `/uploads/cms/models`, checks the public URL, and deletes the test
file. The public URL check will only pass after the `uploads` DNS record and
SSL certificate are active.

If the smoke test upload/delete steps pass but `public-url` fails, read the
printed `diagnosis` block:

- `dns.ok: false` means the `uploads.milkbardesigners.com` DNS record is not
  resolving yet.
- `authorizationError: ERR_TLS_CERT_ALTNAME_INVALID` means DNS is reaching
  FastComet, but AutoSSL has not issued a certificate for
  `uploads.milkbardesigners.com`.
- A certificate subject for another domain means the subdomain exists at the IP
  but cPanel/AutoSSL has not attached the correct hostname certificate yet.
