## Social Publishing Runtime

This subtree owns the social publishing runtime, queues, capture helpers, and
operator-facing admin feature at `/admin/filemaker/social`.

- `admin/`: admin page entrypoints and admin workspace internals
- `hooks/`: public client hooks used outside the admin workspace
- `pages/`: public-facing social route pages
- `server/`: server runtime, repositories, generation, publishing, and capture logic
- `shared/`: social-specific shared helpers and capture presets
- `workers/`: queue and scheduler workers

Keep new social code here instead of adding more `social-*` files back under `server/`, `shared/`, `ui/`, or `workers/`.
