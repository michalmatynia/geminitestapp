# Import Boundaries Check

Generated at: 2026-03-08T04:48:36.676Z

## Summary

- Status: FAILED
- Files scanned: 4278
- Features tracked: 16
- Circular dependencies: 19
- Errors: 391
- Warnings: 139
- Info: 0

## Circular Dependencies

- products -> files -> products
- products -> integrations -> products
- integrations -> data-import-export -> integrations
- products -> integrations -> data-import-export -> products
- integrations -> product-sync -> integrations
- ai -> jobs -> products -> ai
- admin -> ai -> jobs -> products -> admin
- products -> drafter -> products
- ai -> jobs -> ai
- ai -> jobs -> case-resolver -> ai
- case-resolver -> case-resolver-capture -> case-resolver
- admin -> ai -> jobs -> case-resolver -> admin
- ai -> kangur -> ai
- admin -> ai -> kangur -> admin
- admin -> ai -> kangur -> cms -> admin
- kangur -> cms -> app-embeds -> kangur
- kangur -> cms -> kangur
- admin -> ai -> admin
- admin -> ai -> notesapp -> admin

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| ai | admin, auth, files, foldertree, jobs, kangur, notesapp, playwright, products, prompt-engine, prompt-exploder, tooltip-engine, viewer3d | 13 |
| products | admin, ai, drafter, files, foldertree, integrations, internationalization, product-sync, tooltip-engine | 9 |
| case-resolver | admin, ai, auth, case-resolver-capture, document-editor, filemaker, foldertree, prompt-exploder | 8 |
| cms | admin, app-embeds, files, foldertree, gsap, kangur, products, viewer3d | 8 |
| kangur | admin, ai, auth, cms, document-editor, foldertree, tooltip-engine | 7 |
| admin | ai, auth, foldertree, notesapp, products, prompt-engine | 6 |
| jobs | ai, case-resolver, integrations, product-sync, products | 5 |
| integrations | data-import-export, playwright, product-sync, products | 4 |
| notesapp | admin, document-editor, foldertree | 3 |
| case-resolver-capture | case-resolver, filemaker | 2 |
| data-import-export | integrations, products | 2 |
| files | products, viewer3d | 2 |
| prompt-exploder | foldertree, tooltip-engine | 2 |
| app-embeds | kangur | 1 |
| drafter | products | 1 |
| product-sync | integrations | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 323 | 0 | 0 |
| prisma-outside-server | 49 | 0 | 0 |
| circular-feature-dep | 19 | 0 | 0 |
| deep-relative-import | 0 | 139 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> files -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: integrations -> data-import-export -> integrations |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> data-import-export -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: integrations -> product-sync -> integrations |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> jobs -> products -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> jobs -> products -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> drafter -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> jobs -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> jobs -> case-resolver -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: case-resolver -> case-resolver-capture -> case-resolver |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> jobs -> case-resolver -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> kangur -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> kangur -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> kangur -> cms -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: kangur -> cms -> app-embeds -> kangur |
| ERROR | circular-feature-dep | - | Circular dependency between features: kangur -> cms -> kangur |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> ai -> notesapp -> admin |
| ERROR | cross-feature-internal-import | src/features/admin/components/Menu.tsx:19 | Imports internal path from feature "ai": @/features/ai/chatbot/hooks/useChatbotMutations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/components/Menu.tsx:20 | Imports internal path from feature "ai": @/features/ai/chatbot/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/layout/AdminLayout.tsx:17 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/layout/AdminLayout.tsx:21 | Imports internal path from feature "notesapp": @/features/notesapp/hooks/NoteSettingsContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/AdminGlobalValidatorPage.tsx:7 | Imports internal path from feature "ai": @/features/ai/image-studio. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/AdminGlobalValidatorPage.tsx:8 | Imports internal path from feature "products": @/features/products/components/settings/ValidatorSettings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/AdminGlobalValidatorPage.tsx:9 | Imports internal path from feature "products": @/features/products/components/settings/validator-settings/ValidatorDocsTooltips. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/AdminMenuSettingsPage.tsx:16 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/validator-lists/ValidatorListNodeItem.tsx:7 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/validator-lists/ValidatorListTree.tsx:5 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/validator-lists/ValidatorListTree.tsx:10 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/pages/validator-lists/ValidatorListTreeContext.tsx:5 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | prisma-outside-server | src/features/ai/agent-runtime/audit/server.ts:8 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agent-runtime/core/engine.ts:7 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agent-runtime/memory/index.ts:12 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agent-runtime/tools/run-agent-browser-control.ts:7 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agent-runtime/tools/segments/tool-logging.ts:1 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agentcreator/api/agent/[runId]/route.ts:20 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | prisma-outside-server | src/features/ai/agentcreator/server/persona-memory.ts:3 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-context-registry/services/runtime-providers/kangur.ts:6 | Imports internal path from feature "kangur": @/features/kangur/context-registry/refs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-context-registry/services/runtime-providers/kangur.ts:11 | Imports internal path from feature "kangur": @/features/kangur/server/context-registry. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsSimulation.ts:15 | Imports internal path from feature "products": @/features/products/hooks/productCache. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsSamples.ts:6 | Imports internal path from feature "products": @/features/products/hooks/productCache. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/components/node-config/dialog/PlaywrightNodeConfigSection.tsx:17 | Imports internal path from feature "playwright": @/features/playwright/hooks/usePlaywrightPersonas. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx:5 | Imports internal path from feature "admin": @/features/admin/context/AdminLayoutContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/pages/AdminAiPathsQueuePage.tsx:7 | Imports internal path from feature "files": @/features/files/components/FileUploadEventsPanel. Use the barrel export instead. |
| ERROR | prisma-outside-server | src/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository.ts:3 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | cross-feature-internal-import | src/features/ai/ai-paths/services/playwright-node-runner.ts:9 | Imports internal path from feature "playwright": @/features/playwright/constants/playwright. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/chatbot/components/SettingsTab.tsx:58 | Imports internal path from feature "playwright": @/features/playwright/utils/personas. Use the barrel export instead. |
| ERROR | prisma-outside-server | src/features/ai/chatbot/services/chatbot-session-repository.ts:12 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:6 | Imports internal path from feature "viewer3d": @/features/viewer3d/components/Viewer3D. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/ImageStudioSingleSlotManager.tsx:14 | Imports internal path from feature "products": @/features/products/components/ProductImageManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/ImageStudioSingleSlotManager.tsx:15 | Imports internal path from feature "products": @/features/products/components/ProductImageManagerControllerContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/modals/DriveImportModal.tsx:6 | Imports internal path from feature "files": @/features/files/components/FileManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx:38 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/SlotTree.tsx:6 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/studio-modals/SlotInlineEditCardTab.tsx:4 | Imports internal path from feature "products": @/features/products/components/ProductImageManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/studio-modals/SlotInlineEditCardTab.tsx:5 | Imports internal path from feature "products": @/features/products/components/ProductImageManagerControllerContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/studio-modals/StudioInlineEditContext.tsx:13 | Imports internal path from feature "products": @/features/products/components/ProductImageManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/context/ImageStudioSettingsContext.tsx:12 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/context/ProjectsContext.tsx:27 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/context/PromptContext.tsx:20 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/context/SettingsContext.tsx:13 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/pages/AdminImageStudioPage.tsx:6 | Imports internal path from feature "admin": @/features/admin/context/AdminLayoutContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/utils/studio-master-tree-adapter.ts:1 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/app-embeds/lib/constants.ts:3 | Imports internal path from feature "kangur": @/features/kangur/config/routing. Use the barrel export instead. |
| ERROR | prisma-outside-server | src/features/auth/services/auth-security-profile.ts:3 | Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/filemaker-upsert.ts:1 | Imports internal path from feature "case-resolver": @/features/case-resolver/party-matching. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/filemaker-upsert.ts:7 | Imports internal path from feature "case-resolver": @/features/case-resolver/utils/caseResolverUtils. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/filemaker-upsert.ts:8 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/proposals/cleanup.ts:1 | Imports internal path from feature "case-resolver": @/features/case-resolver/party-matching. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/proposals/cleanup.ts:5 | Imports internal path from feature "case-resolver": @/features/case-resolver/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/proposals/inference.ts:1 | Imports internal path from feature "case-resolver": @/features/case-resolver/party-matching. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver-capture/proposals/inference.ts:7 | Imports internal path from feature "case-resolver": @/features/case-resolver/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/adapter.ts:1 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/case-resolver-party-select.ts:1 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseListPanel.tsx:15 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-paths/components/canvas-board. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-paths/context/AiPathsProvider. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx:15 | Imports internal path from feature "ai": @/features/ai/ai-paths/context/hooks/useGraph. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx:16 | Imports internal path from feature "ai": @/features/ai/ai-paths/context/hooks/useSelection. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverFolderTree.tsx:6 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverFolderTree.tsx:13 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverFolderTree.tsx:14 | Imports internal path from feature "foldertree": @/features/foldertree/v2/operations/drop. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverNodeFileWorkspace.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-paths/components/canvas-board. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverNodeFileWorkspace.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-paths/context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-paths/components/canvas-board. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:8 | Imports internal path from feature "ai": @/features/ai/ai-paths/context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverTreeHeader.tsx:8 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverTreeNode.tsx:6 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverViewContext.tsx:16 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/CaseResolverViewContext.tsx:20 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/list/CaseListHeader.tsx:7 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/list/search/CaseListSearchPanel.tsx:15 | Imports internal path from feature "foldertree": @/features/foldertree/v2/operations/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx:6 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/page/CaseResolverDocumentEditor.tsx:23 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/page/CaseResolverScanFileEditor.tsx:18 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx:3 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx:7 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx:8 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/PromptExploderCaptureMappingModalRuntimeContext.tsx:5 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/components/PromptExploderCaptureMappingModalRuntimeContext.tsx:9 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/context/AdminCaseResolverCasesContext.tsx:4 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/context/CaseResolverFolderTreeContext.tsx:32 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useApplyCaptureProposal.ts:5 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useApplyCaptureProposal.ts:9 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useApplyCaptureProposal.ts:12 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useApplyCaptureProposal.ts:29 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/filemaker-upsert. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useCaptureProposalState.ts:4 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useCaptureProposalState.ts:9 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/capture-actions/useCaptureProposalState.ts:11 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useAdminCaseResolverCaptureActions.ts:3 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useAdminCaseResolverDocumentActions.ts:25 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useAdminCaseResolverMetadataActions.ts:10 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useAdminCaseResolverPageState.ts:8 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.editor-actions.ts:19 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.helpers.canonical.ts:1 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.helpers.ts:36 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.ocr-actions.ts:19 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-actions.ts:7 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-actions.ts:17 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync.ts:1 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync.ts:5 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync.ts:10 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.ts:6 | Imports internal path from feature "admin": @/features/admin/context/AdminLayoutContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.ts:10 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useCaseResolverState.ts:15 | Imports internal path from feature "filemaker": @/features/filemaker/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/hooks/useNodeFileWorkspaceState.ts:8 | Imports internal path from feature "ai": @/features/ai/ai-paths/context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/pages/AdminCaseResolverPreferencesPage.tsx:6 | Imports internal path from feature "auth": @/features/auth/hooks/useUserPreferences. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/party-matching.ts:1 | Imports internal path from feature "prompt-exploder": @/features/prompt-exploder/bridge. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/relation-search/components/RelationTreeBrowser.tsx:5 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/relation-search/components/RelationTreeBrowser.tsx:11 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx:16 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/relation-search/components/sections/SearchBar.tsx:4 | Imports internal path from feature "foldertree": @/features/foldertree/v2/search. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/settings.files.ts:1 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/types.ts:1 | Imports internal path from feature "case-resolver-capture": @/features/case-resolver-capture/proposals. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/utils/case-resolver/history.ts:1 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/utils/caseResolverUtils.ts:1 | Imports internal path from feature "document-editor": @/features/document-editor/content-format. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/case-resolver/workers/case-resolver-ocr/api-keys.ts:1 | Imports internal path from feature "ai": @/features/ai/image-studio/server. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/CmsEditorLayout.tsx:5 | Imports internal path from feature "admin": @/features/admin/layout/AdminLayout. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/AppEmbedBlock.tsx:6 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/AppEmbedBlock.tsx:13 | Imports internal path from feature "kangur": @/features/kangur/config/routing. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:5 | Imports internal path from feature "kangur": @/features/kangur/cms-builder/project. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:6 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurAssignmentSpotlight. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:7 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurActiveLessonPanelWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:8 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameCalendarTrainingWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:9 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameGeometryTrainingWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:10 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameHomeActionsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:11 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameHomeHeroWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:12 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameKangurSessionWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:13 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameKangurSetupWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:14 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameNavigationWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:15 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameOperationSelectorWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:16 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameQuestionWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:17 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameResultWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:18 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameTrainingSetupWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:19 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurGameXpToastWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:20 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLessonNavigationWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:21 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:22 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileHeroWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:23 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:24 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileMasteryWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:25 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileOverviewWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:26 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:27 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:28 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLearnerProfileSessionsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:29 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:30 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardHeroWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:31 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:32 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardProgressWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:33 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardScoresWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:34 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurParentDashboardTabsWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:35 | Imports internal path from feature "kangur": @/features/kangur/ui/components/Leaderboard. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:36 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurLessonsCatalogWidget. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:37 | Imports internal path from feature "kangur": @/features/kangur/ui/components/PlayerProgressCard. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:38 | Imports internal path from feature "kangur": @/features/kangur/ui/components/KangurPriorityAssignments. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:39 | Imports internal path from feature "kangur": @/features/kangur/ui/context/KangurGameRuntimeContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:43 | Imports internal path from feature "kangur": @/features/kangur/ui/context/KangurLearnerProfileRuntimeContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:44 | Imports internal path from feature "kangur": @/features/kangur/ui/context/KangurParentDashboardRuntimeContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:45 | Imports internal path from feature "kangur": @/features/kangur/ui/context/KangurLessonsRuntimeContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:46 | Imports internal path from feature "kangur": @/features/kangur/ui/hooks/useKangurProgressState. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:47 | Imports internal path from feature "kangur": @/features/kangur/ui/context/KangurRoutingContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:48 | Imports internal path from feature "kangur": @/features/kangur/ui/pages/Game. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:49 | Imports internal path from feature "kangur": @/features/kangur/ui/pages/LearnerProfile. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:50 | Imports internal path from feature "kangur": @/features/kangur/ui/pages/Lessons. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx:51 | Imports internal path from feature "kangur": @/features/kangur/ui/pages/ParentDashboard. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/CmsMenu.tsx:8 | Imports internal path from feature "gsap": @/features/gsap/utils/presets. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/GsapAnimationWrapper.tsx:7 | Imports internal path from feature "gsap": @/features/gsap/utils/presets. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/AppEmbedsPanel.tsx:6 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/AppEmbedsPanel.tsx:7 | Imports internal path from feature "app-embeds": @/features/app-embeds/providers/AppEmbedsProvider. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/Asset3DPickerModal.tsx:7 | Imports internal path from feature "viewer3d": @/features/viewer3d/hooks/useAsset3dQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/BlockPicker.tsx:5 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/ColumnBlockPicker.tsx:5 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/ComponentTreePanel.tsx:5 | Imports internal path from feature "foldertree": @/features/foldertree/v2. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/MediaLibraryPanel.tsx:12 | Imports internal path from feature "files": @/features/files/components/FileManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PageBuilderLayout.tsx:6 | Imports internal path from feature "admin": @/features/admin/context/AdminLayoutContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PreviewBlock.tsx:9 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PreviewBlock.tsx:16 | Imports internal path from feature "kangur": @/features/kangur/cms-builder/project. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/registry/block-definitions-media.ts:1 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/registry/block-definitions-media.ts:8 | Imports internal path from feature "kangur": @/features/kangur/cms-builder/project. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/settings/BlockSettingsTab.tsx:8 | Imports internal path from feature "app-embeds": @/features/app-embeds/lib/constants. Use the barrel export instead. |

> Showing first 200 of 530 issues.

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
