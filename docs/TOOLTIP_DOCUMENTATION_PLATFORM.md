# Tooltip + Documentation Platform

## Goal

Centralize documentation and tooltip behavior into two isolated application-wide features:

- `src/shared/lib/documentation`
- `src/features/tooltip-engine`

No module-level tooltip copy should be hardcoded in docs-enabled modules.
Tooltip content must be derived from documentation entries.

## Feature Boundaries

### Documentation (`src/shared/lib/documentation`)

Responsibilities:

- Define normalized documentation schema (`DocumentationEntry`)
- Aggregate module catalogs into one registry
- Resolve docs entries by `moduleId + id`
- Resolve docs entries from DOM metadata (`data-doc-id`, alias matching)
- Provide search and module-scoped listing APIs

Current catalogs:

- Image Studio: `src/shared/lib/documentation/catalogs/image-studio-docs.ts`
- Prompt Exploder: `docs/prompt-exploder/tooltip-catalog.ts` bridged via
  `src/shared/lib/documentation/catalogs/prompt-exploder.ts`
- Validator: `src/shared/lib/documentation/catalogs/validator-docs.ts`
- Shared cross-feature tooltip docs: `src/shared/lib/documentation/catalogs/shared-tooltip-docs.ts`

### Tooltip Engine (`src/features/tooltip-engine`)

Responsibilities:

- Build tooltip text from documentation only (`title: summary`)
- Provide reusable React tooltip wrapper (`DocumentationTooltip`)
- Provide DOM auto-enhancer (`DocumentationTooltipEnhancer`)
- Provide module toggle persistence hook (`useDocsTooltipsSetting`)
- Provide integration factory (`createDocsTooltipIntegration`)

## Integration Contract

For a module to adopt docs-driven tooltips:

1. Add docs entries to `src/shared/lib/documentation/catalogs/*`.
2. Use doc ids in UI controls (`docId`, `data-doc-id`).
3. Wrap UI with `DocumentationTooltip` or module adapter.
4. For legacy DOM trees, attach `DocumentationTooltipEnhancer` at route root.
5. Use module-specific storage key via `useDocsTooltipsSetting`.

## Enforced Guardrail

ESLint now blocks hardcoded `<Tooltip content='...'>` literals across feature code:

- `src/features/**/*.{ts,tsx}`

Rule location:

- `eslint.config.cjs` (`no-restricted-syntax` selector for literal tooltip content)

## Current Integration Coverage

Documentation-backed tooltip integration is now active for:

- Image Studio
- Prompt Exploder
- Validator Settings
- Vector Drawing toolbar
- Data Import/Export import grid warnings
- Prompt Engine rule row controls
- Observability system log action controls
- CMS component settings + advanced animation path controls
- AI Paths regex prompt placeholder chips
- Products list imported badge

## Backward-Compatible Adapters

To avoid breaking existing imports, module-local files are kept as adapters:

- `src/features/ai/image-studio/utils/studio-docs.ts`
- `src/features/products/components/settings/validator-settings/validator-docs-catalog.ts`

These now source data from global documentation feature.
