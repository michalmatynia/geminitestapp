Cross-route layout tests for the public frontend trees.

These tests cover the shared frontend layout contract for both:
- `src/app/(frontend)`
- `src/app/[locale]/(frontend)`

They live outside the route roots so those roots keep only actual route entrypoints.
