Shared CMS rendering support for public frontend routes.

This folder owns the shared CMS page render helpers used by frontend route
handlers and route-helper modules. Keep concrete route entrypoints outside
this folder.

It also owns shared CMS slug resolution/render-data helpers that are reused by
the canonical login route, catch-all slug routes, and preview routes.
