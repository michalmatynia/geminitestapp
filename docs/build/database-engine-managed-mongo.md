---
owner: 'Platform Team'
last_reviewed: '2026-05-07'
status: 'active'
doc_type: 'reference'
scope: 'workspace:@app/database-engine-web'
canonical: true
---

# Database Engine Managed MongoDB Guide

This guide documents the standalone Database Engine workspace and the managed
MongoDB model it uses for four application databases:

- `geminitestapp`
- `studiq`
- `cms-builder`
- `products`

The Database Engine can inspect, edit, back up, and sync each local database
individually, and can also run backup or cloud sync actions for all four as a
group.

## Workspace

Run the standalone Database Engine app from the repo root:

```bash
npm run dev:database-engine
```

The app runs on `http://localhost:3400` and owns:

- `/admin/databases/engine`
- `/admin/databases/backups`
- `/admin/databases/operations`
- `/admin/databases/crud`
- `/admin/databases/preview`
- `/api/databases/*`

The root app can hand database page and API traffic to the standalone workspace
with:

```bash
DATABASE_ENGINE_WEB_ORIGIN="http://localhost:3400"
```

## Quick Start Checklist

1. Install MongoDB Database Tools so `mongodump` and `mongorestore` are on
   `PATH`.
2. Configure all local and cloud MongoDB env keys for the applications you want
   the engine to manage.
3. Keep `MONGO_BACKUPS_DIR` outside an application folder, for example
   `../database/mongo-backups`.
4. Start local MongoDB instances for `geminitestapp`, StudiQ, CMS Builder, and Products.
5. Start the Database Engine with `npm run dev:database-engine`.
6. Open `/admin/databases/engine` and confirm all local/cloud cards are
   reachable.
7. Run `Backup All` before the first cloud push.
8. Use per-app `Push` or `Push All` only after checking database and collection
   sizes look correct.

## Managed Databases

The managed database model has a local and cloud endpoint for each application.

| Application | Local env | Cloud env | Backup folder |
| --- | --- | --- | --- |
| `geminitestapp` | `MONGODB_LOCAL_URI`, `MONGODB_LOCAL_DB` | `MONGODB_CLOUD_URI`, `MONGODB_CLOUD_DB` | `geminitestapp/` |
| `studiq` | `STUDIQ_MONGODB_LOCAL_URI`, `STUDIQ_MONGODB_LOCAL_DB` | `STUDIQ_MONGODB_CLOUD_URI`, `STUDIQ_MONGODB_CLOUD_DB` | `studiq/` |
| `cms-builder` | `CMS_BUILDER_MONGODB_LOCAL_URI`, `CMS_BUILDER_MONGODB_LOCAL_DB` | `CMS_BUILDER_MONGODB_CLOUD_URI`, `CMS_BUILDER_MONGODB_CLOUD_DB` | `cms-builder/` |
| `products` | `PRODUCTS_MONGODB_LOCAL_URI`, `PRODUCTS_MONGODB_LOCAL_DB` | `PRODUCTS_MONGODB_CLOUD_URI`, `PRODUCTS_MONGODB_CLOUD_DB` | `products/` |

Legacy aliases are still supported:

- `MONGODB_URI`, `MONGODB_DB`
- `STUDIQ_MONGODB_URI`, `STUDIQ_MONGODB_DB`
- `CMS_BUILDER_MONGODB_URI`, `CMS_BUILDER_MONGODB_DB`
- `PRODUCTS_MONGODB_URI`, `PRODUCTS_MONGODB_DB`

Prefer the split local/cloud keys for Database Engine operations. Do not commit
real MongoDB credentials into `.env.example`, README files, or docs.

## Products Split

Products has a dedicated local MongoDB runtime so product, product-integration,
order-import, and ecommerce account data are not stored in the main
`geminitestapp` database.

Runtime commands:

```bash
npm run mongo:products:up
npm run mongo:products:status
npm run mongo:products:down
```

Migration commands:

```bash
npm run mongo:products:migrate:plan
npm run mongo:products:migrate:apply
```

The migration copies data from the main MongoDB source into
`products_local`. It is non-destructive to the source database. The ecommerce
users copy is stored as `ecom_users`; the shared source `users` collection is
not pruned because `geminitestapp` still uses it. Integration rows are filtered
to product-commerce slugs, and connection rows are filtered to those integration
IDs so non-product integrations stay attached to the main database.

Source cleanup is intentionally a separate step:

```bash
npm run mongo:products:prune:plan
npm run mongo:products:prune:apply
```

