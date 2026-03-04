# Prop Drilling Scan

Generated at: 2026-03-04T23:27:02.066Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 8
- Resolved forwarded transitions: 75
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 8

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:case-resolver` | 4 |
| `feature:ai` | 2 |
| `feature:document-editor` | 1 |
| `feature:products` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `AiPathsSettings` | `src/features/ai/ai-paths/components/AiPathsSettings.tsx` | 0 | 0 | yes |
| 2 | `JobQueuePanel` | `src/features/ai/ai-paths/components/job-queue-panel.tsx` | 0 | 0 | yes |
| 3 | `CaseListNodeItemWrapper` | `src/features/case-resolver/components/CaseListPanel.tsx` | 0 | 0 | yes |
| 4 | `CaseResolverCategoryModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 5 | `CaseResolverIdentifierModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 6 | `CaseResolverTagModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 7 | `RichTextEditor` | `src/features/document-editor/components/RichTextEditor.tsx` | 0 | 0 | yes |
| 8 | `ProductFormModal` | `src/features/products/components/modals/ProductFormModal.tsx` | 0 | 0 | yes |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
