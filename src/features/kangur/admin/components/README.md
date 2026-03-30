# Kangur Admin Components

This folder owns reusable admin-facing UI components shared across Kangur
authoring, settings, lesson-management, and observability workspaces.

## Layout

- `__tests__/`: component tests for components owned directly by this folder
- `observability/`: observability-specific admin component building blocks
- `theme-settings/`: theme-settings component support files
- `KangurAdmin*.tsx`: shared admin shell, card, metric, and workspace chrome
- `KangurAiTutor*.tsx`: AI tutor admin panels and editor components
- `KangurDocumentation*.tsx`: documentation center and tooltip settings components
- `KangurPageContent*.tsx`: page-content authoring components
- `Lesson*.tsx`, `TestSuite*.tsx`: lesson/test-suite tree and editor components

Keep page-level admin composition in `src/features/kangur/admin/` and use this
folder for reusable component pieces.