`mongo:products:prune:apply` requires the hard-coded confirmation token in the
script command and removes only the product-commerce source collections plus
matching product-commerce settings from the main database. The prune script does
not drop the shared `users` collection, and it only removes product-commerce
integration records by slug so unrelated LinkedIn/job-board integration records
can remain in the main database.

## Environment Example

```bash
# geminitestapp
MONGODB_LOCAL_URI="mongodb://localhost:27017/app_local"
MONGODB_LOCAL_DB="app_local"
MONGODB_CLOUD_URI="mongodb+srv://user:password@cluster.example/app_cloud"
MONGODB_CLOUD_DB="app_cloud"
MONGODB_ACTIVE_SOURCE_DEFAULT="local"

# StudiQ
STUDIQ_MONGODB_LOCAL_URI="mongodb://127.0.0.1:27018/studiq_local"
STUDIQ_MONGODB_LOCAL_DB="studiq_local"
STUDIQ_MONGODB_CLOUD_URI="mongodb+srv://user:password@cluster.example/studiq_db"
STUDIQ_MONGODB_CLOUD_DB="studiq_db"

# CMS Builder
CMS_BUILDER_MONGODB_LOCAL_URI="mongodb://127.0.0.1:27019/cms_builder_local"
CMS_BUILDER_MONGODB_LOCAL_DB="cms_builder_local"
CMS_BUILDER_MONGODB_CLOUD_URI="mongodb+srv://user:password@cluster.example/cms_builder_db"
CMS_BUILDER_MONGODB_CLOUD_DB="cms_builder_db"

# Products
PRODUCTS_MONGODB_LOCAL_URI="mongodb://127.0.0.1:27020/products_local"
PRODUCTS_MONGODB_LOCAL_DB="products_local"
PRODUCTS_MONGODB_CLOUD_URI="mongodb+srv://user:password@cluster.example/products_db"
PRODUCTS_MONGODB_CLOUD_DB="products_db"

# neutral backup root, outside geminitestapp app structure
MONGO_BACKUPS_DIR="../database/mongo-backups"
```

`MONGODB_ACTIVE_SOURCE_DEFAULT` controls the active default MongoDB source for
the generic `geminitestapp` Database Engine source card. Changing it requires a
server restart. It does not replace the managed per-app local/cloud source
settings.

## Environment Loading

The Database Engine runtime wrapper loads repo-root env files first, then
workspace-local env files from `apps/database-engine-web`. Workspace-local files
override root values.

For a development server, the effective order is:

1. repo-root `.env*` files loaded by Next env config
2. `apps/database-engine-web/.env`
3. `apps/database-engine-web/.env.development`
4. `apps/database-engine-web/.env.local`
5. `apps/database-engine-web/.env.development.local`

For tests, `.env.local` is skipped by the app env loader and the test-specific
files have the highest priority.

Set this to inspect loaded Database Engine env keys at startup:

```bash
DEBUG_DATABASE_ENGINE_WEB_ENV="true"
```

## Backup Location

Backups are written under `MONGO_BACKUPS_DIR`. If the variable is not set, the
default is:

```text
../database/mongo-backups
```

from the monorepo root. The Database Engine creates one subfolder per managed
application:

```text
mongo-backups/
  geminitestapp/
  studiq/
  cms-builder/
  products/
```

This neutral root keeps Database Engine backups outside the `geminitestapp`
application structure so other apps or tooling can read them when necessary.

## Managed UI

Open:

```text
/admin/databases/engine
```

The `Managed Application Databases` section shows one card for each managed
application. Each card includes:

- local and cloud reachability
- masked URI and database name
- database size
- collection count
- per-collection document count and size
- local backup action
- push local to cloud action
- pull cloud to local action
- edit local database link

Group controls are available above the cards:

- `Backup All`
- `Push All`
- `Pull All`

## UI Workflows

### Check Database And Collection Sizes

1. Open `/admin/databases/engine`.
2. Find the `Managed Application Databases` section.
3. Read `Database size` for each local and cloud endpoint.
4. Expand or scroll the collection table in each endpoint panel.
5. Compare document counts and collection sizes before deciding whether to push
   or pull.

### Back Up One Application

1. Open `/admin/databases/engine`.
2. Find the application card.
3. Confirm the local endpoint is reachable.
4. Click `Backup`.
5. Inspect the resulting archive and `.log` under that application's backup
   subfolder.

### Back Up All Applications

