Typed boundaries

6. Architecture & modularity (the biggest long-term win)

Feature-based folder structure

features/products/{components,actions,services,types,validators,tests} (or similar).

Layering

UI (components) → Application (actions/use-cases) → Domain (rules/types) → Data (repositories).

UI must not call Prisma directly.

Repository pattern (lightweight)

Centralize DB access functions to reduce query duplication and make testing easier.

Reusable components

Extract patterns: tables, filters, pagination, modals, form fields, confirm dialogs, empty states.

Shared utilities

lib/ for cross-cutting concerns: logging, error helpers, validation, date/currency formatting.