---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:prompt-exploder'
canonical: true
---

# Prompt Exploder Docs Tooltips

## Goal

Provide in-product documentation hints for Prompt Exploder controls. Users can enable a single switch and receive docs-based tooltips over controls and actions.

## UX

- Switch location: Prompt Exploder header (`Docs Tooltips`).
- Documentation source location: `/docs/prompt-exploder/tooltip-catalog.ts` (surfaced in Prompt Exploder `Docs` tab).
- Scope:
  - `/admin/prompt-exploder`
  - `/admin/prompt-exploder/projects`
  - `/admin/prompt-exploder/settings`
- Persistence: localStorage key `prompt_exploder:docs_tooltips_enabled`.

## Implementation

- Canonical docs catalog:
  - `docs/prompt-exploder/tooltip-catalog.ts`
- Runtime docs catalog bridge:
  - `src/features/prompt-exploder/docs/catalog.ts`
- Tooltip registry (resolver):
  - `src/features/prompt-exploder/docs/tooltip-registry.ts`
- Runtime enhancer:
  - `src/features/prompt-exploder/components/DocsTooltipEnhancer.tsx`
- Docs tab UI:
  - `src/features/prompt-exploder/components/PromptExploderDocsTab.tsx`
- Switch component:
  - `src/features/prompt-exploder/components/PromptExploderDocsTooltipSwitch.tsx`
- Toggle persistence hook:
  - `src/features/prompt-exploder/hooks/usePromptExploderDocsTooltips.ts`
- Route wiring:
  - `src/features/prompt-exploder/components/PromptExploderHeaderBar.tsx`
  - `src/features/prompt-exploder/pages/AdminPromptExploderPage.tsx`
  - `src/features/prompt-exploder/pages/AdminPromptExploderProjectsPage.tsx`
  - `src/features/prompt-exploder/pages/AdminPromptExploderSettingsPage.tsx`

## Matching Strategy

1. Explicit mapping via `data-doc-id`.
2. Semantic matching via aliases against:
   - `aria-label`
   - `title`
   - `placeholder`
   - `name`
   - `id`
   - visible text content
3. Docs-backed fallback tooltip (`workflow_overview`) for unmapped controls.

## Coverage Requirement

When new controls are added, update registry aliases or add explicit `data-doc-id` so every control receives a meaningful tooltip while the switch is enabled.

## Recommended Extension

For controls with ambiguous labels (for example repeated `Apply` or `Clear` buttons), add explicit `data-doc-id` to ensure deterministic tooltip text.