1. Open `/admin/databases/engine`.
2. Confirm all four local endpoints are reachable.
3. Click `Backup All`.
4. Confirm `geminitestapp/`, `studiq/`, `cms-builder/`, and `products/` each
   received an archive.

### Push Local Data To Cloud

1. Confirm the local database has the expected data.
2. Confirm the cloud target is the correct database.
3. Click per-app `Push` or group `Push All`.
4. Wait for parity verification to complete.
5. Review the latest transfer log if verification fails.

### Pull Cloud Data To Local

1. Confirm the cloud database is the intended source of truth.
2. Confirm a local backup exists or run `Backup` first.
3. Click per-app `Pull` or group `Pull All`.
4. Wait for parity verification to complete.
5. Re-open the CRUD console or collection size table to confirm local data.

## Editing Local Data

Use the `Edit Local` button on a managed database card. It opens the CRUD
workspace scoped to the local database:

```text
/admin/databases/engine?view=crud&application=studiq&source=local
/admin/databases/engine?view=crud&application=cms-builder&source=local
/admin/databases/engine?view=crud&application=geminitestapp&source=local
/admin/databases/engine?view=crud&application=products&source=local
```

The CRUD console also shows a `Managed MongoDB Files` scope panel above the
Table Manager. That panel lists all four managed databases, shows local/cloud
reachability plus local and cloud collection counts, and exposes local/cloud
Table Manager links for each database. It also exposes per-database `Backup`,
`Push`, and `Pull` controls plus group `Backup All`, `Push All`, and `Pull All`
actions. Opening a database from that panel changes the Table Manager scope so
collection metadata, row browsing, inserts, updates, and deletes are executed
against the selected application database and selected source.

The CRUD table manager loads collection metadata from the selected application
database, then inserts, updates, or deletes documents against that selected
local target.

## Backup Behavior

`Backup All` backs up all four local application databases:

- `geminitestapp` local
- `studiq` local
- `cms-builder` local
- `products` local

Per-card `Backup` backs up only that card's local database.

Backups use `mongodump` with gzip archives. The archive file goes into the
application subfolder, and a sibling `.log` file records the redacted command
and MongoDB tool output.

Manual backups are disabled when `NODE_ENV=production`.

## Restore And Preview

The Backup Center lists archive files from all application subfolders. A backup
name with an application prefix tells the preview/restore path which application
database it belongs to:

```text
geminitestapp/app-local-backup-*.archive
studiq/studiq-local-backup-*.archive
cms-builder/cms-builder-local-backup-*.archive
products/products-local-backup-*.archive
```

The Backup Center summary groups backup history by managed application. Each
application tile shows the folder, archive count, latest archive, total backup
size, a per-application backup action, and `Local Tables` / `Cloud Tables`
links back to that application's Table Manager scopes. The Backup Center also
shows recent backup jobs with the target application (`all`, `geminitestapp`,
`studiq`, `cms-builder`, or `products`) so queued and completed backup work can
be matched to the managed database file it affected.

The Engine page's managed database cards also provide `Local Tables` and
`Cloud Tables` shortcuts for every managed application, so local and cloud
collection contents can be inspected from the same source-aware Table Manager.

Use `/admin/databases/preview` to inspect an archive before restoring it. The
preview path restores into a temporary preview database and drops that temporary
database after inspection.

## Sync Behavior

The Database Engine supports two directions:

- `Push`: local to cloud
- `Pull`: cloud to local

Sync can target one application or all applications. Before each restore, the
engine creates pre-sync backups for both source and target. This protects the
previous target state before it is dropped and restored.

The Engine page's Latest Transfer card summarizes the last sync for all four
managed applications. Each application tile shows whether that database was
verified, source and target database names, compared collection count, archive
and log references, and source/target pre-sync backup names. Older sync records
that predate per-application metadata are shown under `geminitestapp`.

The sync flow is:

1. Acquire the Mongo sync lock.
2. Resolve source and target config for each selected application.
3. Create source and target pre-sync backups.
4. Dump the source database with `mongodump`.
5. Drop the target database.
6. Restore the archive into the target database with namespace remapping.
7. Verify source and target parity.
8. Record the latest sync metadata.
9. Release the lock.

Runtime sync files are stored under the Database Engine process working
directory:

```text
apps/database-engine-web/mongo/runtime/
```

These files include sync lock state, latest sync metadata, transfer archives,
and sync logs.

Manual sync is disabled when `NODE_ENV=production`.

## Sync Safety Contract

Sync is intentionally conservative because the restore phase drops the target
database before writing the source archive into it.

