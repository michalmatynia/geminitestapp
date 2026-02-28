2. Public API per module (ban deep imports)

Each module exposes a single entry:

features/<NAMEOFSECTION>/index.ts

shared/ui/index.ts

Ban imports like features/<NAMEOFSECTION>/components/X → only features/<NAMEOFSECTION>.

# Types & “Type Clusters” → migrate safely

HERE NOW

A practical way to scan and move types without breaking imports:

Identify clusters by “gravity”:
(a) API DTOs, (b) domain models, (c) UI/view models, (d) form types.

Create features/<NAMEOFSECTION>/types/ with files like:

dto.ts (server shapes)

domain.ts (canonical internal types)

view.ts (table rows, select options, etc.)

index.ts (barrel exports)

Migration pattern:

Move types → create index.ts exports

Update imports gradually

Add an ESLint rule later to prevent deep imports (optional)

3. App Router rule: route ≠ feature - DONE

Keep app/ thin:

app/(routes)/<NAMEOFSECTION>/\* contains only page.tsx, layout.tsx, loading.tsx, error.tsx and wiring

Everything else (components, hooks, queries, types) lives in features/<NAMEOFSECTION>/\*

# Reusability audit for <NAMEOFSECTION> components

When reviewing components, classify them:

UI primitive (Button-ish, Modal-ish) → shared/ui - scan for unified

Composable pattern (SearchBar, Pagination, FilterPanel) → shared/ui

Feature widget (for example ProductCard, ProductGrid, ProductEditor) → stay in features/<NAMEOFSECTION>

Quick tests for “should be shared”:

no product-specific wording

no product-specific types (or accepts generics)

no product-specific API/state coupling

4. Product performance: avoid unnecessary re-renders

Use this checklist (it catches most real issues fast):

Props stability:

avoid inline objects/functions in JSX (or wrap in useMemo/useCallback)

Selectors/hooks:

ensure store selectors don’t return new objects each time

Lists:

stable key

virtualization if list is large

Derived data:

expensive mapping/filtering → memoize (useMemo) or move server-side

React Query / SWR:

check select, staleTime, and avoid refetch loops

Component boundaries:

split “container” (data/state) from “presentational” (pure UI)

Memo only where it helps:

add React.memo to hot leaf components with stable props

5. RSC vs Client boundaries (server-only / client-only) - NOT NECESSARY

Make boundaries explicit so you never accidentally ship DB/LLM code to the client:

src/server/\* (db, auth, stores, llm) + server-only

src/client/\* (TanStack Query client, UI hooks) + client-only

6. “Scan for optimization opportunities” (repeatable)

Do one pass with tooling + one pass with reading:

Tooling:

React DevTools Profiler: find top offenders

Bundle analyzer: big dependencies in Products

Reading:

look for repeated computations inside render

look for prop drilling causing wide rerenders

look for “index barrel causing circular deps” or slow builds

7. Mongo as primary DB: store/repository + contract - DONE

Define a domain contract and implement providers behind it:

ProductStore interface: CRUD, search, settings

MongoProductStore (primary)

PrismaProductStore (optional fallback/secondary)

Select provider in one place (e.g. server/stores/index.ts based on env/config). No if mongo else prisma scattered around.

8. Comments (but only the high-signal kind)

Add comments where the why isn’t obvious:

business rules / edge cases

non-trivial performance tradeoffs

tricky type constraints

“this must stay in this order because…”

Avoid comments that restate the code.

9. Centralize DB connection & collection access

Keep Mongo wiring out of routes/components:

server/db/mongoClient.ts (singleton)

server/db/collections.ts (typed collection getters)

server/repositories/\* (low-level queries)

server/services/\* (business rules + orchestration)

Routes/actions should call services, not the DB directly.

10. TanStack Query: key factory + query/mutation folders

Standardize data access:

features/<NAMEOFSECTION>/queries/keys.ts (key factory)

features/<NAMEOFSECTION>/queries/use<NAMEOFSECTION>.ts

features/<NAMEOFSECTION>/mutations/useUpdate<NAMEOFSECTION>.ts

Rule: no stringly-typed query keys inside components.

11. TanStack Table: create a “table kit”

Tables explode in complexity—separate it:

features/products/table/columns.ts

features/products/table/useProductsTable.ts

features/products/table/filters.ts

UI component becomes mostly render logic.

12. Consistent look of components

Pick one approach and enforce it:

shared UI primitives (Button, Input, Card, Modal)

consistent spacing/typography scale (tokens)

consistent empty/loading/error states (shared components)

consistent table/list patterns (shared)

# ShadCN (copy-paste) without chaos: vendor vs wrappers

Treat components/ui/\* as “vendor-ish”:

minimal edits in components/ui

your consistent look lives in wrappers like shared/ui/AppButton, AppDialog, AppInput

This is the fastest way to enforce consistent UI across the app.

13. Quality gates you listed: make them one command

Make this a single “CI-like” local command:

npx tsc --noEmit

npx eslint .

npx test (or vitest, jest)

optional: format check (prettier --check)

If you put it behind npm run check, it becomes frictionless.

14. Auth.js (NextAuth v5): one “auth module”

Centralize all auth decisions:

server/auth/\* (config, callbacks, providers, role helpers)

helpers like requireUser(), requireRole()

Stops authorization logic from spreading across routes/actions.

15. LLM providers (OpenAI + Ollama): one interface

Hide both backends behind one API:

server/llm/provider.ts (interface)

server/llm/openai.ts

server/llm/ollama.ts

server/llm/prompts/\* (versioned prompts + tests)

Then the app just calls llm.chat(...).

16. Org technique that actually sticks: PR patterns + checklists

Make structure maintain itself:

“move-only PRs” (renames/moves only) separate from behavior changes

PR checklist: boundaries, query keys, RSC/client split, loading/error states, tests
