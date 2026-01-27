1. App structure → run a code organisation and segmentation strategy

* do restructuring src/shared/lib/agent and create a new folder src/features/agent-runtime and restructure everything pertaining to agent runtime.

* do the same restructuring for my products importer and exporter. products importer and exporter should be treated as a generic data import export module and moved to a separate feature

* do the same restructuring for my Folder tree feature from notesapp that enables the user to manage notes and folders as if they were regular files to a separate feature to be used across the app

* run through src/lib folder check the libraries and their functions and assign them to their localised lib folders in features or shared/lib

* run through src/shared/lib/utils and assign utilites either to src/shared/utils or their respective localised folders in features.

* src/app/* (only routing, providers, bootstrapping)
 and app/(routes)/<NAMEOFSECTION>/* should contain only page.tsx, layout.tsx, loading.tsx, error.tsx and wiring, move other files to their respective localised features or shared folder  as everything else (components, hooks, queries, types) lives in features/<NAMEOFSECTION>/*

* run through src/types designate their functions and distribute them into localised types folders in their respective features or a shared/types folder

* unify components (like the list component, modals) and types
* unify list component using Product list component as a reference, all list components should stem from the product list
  component (although with their own flavours).
* do the same for modals and unify modal component using Product modal component as a reference, all modal components should stem from the product modal
  component (although with their own flavours).

* do another restructure and move drafter away from admin into its own separate feature

* do a deep segmentation of node-config-dialog.tsx component into smaller thematic components, the file is huge

unify components (Modal and List are already unified) using Products components as a reference to achieve a unifying look across the application. There may be some individual components that can't be unified, don't force it, but strive for general unified look across the application.

continue with features restructuring and even stricter separation

expose a single point of entry

---done

<!-- <NAMEOFSECTION> - can be products, AI PATHS, etc. -->

Use a feature-first split with hard boundaries:

src/features/<NAMEOFSECTION>/* (domain feature: UI + state + hooks + types + api)

src/shared/* (truly cross-feature: UI primitives, utils, hooks, types)

src/app/* (routing, providers, bootstrapping)

# Inside features/<NAMEOFSECTION>:

components/ (feature-specific UI)

pages/ (route-level containers)

hooks/ (feature hooks)

validations/ (for feature related zod validators)

api/ (requests, query keys)

types/ (local types + re-exports) <!-- move from types folder, but only those Products specific types -->

utils/ (feature helpers)

Rule of thumb: if a component is used by 2+ features → move to shared/.


# Establish Hard module boundaries (enforced by ESLint)

Define layers and enforce import rules:

app/* can import features/* + shared/*

features/* can import shared/*, but not other features (except via public APIs)

shared/* must never import features/*

This keeps Next App Router projects from turning into “everything imports everything”.

2. Public API per module (ban deep imports)

Each module exposes a single entry:

features/<NAMEOFSECTION>/index.ts

shared/ui/index.ts

Ban imports like features/<NAMEOFSECTION>/components/X → only features/<NAMEOFSECTION>.

# Types & “Type Clusters” → migrate safely

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


3) App Router rule: route ≠ feature

Keep app/ thin:

app/(routes)/<NAMEOFSECTION>/* contains only page.tsx, layout.tsx, loading.tsx, error.tsx and wiring

Everything else (components, hooks, queries, types) lives in features/<NAMEOFSECTION>/*

# Reusability audit for <NAMEOFSECTION> components

When reviewing components, classify them:

UI primitive (Button-ish, Modal-ish) → shared/ui

Composable pattern (SearchBar, Pagination, FilterPanel) → shared/components

Feature widget (for example ProductCard, ProductGrid, ProductEditor) → stay in features/<NAMEOFSECTION>

Quick tests for “should be shared”:

no product-specific wording

no product-specific types (or accepts generics)

no product-specific API/state coupling

4) Product performance: avoid unnecessary re-renders

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

5) RSC vs Client boundaries (server-only / client-only) - NOT NECESSARY

Make boundaries explicit so you never accidentally ship DB/LLM code to the client:

src/server/* (db, auth, stores, llm) + server-only

src/client/* (TanStack Query client, UI hooks) + client-only

6) “Scan for optimization opportunities” (repeatable)

Do one pass with tooling + one pass with reading:

Tooling:

React DevTools Profiler: find top offenders

Bundle analyzer: big dependencies in Products

Reading:

look for repeated computations inside render

look for prop drilling causing wide rerenders

look for “index barrel causing circular deps” or slow builds


7) Mongo as primary DB: store/repository + contract - DONE

Define a domain contract and implement providers behind it:

ProductStore interface: CRUD, search, settings

MongoProductStore (primary)

PrismaProductStore (optional fallback/secondary)

Select provider in one place (e.g. server/stores/index.ts based on env/config). No if mongo else prisma scattered around.

8) Comments (but only the high-signal kind)

Add comments where the why isn’t obvious:

business rules / edge cases

non-trivial performance tradeoffs

tricky type constraints

“this must stay in this order because…”

Avoid comments that restate the code.

9) Centralize DB connection & collection access

Keep Mongo wiring out of routes/components:

server/db/mongoClient.ts (singleton)

server/db/collections.ts (typed collection getters)

server/repositories/* (low-level queries)

server/services/* (business rules + orchestration)

Routes/actions should call services, not the DB directly.

10) TanStack Query: key factory + query/mutation folders

Standardize data access:

features/<NAMEOFSECTION>/queries/keys.ts (key factory)

features/<NAMEOFSECTION>/queries/use<NAMEOFSECTION>.ts

features/<NAMEOFSECTION>/mutations/useUpdate<NAMEOFSECTION>.ts

Rule: no stringly-typed query keys inside components.

11) TanStack Table: create a “table kit”

Tables explode in complexity—separate it:

features/products/table/columns.ts

features/products/table/useProductsTable.ts

features/products/table/filters.ts

UI component becomes mostly render logic.

12)  Consistent look of components

Pick one approach and enforce it:

shared UI primitives (Button, Input, Card, Modal)

consistent spacing/typography scale (tokens)

consistent empty/loading/error states (shared components)

consistent table/list patterns (shared)

# ShadCN (copy-paste) without chaos: vendor vs wrappers

Treat components/ui/* as “vendor-ish”:

minimal edits in components/ui

your consistent look lives in wrappers like shared/ui/AppButton, AppDialog, AppInput

This is the fastest way to enforce consistent UI across the app.

13) 
Quality gates you listed: make them one command

Make this a single “CI-like” local command:

npx tsc --noEmit

npx eslint .

npx test (or vitest, jest)

optional: format check (prettier --check)

If you put it behind npm run check, it becomes frictionless.

14) Auth.js (NextAuth v5): one “auth module”

Centralize all auth decisions:

server/auth/* (config, callbacks, providers, role helpers)

helpers like requireUser(), requireRole()

Stops authorization logic from spreading across routes/actions.

15) LLM providers (OpenAI + Ollama): one interface

Hide both backends behind one API:

server/llm/provider.ts (interface)

server/llm/openai.ts

server/llm/ollama.ts

server/llm/prompts/* (versioned prompts + tests)

Then the app just calls llm.chat(...).

16) Org technique that actually sticks: PR patterns + checklists

Make structure maintain itself:

“move-only PRs” (renames/moves only) separate from behavior changes

PR checklist: boundaries, query keys, RSC/client split, loading/error states, tests