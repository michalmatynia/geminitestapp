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
MongoDB model it uses for three application databases:

- `geminitestapp`
- `studiq`
- `cms-builder`

The Database Engine can inspect, edit, back up, and sync each local database
individually, and can also run backup or cloud sync actions for all three as a
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

## Managed Databases

The managed database model has a local and cloud endpoint for each application.

| Application | Local env | Cloud env | Backup folder |
| --- | --- | --- | --- |
| `geminitestapp` | `MONGODB_LOCAL_URI`, `MONGODB_LOCAL_DB` | `MONGODB_CLOUD_URI`, `MONGODB_CLOUD_DB` | `geminitestapp/` |
| `studiq` | `STUDIQ_MONGODB_LOCAL_URI`, `STUDIQ_MONGODB_LOCAL_DB` | `STUDIQ_MONGODB_CLOUD_URI`, `STUDIQ_MONGODB_CLOUD_DB` | `studiq/` |
| `cms-builder` | `CMS_BUILDER_MONGODB_LOCAL_URI`, `CMS_BUILDER_MONGODB_LOCAL_DB` | `CMS_BUILDER_MONGODB_CLOUD_URI`, `CMS_BUILDER_MONGODB_CLOUD_DB` | `cms-builder/` |

Legacy aliases are still supported:

- `MONGODB_URI`, `MONGODB_DB`
- `STUDIQ_MONGODB_URI`, `STUDIQ_MONGODB_DB`
- `CMS_BUILDER_MONGODB_URI`, `CMS_BUILDER_MONGODB_DB`

Prefer the split local/cloud keys for Database Engine operations. Do not commit
real MongoDB credentials into `.env.example`, README files, or docs.

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

# neutral backup root, outside geminitestapp app structure
MONGO_BACKUPS_DIR="../database/mongo-backups"
```

`MONGODB_ACTIVE_SOURCE_DEFAULT` controls the active default MongoDB source for
the generic `geminitestapp` Database Engine source card. Changing it requires a
server restart. It does not replace the managed per-app local/cloud source
settings.

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

## Editing Local Data

Use the `Edit Local` button on a managed database card. It opens the CRUD
workspace scoped to the local database:

```text
/admin/databases/engine?view=crud&application=studiq&source=local
/admin/databases/engine?view=crud&application=cms-builder&source=local
/admin/databases/engine?view=crud&application=geminitestapp&source=local
```

The CRUD table manager loads collection metadata from the selected application
database, then inserts, updates, or deletes documents against that selected
local target.

## Backup Behavior

`Backup All` backs up all three local application databases:

- `geminitestapp` local
- `studiq` local
- `cms-builder` local

Per-card `Backup` backs up only that card's local database.

Backups use `mongodump` with gzip archives. The archive file goes into the
application subfolder, and a sibling `.log` file records the redacted command
and MongoDB tool output.

Manual backups are disabled when `NODE_ENV=production`.

## Sync Behavior

The Database Engine supports two directions:

- `Push`: local to cloud
- `Pull`: cloud to local

Sync can target one application or all applications. Before each restore, the
engine creates pre-sync backups for both source and target. This protects the
previous target state before it is dropped and restored.

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

## API

The standalone Database Engine owns these managed MongoDB endpoints:

```http
GET /api/databases/engine/managed
```

Returns local/cloud status, database size, collection sizes, backup root, and
availability flags for all managed databases.

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
- `src/shared/contracts/database.ts`

## Validation

Run these after changing Database Engine managed Mongo behavior:

```bash
npm run test:database-engine
npm run typecheck:database-engine
npm run build:database-engine
npx vitest run src/shared/lib/db/services/database-backup.test.ts src/shared/lib/db/services/mongo-source-sync.test.ts
git diff --check
```
