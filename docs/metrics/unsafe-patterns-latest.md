---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-10T11:50:00.210Z

## Summary

- Status: PASSED
- Files scanned: 4564
- Errors: 0
- Warnings: 0
- Info: 21

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 0 |
| eslintDisableCount | 18 |
| nonNullAssertionCount | 3 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @next/next/no-img-element | 17 |
| import/order | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 18 |
| non-null-assertion | 0 | 0 | 3 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:174 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/ai/image-studio/components/center-preview/SplitVariantPreview.tsx:234 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/center-preview/SplitVariantPreview.tsx:304 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx:198 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/studio-modals/SlotInlineEditCardTab.tsx:201 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/studio-modals/SlotInlineEditCompositesTab.tsx:29 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/studio-modals/SlotInlineEditCompositesTab.tsx:100 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/studio-modals/SlotInlineEditMasksTab.tsx:35 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/VersionGraphComparePanel.tsx:60 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/VersionGraphInspector.tsx:81 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/ai/image-studio/components/VersionNodeDetailsModal.tsx:323 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/case-resolver/components/CaseResolverFileViewer.tsx:186 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/case-resolver/components/page/CaseResolverScanFileEditor.tsx:341 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/components/KangurLessonDocumentRenderer.tsx:242 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/products/components/form/studio/StudioPreviewCanvas.tsx:37 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/features/products/components/ProductImageSlot.tsx:184 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/shared/contracts/integrations/index.ts:1 | eslint-disable comment disabling: import/order |
| INFO | non-null-assertion | src/shared/lib/ai-paths/hooks/trigger-event-settings.ts:239 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/ui/AgentPersonaMoodAvatar.tsx:42 | eslint-disable comment disabling: @next/next/no-img-element |
| INFO | eslint-disable | src/shared/ui/vector-canvas/components/CanvasImageLayer.tsx:12 | eslint-disable comment disabling: @next/next/no-img-element |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