- Source and target must be different URI/database pairs.
- Both source and target must be reachable.
- A sync lock prevents concurrent MongoDB sync runs.
- The engine creates source and target pre-sync backups before restore.
- Credentials are redacted from command logs.
- Parity verification must pass after restore.
- Failed verification prevents the run from being recorded as the latest
  successful sync.

Do not use `Push All` or `Pull All` as a substitute for checking each
application card. The group action is operational convenience, not automatic
conflict resolution.

## API

The standalone Database Engine owns these managed MongoDB endpoints:

```http
GET /api/databases/engine/managed
```

Returns local/cloud status, database size, collection sizes, backup root, and
availability flags for all managed databases.

Response shape, abbreviated:

```json
{
  "timestamp": "2026-05-07T12:00:00.000Z",
  "backupRoot": "../database/mongo-backups",
  "canBackupAllLocal": true,
  "canPushAllToCloud": true,
  "databases": [
    {
      "application": "studiq",
      "label": "StudiQ",
      "local": {
        "dbName": "studiq_local",
        "databaseSizeBytes": 2048,
        "collectionCount": 1,
        "collections": [
          {
            "name": "studiq_coll",
            "documentCount": 4,
            "totalSizeBytes": 640
          }
        ]
      }
    }
  ]
}
```

```http
POST /api/databases/engine/managed/backup
Content-Type: application/json

{ "application": "all" }
```

`application` can be:

- `all`
- `geminitestapp`
- `studiq`
- `cms-builder`
- `products`

```http
POST /api/databases/engine/managed/sync
Content-Type: application/json

{ "direction": "local_to_cloud", "application": "studiq" }
```

`direction` can be:

- `local_to_cloud`
- `cloud_to_local`

The older source endpoints remain available for the generic Mongo source card:

- `GET /api/databases/engine/source`
- `POST /api/databases/engine/source/sync`

These endpoints are routed through the standalone catch-all route:

```text
apps/database-engine-web/src/app/api/databases/[[...path]]/route.ts
```

## Mongo Tooling

The backup and sync flows require MongoDB database tools:

- `mongodump`
- `mongorestore`

Optional overrides:

```bash
MONGODUMP_PATH="/absolute/path/to/mongodump"
MONGORESTORE_PATH="/absolute/path/to/mongorestore"
MONGO_TOOL_MAX_BUFFER_BYTES="134217728"
```

Increase `MONGO_TOOL_MAX_BUFFER_BYTES` for very large restore/dump logs.

## Vercel And Cloud Notes

Vercel deployments cannot run a local MongoDB database inside the serverless
runtime. Production and preview deployments should use MongoDB Atlas or another
external MongoDB provider through cloud connection strings.

Use local MongoDB only for local development on your machine. Keep cloud
credentials in local `.env.local` or platform environment variables, not in
tracked docs or examples.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Not configured` | Confirm the relevant local/cloud URI and DB env keys are present in the effective env file. |
| `Unreachable` | Confirm MongoDB is running locally, Atlas IP access allows the client, and credentials are correct. |
| Sync disabled because sources match | Local and cloud resolve to the same URI and database. Use distinct local/cloud targets. |
| Buttons disabled | Confirm Database Engine operation controls allow manual backup or full sync. |
| Backup or sync disabled in production | This is expected. Manual destructive database maintenance is blocked when `NODE_ENV=production`. |
| `mongodump` or `mongorestore` not found | Install MongoDB Database Tools or set `MONGODUMP_PATH` and `MONGORESTORE_PATH`. |
| Env change not reflected | Restart the Database Engine dev server. Next.js env files are loaded at server start. |

## Source Map

Key implementation files:

- `apps/database-engine-web/src/features/database/components/engine/DatabaseEngineManagedMongoSection.tsx`
- `apps/database-engine-web/src/features/database/server/api/engine/managed`
- `src/shared/lib/db/services/managed-mongo-databases.ts`
- `src/shared/lib/db/services/database-backup.ts`
- `src/shared/lib/db/services/mongo-source-sync.ts`
- `src/shared/lib/db/product-mongo-client.ts`
- `src/shared/contracts/database.ts`
- `scripts/db/migrate-products-to-products-mongo.ts`
- `scripts/db/prune-products-from-main-mongo.ts`

## Validation

Run these after changing Database Engine managed Mongo behavior:

```bash
npm run test:database-engine
npm run typecheck:database-engine
npm run build:database-engine
npx vitest run src/shared/lib/db/services/database-backup.test.ts src/shared/lib/db/services/mongo-source-sync.test.ts
git diff --check
```
