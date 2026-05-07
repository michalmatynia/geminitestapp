---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'plan'
scope: 'cross-feature'
canonical: true
---

# FastComet File Storage Plan

This file is the retained implementation scaffold for the storage-source switch.
Current runtime truth lives in the storage service and admin settings UI:

- `src/shared/lib/files/services/storage/file-storage-service.ts`
- `src/features/files/pages/AdminFileStorageSettingsPage.tsx`
- `src/app/(admin)/admin/settings/storage/page.tsx`
- `hosting/fastcomet/README.md`

## Goal

Add a switchable storage source so the app can use either:

- Local disk (`/public/uploads`)
- FastComet (external server)

When FastComet is selected, new uploads should be sent to FastComet.

## Implemented Scaffold

### 1. Settings keys

- `file_storage_source_v1` (`local` | `fastcomet`)
- `fastcomet_storage_config_v1` (JSON config)

### 2. Storage service layer

Created `src/shared/lib/files/services/storage/file-storage-service.ts` with:

- provider/settings resolution from DB + env fallback
- FastComet upload client (multipart POST)
- FastComet delete client (POST JSON)
- path helpers for URL/public path normalization
- cached runtime settings (short TTL)

### 3. Upload path wiring

- `src/shared/lib/files/file-uploader.ts`
  - uploads now route through `uploadToConfiguredStorage(...)`
  - in FastComet mode, uploads are sent to FastComet
  - optional local mirror copy is supported (`keepLocalCopy`)
- `src/features/viewer3d/utils/asset3dUploader.ts`
  - 3D uploads now use the same storage routing

### 4. Delete/preview compatibility wiring

- `src/app/api/files/[id]/handler.ts`
  - uses storage-aware delete function
- `src/app/api/files/preview/handler.ts`
  - tries local copy first, falls back to remote fetch for URL paths
- `src/shared/lib/files/file-uploader.ts`
  - `getDiskPathFromPublicPath` now supports URL-based filepaths via pathname mapping

### 5. Admin UI

- new page: `/admin/settings/storage`
- file: `src/features/files/pages/AdminFileStorageSettingsPage.tsx`
- route: `src/app/(admin)/admin/settings/storage/page.tsx`
- linked from Settings home (`AdminSettingsHomePage`)

### 6. Environment scaffolding

Added optional env vars in `.env.example`:

- `FILE_STORAGE_SOURCE`
- `FASTCOMET_STORAGE_BASE_URL`
- `FASTCOMET_STORAGE_UPLOAD_URL`
- `FASTCOMET_STORAGE_DELETE_URL`
- `FASTCOMET_STORAGE_AUTH_TOKEN`
- `FASTCOMET_STORAGE_KEEP_LOCAL_COPY`
- `FASTCOMET_STORAGE_TIMEOUT_MS`
- `NEXT_PUBLIC_FILE_BASE_URL` for `apps/ecom-web` on Vercel

### 7. Operational scripts

- Configure storage settings:
  - `npm run storage:configure:fastcomet -- --source=fastcomet --upload-endpoint=https://qubrick.io/api/uploads/index.php --base-url=https://qubrick.io --delete-endpoint=https://qubrick.io/api/uploads/delete/index.php --auth-token=... --keep-local-copy=true --timeout-ms=20000`
- Dry run migration:
  - `npm run storage:migrate:fastcomet`
- Apply migration and switch source:
  - `npm run storage:migrate:fastcomet -- --write --set-source=fastcomet`
- Limit migration scope:
  - `npm run storage:migrate:fastcomet -- --write --only=image-files,note-files --limit=2000`

### 8. FastComet/cPanel endpoint scaffold

- `hosting/fastcomet/public_html/api/uploads/index.php`
  - accepts authenticated multipart uploads
  - writes files below `public_html/uploads`
  - returns the final public URL
- `hosting/fastcomet/public_html/api/uploads/delete/index.php`
  - accepts authenticated JSON deletes
- `hosting/fastcomet/public_html/uploads/.htaccess`
  - adds public cache/CORS/static safety headers

Copy the scaffold's `public_html/` contents into FastComet `public_html/`.
Do not use `public_ftp` for the public file host.
For this FastComet account, support confirmed `s13612.fra1.stableserver.net`
(`209.42.31.54`) and public file URLs under `qubrick.io`.
DNS must point `qubrick.io` at `209.42.31.54`; the server hostname itself does
not serve the `qubrick.io` public web root as the upload endpoint.

### 9. Ecommerce consumption

- `apps/ecom-web/src/lib/mentios.ts`
  - preserves absolute product image URLs such as FastComet URLs
  - converts legacy `/uploads/products/...` values to
    `NEXT_PUBLIC_FILE_BASE_URL + path` when configured
- `apps/ecom-web/next.config.mjs`
  - allows Next image optimization for the configured file host's `/uploads/**`
    paths

## FastComet Endpoint Contract (Scaffold)

### Upload endpoint

- Method: `POST`
- Body: `multipart/form-data`
- Fields:
  - `file` (binary)
  - `filename`
  - `publicPath`
  - optional: `category`, `projectId`, `folder`
- Header (optional): `Authorization: Bearer <token>`
- Response JSON should include one of:
  - `url`
  - `publicUrl`
  - `filepath`
  - `fileUrl`
  - `path`
  - `location`

### Delete endpoint (optional)

- Method: `POST`
- Body JSON:
  - `filepath`
  - `publicPath`
- Header (optional): `Authorization: Bearer <token>`

## Current Limitations

- Existing files are not auto-migrated to FastComet.
- Some legacy workflows that expect local file moves may still keep old temp
  paths when records are URL-based.
- FastComet integration depends on deploying the PHP endpoint scaffold or an
  equivalent endpoint to your FastComet account.
