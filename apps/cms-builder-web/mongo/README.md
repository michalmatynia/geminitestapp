# CMS Builder Local MongoDB

This directory is reserved for the CMS Builder standalone local MongoDB runtime.

- `local-data/` stores the local MongoDB data files.
- `runtime/` stores local `mongod` logs and pid files.

Both runtime folders are ignored by git. Start the instance with:

```bash
npm run mongo:up -w @app/cms-builder-web
```

The default local URI is `mongodb://127.0.0.1:27019/cms_builder_local`.
