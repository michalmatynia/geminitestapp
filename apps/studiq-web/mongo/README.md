# StudiQ Local MongoDB

`apps/studiq-web` uses a dedicated local MongoDB process on port `27018` and a
dedicated database named `studiq_local`.

Start it from the workspace:

```bash
npm run mongo:up -w @app/studiq-web
```

The shared helper stores data under `apps/studiq-web/mongo/local-data` and
runtime files under `apps/studiq-web/mongo/runtime`; both directories are
ignored by git.

To move existing local root data into the StudiQ database:

```bash
npm run mongo:copy-from-root:plan -w @app/studiq-web
npm run mongo:copy-from-root -w @app/studiq-web
```

The copy script selects all `kangur_*` collections, StudiQ-scoped settings and
analytics, and Auth.js records related to `kangur_learners`. Once the target
has copy metadata, the copy apply refuses to replace existing target data from
an empty root source without an explicit override flag. After verifying the
copy, inspect the root detach plan:

```bash
npm run mongo:detach-root:plan -w @app/studiq-web
```

The apply command is destructive and removes the copied StudiQ/Kangur documents
from the root local MongoDB database. It writes an Extended JSON backup under
`apps/studiq-web/mongo/runtime/root-detach-backups` before deleting the exact
backed-up root documents:

```bash
npm run mongo:detach-root -w @app/studiq-web
```

To inspect the latest backup restore without changing root MongoDB:

```bash
npm run mongo:restore-root:plan -w @app/studiq-web
```

Pass `-- --backup-dir=/absolute/path/to/snapshot` to target a specific backup.
