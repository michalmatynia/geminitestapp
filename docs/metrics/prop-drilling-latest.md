---
owner: 'Platform Team'
last_reviewed: '2026-05-02'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-05-02T20:57:20.029Z

## Snapshot

- Scanned source files: 9462
- JSX files scanned: 3168
- Components detected: 5926
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 1252
- Resolved forwarded transitions: 5413
- Candidate chains (depth >= 2): 5413
- Candidate chains (depth >= 3): 1937
- High-priority chains (depth >= 4): 611
- Unknown spread forwarding edges: 104
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:products` | 408 |
| `feature:filemaker` | 299 |
| `feature:kangur` | 168 |
| `feature:playwright` | 99 |
| `feature:admin` | 61 |
| `feature:ai` | 50 |
| `feature:integrations` | 44 |
| `feature:database` | 22 |
| `feature:viewer3d` | 22 |
| `shared-ui` | 17 |
| `feature:cms` | 12 |
| `feature:drafter` | 11 |
| `feature:auth` | 10 |
| `feature:case-resolver` | 9 |
| `feature:files` | 5 |
| `feature:internationalization` | 4 |
| `feature:jobs` | 3 |
| `shared` | 3 |
| `shared-lib` | 2 |
| `app` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `ProductScanModalView` | `src/features/products/components/list/ProductScanModal.view.tsx` | 22 | 25 | yes | yes |
| 2 | `MenuBuilderContent` | `src/features/admin/pages/menu-settings/MenuBuilderSection.tsx` | 22 | 24 | no | yes |
| 3 | `ProductFormScansHistory` | `src/features/products/components/form/ProductFormScansHistory.tsx` | 22 | 23 | no | yes |
| 4 | `CategoryMapperTablePanel` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTablePanel.tsx` | 20 | 39 | yes | yes |
| 5 | `ProductScanHistoryRow` | `src/features/products/components/form/ProductScanHistoryRow.tsx` | 18 | 29 | no | yes |
| 6 | `FilemakerOrganizationMasterTreeNode` | `src/features/filemaker/components/shared/FilemakerOrganizationMasterTreeNode.tsx` | 18 | 21 | yes | yes |
| 7 | `ProductFormScansHistoryList` | `src/features/products/components/form/ProductFormScansHistoryList.tsx` | 18 | 18 | no | yes |
| 8 | `MailClientDashboardOverview` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.dashboard-overview.tsx` | 17 | 25 | no | yes |
| 9 | `MailClientWorkspaceBlocks` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.dashboard.tsx` | 17 | 24 | no | yes |
| 10 | `FilemakerLexiconPageView` | `src/features/filemaker/pages/AdminFilemakerLexiconPage.components.tsx` | 16 | 35 | no | yes |
| 11 | `ShippingGroupFormModalBody` | `src/features/products/components/settings/ShippingGroupsSettings.modal.tsx` | 15 | 20 | no | yes |
| 12 | `ShippingGroupsSettingsView` | `src/features/products/components/settings/ShippingGroupsSettings.view.tsx` | 15 | 18 | no | yes |
| 13 | `OrganizationAddressFormControls` | `src/features/filemaker/components/page/OrganizationAddressControls.tsx` | 15 | 16 | no | yes |
| 14 | `MailClientReaderEditor` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.workspace-reader.tsx` | 15 | 16 | no | yes |
| 15 | `PlaywrightProgrammableConnectionControlsSection` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionControlsSection.tsx` | 15 | 16 | no | yes |
| 16 | `KangurPrimaryNavigationDeferredUtilityRuntime` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.deferred-utility-runtime.tsx` | 14 | 18 | no | yes |
| 17 | `ImportConfigurationCard` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableEditorsSection.tsx` | 14 | 16 | no | yes |
| 18 | `LiveScripterUrlBar` | `src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx` | 14 | 15 | no | yes |
| 19 | `MailClientDashboardFilters` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.filters.tsx` | 14 | 14 | no | yes |
| 20 | `EventListHeader` | `src/features/filemaker/components/page/FilemakerEventsListPanel.tsx` | 13 | 15 | no | yes |
| 21 | `InvoiceListHeader` | `src/features/filemaker/components/page/FilemakerInvoicesListPanel.tsx` | 13 | 15 | no | yes |
| 22 | `KangurRenderedRouteContent` | `src/features/kangur/ui/KangurFeatureApp.tsx` | 13 | 15 | no | yes |
| 23 | `MailClientAttentionBlock` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.dashboard.tsx` | 13 | 13 | no | yes |
| 24 | `LiveScripterStepDetailFields` | `src/features/playwright/components/live-scripter/LiveScripterStepDetailFields.tsx` | 13 | 13 | no | yes |
| 25 | `AvailableListsSection` | `src/features/admin/pages/validator-lists/ValidatorListsSections.tsx` | 12 | 22 | no | yes |
| 26 | `ShippingGroupsSettingsList` | `src/features/products/components/settings/ShippingGroupsSettings.list.tsx` | 12 | 12 | no | yes |
| 27 | `GroupEditorHeader` | `src/features/filemaker/pages/campaign-edit-sections/AudienceConditionBuilder.group-header.tsx` | 11 | 15 | no | yes |
| 28 | `CampaignEditActions` | `src/features/filemaker/pages/AdminFilemakerCampaignEditPage.actions.tsx` | 11 | 13 | no | yes |
| 29 | `ClusterSection` | `src/features/integrations/components/selector-registry-probe-sessions/ClusterSection.tsx` | 11 | 12 | no | yes |
| 30 | `LiveScripterRegistryBindingFields` | `src/features/playwright/components/live-scripter/LiveScripterRegistryBindingFields.tsx` | 11 | 12 | no | yes |
| 31 | `SyncScheduleSection` | `src/features/admin/pages/admin-sync-settings-sections.tsx` | 11 | 11 | no | yes |
| 32 | `WorkspaceMain` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.workspace.tsx` | 10 | 27 | no | yes |
| 33 | `MailAccountSettingsForm` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.form.tsx` | 10 | 22 | no | yes |
| 34 | `NavTreePrimaryRow` | `src/features/admin/components/menu/nav-tree-node-content.tsx` | 10 | 19 | no | yes |
| 35 | `TableBrowserSection` | `src/features/database/pages/database-preview/TableBrowserSection.tsx` | 10 | 19 | no | yes |
| 36 | `DraftStructuredInputControl` | `src/features/drafter/components/DraftStructuredProductNameInput.parts.tsx` | 10 | 17 | no | yes |
| 37 | `MailClientMailboxContent` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.mailboxes.tsx` | 10 | 17 | no | yes |
| 38 | `FilemakerOrganizationsSelectionActions` | `src/features/filemaker/components/page/FilemakerOrganizationsSelectionActions.tsx` | 10 | 15 | yes | yes |
| 39 | `AdminFilemakerCampaignsPageView` | `src/features/filemaker/pages/AdminFilemakerCampaignsPage.view.tsx` | 10 | 14 | no | yes |
| 40 | `ProductScanRow` | `src/features/products/components/list/ProductScanModal.row.tsx` | 10 | 14 | no | yes |
| 41 | `CatalogLanguagesContent` | `src/features/products/components/settings/modals/catalog-modal/CatalogLanguagesSection.tsx` | 10 | 14 | no | yes |
| 42 | `MailClientAttentionAccountCard` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.attention-accounts.tsx` | 10 | 13 | no | yes |
| 43 | `ConnectionSelectorCard` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionControlsSection.tsx` | 10 | 13 | no | yes |
| 44 | `MailClientFocusedAccountControls` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.focused.tsx` | 10 | 12 | no | yes |
| 45 | `MailClientRecentThreadsSection` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.recent.tsx` | 10 | 12 | no | yes |
| 46 | `SessionCard` | `src/features/integrations/components/selector-registry-probe-sessions/SessionCard.tsx` | 10 | 12 | no | yes |
| 47 | `Switch` | `src/shared/ui/switch.tsx` | 10 | 12 | yes | yes |
| 48 | `AudienceGroupEditor` | `src/features/filemaker/pages/campaign-edit-sections/AudienceConditionBuilder.editor.tsx` | 10 | 11 | no | yes |
| 49 | `LessonsTreePanel` | `src/features/kangur/admin/components/lessons-manager/LessonsTreePanel.tsx` | 10 | 11 | no | yes |
| 50 | `LayoutColumn` | `src/features/admin/pages/menu-settings/MenuBuilderSection.tsx` | 10 | 10 | no | yes |
| 51 | `KangurPrimaryNavigationDeferredUtilityMount` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.deferred-utility-mount.tsx` | 10 | 10 | no | yes |
| 52 | `ProductListSelectorsAndTriggers` | `src/features/products/components/list/ProductListHeader.selectors.tsx` | 10 | 10 | no | yes |
| 53 | `GlobalValidatorPanelLayout` | `src/features/admin/pages/admin-global-validator-layout.tsx` | 9 | 25 | no | yes |
| 54 | `DraftStructuredInputElement` | `src/features/drafter/components/DraftStructuredProductNameInput.parts.tsx` | 9 | 20 | no | yes |
| 55 | `SuggestionRow` | `src/features/integrations/components/selector-registry-probe-sessions/SuggestionRow.tsx` | 9 | 17 | no | yes |
| 56 | `MailClientAttentionAccountActions` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.attention-accounts.tsx` | 9 | 14 | no | yes |
| 57 | `MailClientMailboxCard` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.mailboxes.tsx` | 9 | 13 | no | yes |
| 58 | `ClusterSectionActions` | `src/features/integrations/components/selector-registry-probe-sessions/ClusterSection.tsx` | 9 | 11 | no | yes |
| 59 | `LiveScripterNavigationRow` | `src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx` | 9 | 11 | no | yes |
| 60 | `MultiSelectDropdownPanel` | `src/shared/ui/multi-select.helpers.tsx` | 9 | 10 | no | yes |
| 61 | `PreparedApplicationVersionHistory` | `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` | 9 | 9 | no | yes |
| 62 | `MailClientAttentionAccountsGrid` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.attention.tsx` | 9 | 9 | no | yes |
| 63 | `LessonsManagerFilters` | `src/features/kangur/admin/components/lessons-manager/LessonsManagerFilters.tsx` | 9 | 9 | no | yes |
| 64 | `LiveScripterScopeControls` | `src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx` | 9 | 9 | no | yes |
| 65 | `PlaywrightProgrammableConnectionRuntimeSettingsCard` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionRuntimeSettingsCard.tsx` | 9 | 9 | no | yes |
| 66 | `ProductTableFooterConfirmModals` | `src/features/products/components/list/ProductTableFooter.tsx` | 9 | 9 | no | yes |
| 67 | `ValidatorPatternModalSimulatorControls` | `src/features/products/components/settings/validator-settings/modal/ValidatorPatternModalSimulatorControls.tsx` | 9 | 9 | no | yes |
| 68 | `ParameterRowValueEditor` | `src/features/products/components/form/ProductFormParameters.row.tsx` | 8 | 24 | no | yes |
| 69 | `ModalSlot` | `src/features/products/components/settings/ShippingGroupsSettings.view.tsx` | 8 | 19 | no | yes |
| 70 | `ProductListHeaderView` | `src/features/products/components/list/ProductListHeader.tsx` | 8 | 18 | no | yes |
| 71 | `ProductListMobileCardView` | `src/features/products/components/list/ProductListMobileCard.view.tsx` | 8 | 15 | no | yes |
| 72 | `TransientRecoveryPageContent` | `src/features/admin/pages/admin-transient-recovery-sections.tsx` | 8 | 14 | no | yes |
| 73 | `DataTable` | `src/features/database/components/CrudPanel.tsx` | 8 | 14 | no | yes |
| 74 | `QuestionsManagerHeader` | `src/features/kangur/admin/questions-manager/QuestionsManagerHeader.tsx` | 8 | 14 | no | yes |
| 75 | `ProductFormParameterRow` | `src/features/products/components/form/ProductFormParameters.row.tsx` | 8 | 14 | no | yes |
| 76 | `ParametersFormModal` | `src/features/products/components/settings/parameters/ParametersFormModal.tsx` | 8 | 14 | no | yes |
| 77 | `ValidatedFieldControl` | `src/features/products/components/form/ValidatedField.tsx` | 8 | 13 | no | yes |
| 78 | `MailClientMailboxActions` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.mailbox-actions.tsx` | 8 | 12 | no | yes |
| 79 | `ConditionRow` | `src/features/filemaker/pages/campaign-edit-sections/AudienceConditionBuilder.condition-row.tsx` | 8 | 12 | no | yes |
| 80 | `PatternNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/PatternNodeItem.tsx` | 8 | 12 | no | yes |
| 81 | `ProductFormMarketplaceCopyRows` | `src/features/products/components/form/ProductFormMarketplaceCopy.tsx` | 8 | 11 | no | yes |
| 82 | `ParserMappingRow` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserMappingList.tsx` | 8 | 10 | no | yes |
| 83 | `FilemakerLexiconValidationPatternsModal` | `src/features/filemaker/pages/AdminFilemakerLexiconPage.components.tsx` | 8 | 10 | no | yes |
| 84 | `MailClientThreadList` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.workspace-list.tsx` | 8 | 10 | no | yes |
| 85 | `ProductParseActionsFooter` | `src/features/products/components/list/ProductParseActionsModal.parts.tsx` | 8 | 10 | no | yes |
| 86 | `Asset3DListFilters` | `src/features/viewer3d/components/Asset3DListSubcomponents.tsx` | 8 | 10 | no | yes |
| 87 | `MailClientQuickActionCard` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.sections-actions.tsx` | 8 | 9 | no | yes |
| 88 | `PlaywrightProgrammableLegacyMigrationAlert` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableLegacyMigrationAlert.tsx` | 8 | 9 | no | yes |
| 89 | `DefaultRoleSettings` | `src/features/auth/pages/admin/settings/DefaultRoleSettings.tsx` | 8 | 8 | no | yes |
| 90 | `PreviewToolbar` | `src/features/cms/components/page-builder/preview-panel/PreviewToolbar.tsx` | 8 | 8 | no | yes |
| 91 | `MailClientMailboxGrid` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.mailboxes.tsx` | 8 | 8 | no | yes |
| 92 | `IntegrationModalDialogs` | `src/features/integrations/components/connections/IntegrationModal.tsx` | 8 | 8 | no | yes |
| 93 | `KangurRenderedRouteSkeletonOverlay` | `src/features/kangur/ui/KangurFeatureApp.tsx` | 8 | 8 | no | yes |
| 94 | `LiveScripterStepSpecificFields` | `src/features/playwright/components/live-scripter/LiveScripterStepDetailFields.tsx` | 8 | 8 | no | yes |
| 95 | `DraftMapperRulesPanel` | `src/features/playwright/components/programmable-integration/PlaywrightProgrammableFieldMapperCard.tsx` | 8 | 8 | no | yes |
| 96 | `ProductFormRecommendedSummaries` | `src/features/products/components/form/ProductFormRecommendedSummaries.tsx` | 8 | 8 | no | yes |
| 97 | `TitleTermEditorModal` | `src/features/products/pages/title-terms/TitleTermEditorModal.tsx` | 8 | 8 | no | yes |
| 98 | `TitleTermsToolbar` | `src/features/products/pages/title-terms/TitleTermsToolbar.tsx` | 8 | 8 | no | yes |
| 99 | `MailClientFocusedAccountRelatedContent` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.focused.tsx` | 7 | 12 | no | yes |
| 100 | `FeatureRoutingCard` | `src/features/ai/brain/components/RoutingFallbackSettings.tsx` | 7 | 11 | no | yes |
| 101 | `StepFormSelectorRegistry` | `src/features/playwright/components/step-sequencer/StepFormSelectorRegistry.tsx` | 7 | 11 | no | yes |
| 102 | `SelectionActionsMenu` | `src/shared/ui/selection-bar.tsx` | 7 | 10 | no | yes |
| 103 | `NotificationsSettingsForm` | `src/features/admin/pages/notifications/NotificationsSettingsForm.tsx` | 7 | 9 | no | yes |
| 104 | `TraderaRecoveryActions` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 7 | 9 | no | yes |
| 105 | `QuestionsManagerFilters` | `src/features/kangur/admin/questions-manager/QuestionsManagerFilters.tsx` | 7 | 9 | no | yes |
| 106 | `EditableCellInput` | `src/features/products/components/EditableCell.tsx` | 7 | 9 | no | yes |
| 107 | `Admin3DAssetsFilters` | `src/features/viewer3d/pages/admin-3d-assets/Admin3DAssetsSubcomponents.tsx` | 7 | 9 | no | yes |
| 108 | `AuthenticatedUserNav` | `src/features/admin/components/UserNav.tsx` | 7 | 8 | no | yes |
| 109 | `FrontManageSelectionForm` | `src/features/admin/pages/front-page/FrontManageSelectionForm.tsx` | 7 | 8 | no | yes |
| 110 | `ReplyEditor` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.workspace-reply.tsx` | 7 | 8 | no | yes |
| 111 | `CircleIconButton` | `src/features/products/components/list/columns/cells/IntegrationsCell.tsx` | 7 | 8 | no | yes |
| 112 | `ParametersBulkActions` | `src/features/products/components/settings/parameters/ParametersListSection.tsx` | 7 | 8 | no | yes |
| 113 | `AssetFormFields` | `src/features/viewer3d/components/Asset3DUploaderFormFields.tsx` | 7 | 8 | no | yes |
| 114 | `UserMenuContent` | `src/features/admin/components/UserNav.tsx` | 7 | 7 | no | yes |
| 115 | `ValidatorListsMainContent` | `src/features/admin/pages/validator-lists/ValidatorListsMainContent.tsx` | 7 | 7 | yes | yes |
| 116 | `AddValidatorListForm` | `src/features/admin/pages/validator-lists/components.tsx` | 7 | 7 | no | yes |
| 117 | `AiPathsCanvasMain` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx` | 7 | 7 | no | yes |
| 118 | `UsersListTable` | `src/features/auth/pages/admin/users/UsersListTable.tsx` | 7 | 7 | no | yes |
| 119 | `MailClientFocusedAccountBlock` | `src/features/filemaker/pages/AdminFilemakerMailClientPage.dashboard.tsx` | 7 | 7 | no | yes |
| 120 | `IntegrationModalFrame` | `src/features/integrations/components/connections/IntegrationModal.tsx` | 7 | 7 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepIdentityFields` | 38 | 1 | `model -> stepName` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82` |
| 2 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepIdentityFields` | 38 | 1 | `model -> setStepName` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82` |
| 3 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepIdentityFields` | 38 | 1 | `model -> stepType` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82` |
| 4 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepIdentityFields` | 38 | 1 | `model -> setStepType` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82` |
| 5 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> needsSelector` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 6 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectorCandidates` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 7 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectedSelectorKey` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 8 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setSelectedSelectorKey` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 9 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectedSelector` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 10 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectorBindingMode` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 11 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setSelectorBindingMode` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 12 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> registryNamespace` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 13 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setRegistryNamespace` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 14 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> registryProfiles` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 15 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> effectiveRegistryProfile` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 16 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setRegistryProfile` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 17 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> entriesForProfile` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 18 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> registryEntryKey` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 19 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setRegistryEntryKey` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 20 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> saveToRegistry` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 21 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> setSaveToRegistry` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 22 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectedRegistryEntry` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 23 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> selectedRegistryEntryCompatible` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 24 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterSelectorBindingFields` | 38 | 1 | `model -> stepType` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89` |
| 25 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> stepType` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 26 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> needsValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 27 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> value` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 28 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 29 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> url` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 30 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setUrl` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 31 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> keyValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 32 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setKeyValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 33 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> timeoutValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 34 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setTimeoutValue` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 35 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> script` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 36 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setScript` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 37 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> description` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 38 | 422 | `LiveScripterAssignDrawerFields` | `LiveScripterStepDetailFields` | 38 | 1 | `model -> setDescription` | `src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:112` |
| 39 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> url` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 40 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onUrlChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 41 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> currentUrl` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 42 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> status` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 43 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> mode` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 44 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onModeChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 45 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onStartOrNavigate` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 46 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onBack` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 47 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onForward` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 48 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onReload` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 49 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onDispose` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 50 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> typingValue` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 51 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onTypingValueChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 52 | 272 | `LiveScripterPanelControls` | `LiveScripterUrlBar` | 23 | 1 | `model -> onDriveType` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89` |
| 53 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> websites` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 54 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> flows` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 55 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> personas` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 56 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> websiteId` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 57 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> flowId` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 58 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> personaId` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 59 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> onWebsiteChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 60 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> onFlowChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 61 | 272 | `LiveScripterPanelControls` | `LiveScripterScopeControls` | 23 | 1 | `model -> onPersonaChange` | `src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105` |
| 62 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 63 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> name` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 64 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> value` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 65 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onChange` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 66 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onFocus` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 67 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onClick` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 68 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onKeyUp` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 69 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onKeyDown` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 70 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> onBlur` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 71 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> placeholder` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 72 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> aria-controls` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 73 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> aria-activedescendant` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 74 | 238 | `StructuredProductNameInput` | `Input` | 19 | 2 | `controller -> className` | `src/features/products/components/form/StructuredProductNameField.tsx:65` |
| 75 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> listboxId` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |
| 76 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> listboxLabel` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |
| 77 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> suggestions` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |
| 78 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> highlightedIndex` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |
| 79 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> onApply` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |
| 80 | 232 | `StructuredProductNameInput` | `ProductTitleSuggestionPanel` | 19 | 1 | `controller -> onHighlight` | `src/features/products/components/form/StructuredProductNameField.tsx:87` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> onPersonaChange -> onValueChange -> onValueChange` |
| 2 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> onFlowChange -> onValueChange -> onValueChange` |
| 3 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> onWebsiteChange -> onValueChange -> onValueChange` |
| 4 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> personaId -> value -> value` |
| 5 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> flowId -> value -> value` |
| 6 | 372 | 4 | `LiveScripterPanelControls` | `Select` | 23 | 2 | `model -> websiteId -> value -> value` |
| 7 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onDriveType -> onDriveType -> onClick` |
| 8 | 372 | 4 | `LiveScripterPanelControls` | `Input` | 23 | 2 | `model -> onTypingValueChange -> onTypingValueChange -> onChange` |
| 9 | 372 | 4 | `LiveScripterPanelControls` | `Input` | 23 | 2 | `model -> typingValue -> typingValue -> value` |
| 10 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> typingValue -> typingValue -> disabled` |
| 11 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onDispose -> onDispose -> onClick` |
| 12 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onReload -> onReload -> onClick` |
| 13 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onForward -> onForward -> onClick` |
| 14 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onBack -> onBack -> onClick` |
| 15 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onStartOrNavigate -> onStartOrNavigate -> onClick` |
| 16 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> onModeChange -> onModeChange -> onClick` |
| 17 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> mode -> mode -> variant` |
| 18 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> status -> status -> disabled` |
| 19 | 372 | 4 | `LiveScripterPanelControls` | `Input` | 23 | 2 | `model -> onUrlChange -> onUrlChange -> onChange` |
| 20 | 372 | 4 | `LiveScripterPanelControls` | `Input` | 23 | 2 | `model -> url -> url -> value` |
| 21 | 372 | 4 | `LiveScripterPanelControls` | `Button` | 23 | 2 | `model -> url -> url -> disabled` |
| 22 | 364 | 6 | `WorkspaceLayout` | `ThreadRow` | 15 | 1 | `viewModel -> onSelectThread -> onSelectThread -> onSelectThread -> onSelectThread -> onSelectThread` |
| 23 | 364 | 6 | `WorkspaceLayout` | `ThreadRow` | 15 | 1 | `viewModel -> selection -> selectedThreadId -> selectedThreadId -> selectedThreadId -> isSelected` |
| 24 | 331 | 5 | `WorkspaceLayout` | `Button` | 15 | 2 | `viewModel -> onRefreshThreads -> onRefresh -> onRefresh -> onClick` |
| 25 | 325 | 5 | `WorkspaceLayout` | `ThreadRows` | 15 | 1 | `viewModel -> onSelectThread -> onSelectThread -> onSelectThread -> onSelectThread` |
| 26 | 325 | 5 | `WorkspaceLayout` | `ThreadRows` | 15 | 1 | `viewModel -> threadsState -> threads -> threads -> threads` |
| 27 | 325 | 5 | `WorkspaceLayout` | `ThreadRows` | 15 | 1 | `viewModel -> selection -> selectedThreadId -> selectedThreadId -> selectedThreadId` |
| 28 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> onPersonaChange -> onValueChange` |
| 29 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> onFlowChange -> onValueChange` |
| 30 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> onWebsiteChange -> onValueChange` |
| 31 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> personaId -> value` |
| 32 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> flowId -> value` |
| 33 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> websiteId -> value` |
| 34 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> personas -> options` |
| 35 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> flows -> options` |
| 36 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterScopeSelect` | 23 | 1 | `model -> websites -> options` |
| 37 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterTypingRow` | 23 | 1 | `model -> onDriveType -> onDriveType` |
| 38 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterTypingRow` | 23 | 1 | `model -> onTypingValueChange -> onTypingValueChange` |
| 39 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterTypingRow` | 23 | 1 | `model -> typingValue -> typingValue` |
| 40 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onDispose -> onDispose` |
| 41 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onReload -> onReload` |
| 42 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onForward -> onForward` |
| 43 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onBack -> onBack` |
| 44 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onStartOrNavigate -> onStartOrNavigate` |
| 45 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterModeRow` | 23 | 1 | `model -> onModeChange -> onModeChange` |
| 46 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterModeRow` | 23 | 1 | `model -> mode -> mode` |
| 47 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> status -> status` |
| 48 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterModeRow` | 23 | 1 | `model -> status -> status` |
| 49 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterModeRow` | 23 | 1 | `model -> currentUrl -> currentUrl` |
| 50 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> onUrlChange -> onUrlChange` |
| 51 | 303 | 3 | `LiveScripterPanelControls` | `LiveScripterNavigationRow` | 23 | 1 | `model -> url -> url` |
| 52 | 292 | 4 | `WorkspaceLayout` | `Button` | 15 | 2 | `viewModel -> onOpenPrimaryFolder -> onOpenPrimaryFolder -> onClick` |
| 53 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> onSendReply -> onSendReply -> onSendReply` |
| 54 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> onSelectThread -> onSelectThread -> onSelectThread` |
| 55 | 286 | 4 | `WorkspaceLayout` | `ThreadListHeader` | 15 | 1 | `viewModel -> onRefreshThreads -> onRefresh -> onRefresh` |
| 56 | 286 | 4 | `WorkspaceLayout` | `ThreadListHeader` | 15 | 1 | `viewModel -> threadsState -> threads -> threadCount` |
| 57 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> threadsState -> threads -> threads` |
| 58 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> threadsState -> isLoading -> isLoading` |
| 59 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> threadsState -> error -> error` |
| 60 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> selection -> selectedThreadId -> selectedThreadId` |
| 61 | 286 | 4 | `WorkspaceLayout` | `ThreadListHeader` | 15 | 1 | `viewModel -> selection -> mailboxPath -> mailboxPath` |
| 62 | 286 | 4 | `WorkspaceLayout` | `ThreadListHeader` | 15 | 1 | `viewModel -> selectedAccount -> account -> account` |
| 63 | 286 | 4 | `WorkspaceLayout` | `ThreadListContent` | 15 | 1 | `viewModel -> selectedAccount -> account -> account` |
| 64 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> isSending -> isSending -> isSending` |
| 65 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> onReplyToChange -> onReplyToChange` |
| 66 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> onReplySubjectChange -> onReplySubjectChange` |
| 67 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> onReplyHtmlChange -> onReplyHtmlChange` |
| 68 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> onReplyCcChange -> onReplyCcChange` |
| 69 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> onReplyBccChange -> onReplyBccChange` |
| 70 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> replyTo -> replyTo` |
| 71 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> replySubject -> replySubject` |
| 72 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> replyHtml -> replyHtml` |
| 73 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> replyCc -> replyCc` |
| 74 | 286 | 4 | `WorkspaceLayout` | `ReplyPanel` | 15 | 1 | `viewModel -> detailState -> replyBcc -> replyBcc` |
| 75 | 286 | 4 | `WorkspaceLayout` | `ReaderBody` | 15 | 1 | `viewModel -> detailState -> isLoading -> isLoading` |
| 76 | 286 | 4 | `WorkspaceLayout` | `ReaderBody` | 15 | 1 | `viewModel -> detailState -> error -> error` |
| 77 | 286 | 4 | `WorkspaceLayout` | `ReaderHeader` | 15 | 1 | `viewModel -> detailState -> detail -> detail` |
| 78 | 286 | 4 | `WorkspaceLayout` | `ReaderBody` | 15 | 1 | `viewModel -> detailState -> detail -> detail` |
| 79 | 269 | 7 | `ProductListMobileCard` | `AppModal` | 1 | 2 | `product -> product -> product -> product -> productName -> productName -> description` |
| 80 | 269 | 7 | `ProductListMobileCard` | `AppModal` | 1 | 2 | `product -> product -> product -> product -> productName -> productName -> header` |

## Top Chain Details (Depth >= 3)

### 1. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onPersonaChange -> onValueChange -> onValueChange
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `onPersonaChange` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `onPersonaChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:98
  - `LiveScripterScopeSelect` -> `Select`: `onValueChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 2. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onFlowChange -> onValueChange -> onValueChange
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `onFlowChange` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `onFlowChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:88
  - `LiveScripterScopeSelect` -> `Select`: `onValueChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 3. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onWebsiteChange -> onValueChange -> onValueChange
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `onWebsiteChange` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `onWebsiteChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:78
  - `LiveScripterScopeSelect` -> `Select`: `onValueChange` -> `onValueChange` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 4. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> personaId -> value -> value
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `personaId` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `personaId` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:98
  - `LiveScripterScopeSelect` -> `Select`: `value` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 5. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> flowId -> value -> value
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `flowId` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `flowId` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:88
  - `LiveScripterScopeSelect` -> `Select`: `value` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 6. LiveScripterPanelControls -> Select

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> websiteId -> value -> value
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterScopeControls` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `LiveScripterScopeSelect` (src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterScopeControls`: `model` -> `websiteId` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:105
  - `LiveScripterScopeControls` -> `LiveScripterScopeSelect`: `websiteId` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:78
  - `LiveScripterScopeSelect` -> `Select`: `value` -> `value` at src/features/playwright/components/live-scripter/LiveScripterScopeControls.tsx:48

