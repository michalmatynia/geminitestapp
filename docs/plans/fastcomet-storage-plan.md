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

### 7. Operational scripts

- Configure storage settings:
  - `npm run storage:configure:fastcomet -- --source=fastcomet --upload-endpoint=https://files.example.com/api/uploads --base-url=https://files.example.com --delete-endpoint=https://files.example.com/api/uploads/delete --auth-token=... --keep-local-copy=true --timeout-ms=20000`
- Dry run migration:
  - `npm run storage:migrate:fastcomet`
- Apply migration and switch source:
  - `npm run storage:migrate:fastcomet -- --write --set-source=fastcomet`
- Limit migration scope:
  - `npm run storage:migrate:fastcomet -- --write --only=image-files,note-files --limit=2000`

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
- FastComet integration depends on your external endpoint implementation.
