# FastComet File Storage Plan

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
Created `src/features/files/services/storage/file-storage-service.ts` with:
- Provider/settings resolution from DB + env fallback
- FastComet upload client (multipart POST)
- FastComet delete client (POST JSON)
- Path helpers for URL/public path normalization
- Cached runtime settings (short TTL)

### 3. Upload path wiring
- `src/features/files/utils/fileUploader.ts`
  - Uploads now route through `uploadToConfiguredStorage(...)`
  - In FastComet mode, uploads are sent to FastComet
  - Optional local mirror copy is supported (`keepLocalCopy`)
- `src/features/viewer3d/utils/asset3dUploader.ts`
  - 3D uploads now use the same storage routing

### 4. Delete/preview compatibility wiring
- `src/app/api/files/[id]/handler.ts`
  - Uses storage-aware delete function
- `src/app/api/files/preview/handler.ts`
  - Tries local copy first, falls back to remote fetch for URL paths
- `src/features/files/utils/fileUploader.ts`
  - `getDiskPathFromPublicPath` now supports URL-based filepaths via pathname mapping

### 5. Admin UI
- New page: `/admin/settings/storage`
- File: `src/features/files/pages/AdminFileStorageSettingsPage.tsx`
- Route: `src/app/(admin)/admin/settings/storage/page.tsx`
- Linked from Settings home (`AdminSettingsHomePage`)

### 6. Environment scaffolding
Added optional env vars in `.env.example`:
- `FILE_STORAGE_SOURCE`
- `FASTCOMET_STORAGE_BASE_URL`
- `FASTCOMET_STORAGE_UPLOAD_URL`
- `FASTCOMET_STORAGE_DELETE_URL`
- `FASTCOMET_STORAGE_AUTH_TOKEN`
- `FASTCOMET_STORAGE_KEEP_LOCAL_COPY`
- `FASTCOMET_STORAGE_TIMEOUT_MS`

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

## Current limitations
- Existing files are not auto-migrated to FastComet.
- Some legacy workflows that expect local file moves may still keep old temp paths when records are URL-based.
- FastComet integration depends on your external endpoint implementation.
