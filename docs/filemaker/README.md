---
owner: 'Filemaker Team'
last_reviewed: '2026-05-06'
status: 'active'
doc_type: 'index'
scope: 'feature:filemaker'
canonical: true
---

# Filemaker Documentation

Filemaker docs cover the admin data workspace, mail and campaign tooling, and
cross-project social publishing.

## Canonical Docs

- [`docs/filemaker/social-publishing-runbook.md`](./social-publishing-runbook.md)

## Runtime Surfaces

- Admin entry: `/admin/filemaker`
- Social publishing: `/admin/filemaker/social`
- Social publishing APIs: `/api/filemaker/social-posts/*`,
  `/api/filemaker/social-image-addons/*`, `/api/filemaker/social-pipeline/*`

## Code Entry Points

- Filemaker feature root: `src/features/filemaker`
- Social publishing feature: `src/features/filemaker/social`
- Filemaker admin routes: `src/app/(admin)/admin/filemaker`
- Filemaker APIs: `src/app/api/filemaker`
