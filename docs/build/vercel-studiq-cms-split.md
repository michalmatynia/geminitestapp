---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'active'
doc_type: 'runbook'
scope: 'workspace:@app/studiq-web,workspace:@app/cms-builder-web'
canonical: true
---

# Vercel StudiQ And CMS Split

This runbook covers the two-project Vercel setup where StudiQ and the CMS
storefront/builder deploy from the same monorepo but run as separate Next.js
applications.

## Projects

| Surface | Vercel root directory | Workspace | Build command |
| --- | --- | --- | --- |
| StudiQ web | `apps/studiq-web` | `@app/studiq-web` | `cd ../.. && npm run build -w @app/studiq-web` |
| CMS storefront and builder | `apps/cms-builder-web` | `@app/cms-builder-web` | `cd ../.. && npm run build -w @app/cms-builder-web` |

Both workspaces have their own `vercel.json`. In the Vercel UI, set each
project's Root Directory to the matching workspace path above. Do not point
both projects at the repo root unless the project is intentionally deploying
the full root platform app.

## Runtime Ownership

- `apps/studiq-web` owns the focused StudiQ/Kangur learner web shell.
- `apps/cms-builder-web` owns public CMS pages, CMS slugs, locale-prefixed CMS
  routes, `/admin/cms/*`, `/cms/*` redirects, CMS auth pages, and CMS runtime
  APIs.
- The root platform app can still act as a migration router, but it is not
  required when the two Vercel projects receive traffic directly.

## Environment Variables

Set auth/provider values on both projects, but do not point both projects at the
same MongoDB database. Each project gets its own `MONGODB_URI` and
`MONGODB_DB`.

```txt
APP_DB_PROVIDER=mongodb
AUTH_DB_PROVIDER=mongodb
AUTH_SECRET=...
```

Use separate MongoDB values per project:

```txt
# StudiQ project
MONGODB_URI=mongodb+srv://<studiq-cluster>/<studiq-db>
MONGODB_DB=<studiq-db>

# CMS project
MONGODB_URI=mongodb+srv://<cms-cluster>/<cms-db>
MONGODB_DB=<cms-db>
```

Use the same `AUTH_SECRET` across the two projects when users should keep the
same Auth.js JWT/session semantics between CMS admin and any shared admin APIs.

Set URL values per project:

```txt
# StudiQ project
NEXT_PUBLIC_APP_URL=https://<studiq-project-url>
NEXTAUTH_URL=https://<studiq-project-url>

# CMS project
NEXT_PUBLIC_APP_URL=https://<cms-project-url>
NEXTAUTH_URL=https://<cms-project-url>
```

If the repo-root platform app remains deployed and needs to hand CMS traffic to
the CMS project, set these on the root platform project:

```txt
CMS_WEB_ORIGIN=https://<cms-project-url>
CMS_PUBLIC_HOSTS=cms.example.com,*.cms-sites.example.com
CMS_PUBLIC_PATH_PREFIXES=/optional-cms-prefix
```

`CMS_WEB_ORIGIN` is consumed by the root platform proxy. It is not needed by
`apps/studiq-web` itself, because that workspace does not own CMS routes.

## Domains

For public CMS pages, attach CMS-managed domains directly to the CMS Vercel
project. CMS domain zoning resolves the requested host against CMS domain
records, so the host seen by `apps/cms-builder-web` must be the public CMS
domain.

Use root proxy host/path handoff only for migration cases where public CMS
traffic still lands on the root platform project.

## CLI Link And Deploy

After logging into the Vercel account/team that owns the target projects:

```bash
vercel link --cwd apps/studiq-web
vercel link --cwd apps/cms-builder-web
```

Then deploy previews:

```bash
vercel deploy apps/studiq-web -y
vercel deploy apps/cms-builder-web -y
```

Production deploys should only be run intentionally:

```bash
vercel deploy apps/studiq-web --prod -y
vercel deploy apps/cms-builder-web --prod -y
```

## Access Notes

The deployment URLs include the Vercel scope in their hostname. If `vercel
inspect` says the deployment cannot be found, or `vercel teams ls` does not
show the target scope, the current CLI login cannot deploy or link that
project. Switch accounts or get added to the target Vercel team first.
