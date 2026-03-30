Public product route support for the frontend.

Keep shared product-route helpers, public page components, and tests at the
`products/` route-group level, with tests under `products/__tests__/`. The
concrete `[id]/` folder should stay limited to route entrypoints.
