## Kangur Social

This subtree owns the StudiQ Social domain for Kangur.

- `admin/`: admin page entrypoints and admin workspace internals
- `hooks/`: public client hooks used outside the admin workspace
- `pages/`: public-facing social route pages
- `server/`: server runtime, repositories, generation, publishing, and capture logic
- `shared/`: social-specific shared helpers and presets
- `workers/`: queue and scheduler workers

Keep new social code here instead of adding more `social-*` files back under `server/`, `shared/`, `ui/`, or `workers/`.