### 7. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onDriveType -> onDriveType -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterTypingRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onDriveType` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterTypingRow`: `onDriveType` -> `onDriveType` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:212
  - `LiveScripterTypingRow` -> `Button`: `onDriveType` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:162

### 8. LiveScripterPanelControls -> Input

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onTypingValueChange -> onTypingValueChange -> onChange
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterTypingRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onTypingValueChange` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterTypingRow`: `onTypingValueChange` -> `onTypingValueChange` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:212
  - `LiveScripterTypingRow` -> `Input`: `onTypingValueChange` -> `onChange` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:156

### 9. LiveScripterPanelControls -> Input

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> typingValue -> typingValue -> value
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterTypingRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `typingValue` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterTypingRow`: `typingValue` -> `typingValue` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:212
  - `LiveScripterTypingRow` -> `Input`: `typingValue` -> `value` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:156

### 10. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> typingValue -> typingValue -> disabled
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterTypingRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `typingValue` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterTypingRow`: `typingValue` -> `typingValue` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:212
  - `LiveScripterTypingRow` -> `Button`: `typingValue` -> `disabled` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:162

### 11. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onDispose -> onDispose -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterNavigationRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onDispose` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterNavigationRow`: `onDispose` -> `onDispose` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:195
  - `LiveScripterNavigationRow` -> `Button`: `onDispose` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:95

### 12. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onReload -> onReload -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterNavigationRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onReload` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterNavigationRow`: `onReload` -> `onReload` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:195
  - `LiveScripterNavigationRow` -> `Button`: `onReload` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:79

### 13. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onForward -> onForward -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterNavigationRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onForward` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterNavigationRow`: `onForward` -> `onForward` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:195
  - `LiveScripterNavigationRow` -> `Button`: `onForward` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:76

### 14. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onBack -> onBack -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterNavigationRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onBack` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterNavigationRow`: `onBack` -> `onBack` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:195
  - `LiveScripterNavigationRow` -> `Button`: `onBack` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:73

### 15. LiveScripterPanelControls -> Button

- Score: 372
- Depth: 4
- Root fanout: 23
- Prop path: model -> onStartOrNavigate -> onStartOrNavigate -> onClick
- Component path:
  - `LiveScripterPanelControls` (src/features/playwright/components/live-scripter/LiveScripterPanel.tsx)
  - `LiveScripterUrlBar` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `LiveScripterNavigationRow` (src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `LiveScripterPanelControls` -> `LiveScripterUrlBar`: `model` -> `onStartOrNavigate` at src/features/playwright/components/live-scripter/LiveScripterPanel.tsx:89
  - `LiveScripterUrlBar` -> `LiveScripterNavigationRow`: `onStartOrNavigate` -> `onStartOrNavigate` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:195
  - `LiveScripterNavigationRow` -> `Button`: `onStartOrNavigate` -> `onClick` at src/features/playwright/components/live-scripter/LiveScripterUrlBar.tsx:88

## Top Transition Details (Depth = 2)

### 1. LiveScripterAssignDrawerFields -> LiveScripterStepIdentityFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> stepName
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82

### 2. LiveScripterAssignDrawerFields -> LiveScripterStepIdentityFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> setStepName
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82

### 3. LiveScripterAssignDrawerFields -> LiveScripterStepIdentityFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> stepType
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82

### 4. LiveScripterAssignDrawerFields -> LiveScripterStepIdentityFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> setStepType
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:82

### 5. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> needsSelector
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 6. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> selectorCandidates
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 7. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> selectedSelectorKey
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 8. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> setSelectedSelectorKey
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 9. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> selectedSelector
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 10. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> selectorBindingMode
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 11. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> setSelectorBindingMode
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 12. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> registryNamespace
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 13. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> setRegistryNamespace
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 14. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> registryProfiles
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

### 15. LiveScripterAssignDrawerFields -> LiveScripterSelectorBindingFields

- Score: 422
- Root fanout: 38
- Prop mapping: model -> effectiveRegistryProfile
- Location: src/features/playwright/components/live-scripter/LiveScripterAssignDrawerForm.tsx:89

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
