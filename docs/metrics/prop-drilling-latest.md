---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-16T05:11:20.202Z

## Snapshot

- Scanned source files: 4878
- JSX files scanned: 1817
- Components detected: 2953
- Components forwarding parent props (hotspot threshold): 7
- Components forwarding parent props (any): 10
- Resolved forwarded transitions: 72
- Candidate chains (depth >= 2): 72
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 7

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 7 |
| `feature:ai` | 3 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurPageContentEntryEditor` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx` | 16 | 24 | no | yes |
| 2 | `RunHistoryList` | `src/features/ai/ai-paths/components/RunHistoryList.tsx` | 13 | 15 | no | yes |
| 3 | `KangurQuestionsHeader` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx` | 9 | 9 | no | yes |
| 4 | `RunHistoryFilterControls` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx` | 6 | 6 | no | yes |
| 5 | `KangurQuestionListItem` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx` | 6 | 6 | no | yes |
| 6 | `RunComparisonTool` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx` | 5 | 5 | no | yes |
| 7 | `KangurQuestionsFilterTriage` | `src/features/kangur/admin/components/KangurQuestionsFilterTriage.tsx` | 4 | 4 | no | yes |
| 8 | `KangurPageContentEntryList` | `src/features/kangur/admin/components/KangurPageContentEntryList.tsx` | 1 | 1 | no | no |
| 9 | `KangurLessonQuizBlockView` | `src/features/kangur/ui/components/KangurLessonDocumentRenderer.tsx` | 1 | 1 | no | no |
| 10 | `NumberBalanceRushGame` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 98 | `KangurPageContentEntryEditor` | `Input` | 5 | 2 | `entry -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:213` |
| 2 | 98 | `KangurPageContentEntryEditor` | `SelectSimple` | 5 | 2 | `entry -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:241` |
| 3 | 98 | `KangurPageContentEntryEditor` | `Textarea` | 5 | 2 | `entry -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:387` |
| 4 | 98 | `KangurPageContentEntryEditor` | `Switch` | 5 | 2 | `entry -> checked` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:517` |
| 5 | 92 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 5 | 1 | `entry -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 6 | 88 | `KangurPageContentEntryEditor` | `Input` | 4 | 2 | `onUpdateEntry -> onChange` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:213` |
| 7 | 88 | `KangurPageContentEntryEditor` | `SelectSimple` | 4 | 2 | `onUpdateEntry -> onValueChange` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:241` |
| 8 | 88 | `KangurPageContentEntryEditor` | `Textarea` | 4 | 2 | `onUpdateEntry -> onChange` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:387` |
| 9 | 88 | `KangurPageContentEntryEditor` | `Switch` | 4 | 2 | `onUpdateEntry -> onCheckedChange` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:517` |
| 10 | 68 | `RunHistoryList` | `Button` | 2 | 2 | `onSetRunHistorySelection -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:164` |
| 11 | 68 | `RunHistoryList` | `Button` | 2 | 2 | `onResumeRun -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:185` |
| 12 | 68 | `RunHistoryList` | `SelectSimple` | 2 | 2 | `onSetRunHistorySelection -> onValueChange` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:256` |
| 13 | 68 | `KangurPageContentEntryEditor` | `Button` | 2 | 2 | `isSaving -> disabled` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:173` |
| 14 | 62 | `RunHistoryList` | `RunHistoryEntries` | 2 | 1 | `onResumeRun -> onReplayFromEntry` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:285` |
| 15 | 62 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 2 | 1 | `isSaving -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 16 | 58 | `RunComparisonTool` | `Button` | 1 | 2 | `compareResumeChangesOnly -> className` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:276` |
| 17 | 58 | `RunComparisonTool` | `Button` | 1 | 2 | `traceComparison -> disabled` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:276` |
| 18 | 58 | `RunComparisonTool` | `Button` | 1 | 2 | `onToggleResumeChangesOnly -> onClick` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:276` |
| 19 | 58 | `RunComparisonTool` | `Button` | 1 | 2 | `onSetCompareInspectorRowKey -> onClick` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:420` |
| 20 | 58 | `RunComparisonTool` | `Button` | 1 | 2 | `compareInspectorRowKey -> onClick` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:420` |
| 21 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `onRefresh -> onClick` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:29` |
| 22 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `isRefreshing -> disabled` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:29` |
| 23 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `compareMode -> className` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:39` |
| 24 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `onToggleCompareMode -> onClick` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:39` |
| 25 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `runFilter -> className` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:60` |
| 26 | 58 | `RunHistoryFilterControls` | `Button` | 1 | 2 | `onSetRunFilter -> onClick` | `src/features/ai/ai-paths/components/RunHistoryFilterControls.tsx:60` |
| 27 | 58 | `RunHistoryList` | `CompactEmptyState` | 1 | 2 | `emptyFilterLabel -> description` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:59` |
| 28 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onSetPrimaryRunId -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:126` |
| 29 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onSetSecondaryRunId -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:140` |
| 30 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onOpenRunDetail -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:157` |
| 31 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onExpandedRunHistory -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:164` |
| 32 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `runHistorySelection -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:164` |
| 33 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onHandoffRun -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:202` |
| 34 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `handoffStateByRunId -> disabled` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:202` |
| 35 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onCancelRun -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:222` |
| 36 | 58 | `RunHistoryList` | `Button` | 1 | 2 | `onRequeueDeadLetter -> onClick` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:231` |
| 37 | 58 | `KangurPageContentEntryEditor` | `Button` | 1 | 2 | `onMoveEntry -> onClick` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:173` |
| 38 | 58 | `KangurPageContentEntryEditor` | `Button` | 1 | 2 | `onDuplicateEntry -> onClick` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:189` |
| 39 | 58 | `KangurPageContentEntryEditor` | `Button` | 1 | 2 | `onDeleteEntry -> onClick` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:197` |
| 40 | 58 | `KangurPageContentEntryEditor` | `Button` | 1 | 2 | `canDelete -> disabled` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:197` |
| 41 | 58 | `KangurQuestionListItem` | `Button` | 1 | 2 | `onMoveUp -> onClick` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:48` |
| 42 | 58 | `KangurQuestionListItem` | `Button` | 1 | 2 | `canReorder -> disabled` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:48` |
| 43 | 58 | `KangurQuestionListItem` | `Button` | 1 | 2 | `absoluteIndex -> disabled` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:48` |
| 44 | 58 | `KangurQuestionListItem` | `Button` | 1 | 2 | `isSaving -> disabled` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:48` |
| 45 | 58 | `KangurQuestionListItem` | `Button` | 1 | 2 | `onMoveDown -> onClick` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:60` |
| 46 | 58 | `KangurQuestionListItem` | `Badge` | 1 | 2 | `question -> className` | `src/features/kangur/admin/components/KangurQuestionListItem.tsx:136` |
| 47 | 58 | `KangurQuestionsFilterTriage` | `Input` | 1 | 2 | `searchQuery -> value` | `src/features/kangur/admin/components/KangurQuestionsFilterTriage.tsx:34` |
| 48 | 58 | `KangurQuestionsFilterTriage` | `Input` | 1 | 2 | `onSearchChange -> onChange` | `src/features/kangur/admin/components/KangurQuestionsFilterTriage.tsx:34` |
| 49 | 58 | `KangurQuestionsFilterTriage` | `Button` | 1 | 2 | `onSortChange -> onClick` | `src/features/kangur/admin/components/KangurQuestionsFilterTriage.tsx:52` |
| 50 | 58 | `KangurQuestionsFilterTriage` | `Button` | 1 | 2 | `onFilterChange -> onClick` | `src/features/kangur/admin/components/KangurQuestionsFilterTriage.tsx:78` |
| 51 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onPublishAndGoLive -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:174` |
| 52 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `isSaving -> disabled` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:174` |
| 53 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onPublishReady -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:184` |
| 54 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `canPublishReady -> disabled` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:184` |
| 55 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onGoLive -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:194` |
| 56 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `currentSuiteHealth -> disabled` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:194` |
| 57 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onTakeOffline -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:204` |
| 58 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onAddQuestion -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:214` |
| 59 | 58 | `KangurQuestionsHeader` | `Button` | 1 | 2 | `onBack -> onClick` | `src/features/kangur/admin/components/KangurQuestionsHeader.tsx:225` |
| 60 | 52 | `RunHistoryList` | `RunHistoryEntries` | 1 | 1 | `onRetryRunNode -> onReplayFromEntry` | `src/features/ai/ai-paths/components/RunHistoryList.tsx:285` |
| 61 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `selectedFragmentId -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 62 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onSelectFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 63 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onUpdateFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 64 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onAddFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 65 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onDuplicateFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 66 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onDeleteFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 67 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `onMoveFragment -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 68 | 52 | `KangurPageContentEntryEditor` | `KangurPageContentFragmentEditorProvider` | 1 | 1 | `insetCardClassName -> value` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492` |
| 69 | 52 | `KangurLessonQuizBlockView` | `KangurProse` | 1 | 1 | `block -> dangerouslySetInnerHTML` | `src/features/kangur/ui/components/KangurLessonDocumentRenderer.tsx:405` |
| 70 | 50 | `KangurPageContentEntryEditor` | `Card` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:156` |
| 71 | 50 | `KangurPageContentEntryList` | `Card` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurPageContentEntryList.tsx:21` |
| 72 | 44 | `NumberBalanceRushGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx:562` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. KangurPageContentEntryEditor -> Input

- Score: 98
- Root fanout: 5
- Prop mapping: entry -> value
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:213

### 2. KangurPageContentEntryEditor -> SelectSimple

- Score: 98
- Root fanout: 5
- Prop mapping: entry -> value
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:241

### 3. KangurPageContentEntryEditor -> Textarea

- Score: 98
- Root fanout: 5
- Prop mapping: entry -> value
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:387

### 4. KangurPageContentEntryEditor -> Switch

- Score: 98
- Root fanout: 5
- Prop mapping: entry -> checked
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:517

### 5. KangurPageContentEntryEditor -> KangurPageContentFragmentEditorProvider

- Score: 92
- Root fanout: 5
- Prop mapping: entry -> value
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492

### 6. KangurPageContentEntryEditor -> Input

- Score: 88
- Root fanout: 4
- Prop mapping: onUpdateEntry -> onChange
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:213

### 7. KangurPageContentEntryEditor -> SelectSimple

- Score: 88
- Root fanout: 4
- Prop mapping: onUpdateEntry -> onValueChange
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:241

### 8. KangurPageContentEntryEditor -> Textarea

- Score: 88
- Root fanout: 4
- Prop mapping: onUpdateEntry -> onChange
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:387

### 9. KangurPageContentEntryEditor -> Switch

- Score: 88
- Root fanout: 4
- Prop mapping: onUpdateEntry -> onCheckedChange
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:517

### 10. RunHistoryList -> Button

- Score: 68
- Root fanout: 2
- Prop mapping: onSetRunHistorySelection -> onClick
- Location: src/features/ai/ai-paths/components/RunHistoryList.tsx:164

### 11. RunHistoryList -> Button

- Score: 68
- Root fanout: 2
- Prop mapping: onResumeRun -> onClick
- Location: src/features/ai/ai-paths/components/RunHistoryList.tsx:185

### 12. RunHistoryList -> SelectSimple

- Score: 68
- Root fanout: 2
- Prop mapping: onSetRunHistorySelection -> onValueChange
- Location: src/features/ai/ai-paths/components/RunHistoryList.tsx:256

### 13. KangurPageContentEntryEditor -> Button

- Score: 68
- Root fanout: 2
- Prop mapping: isSaving -> disabled
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:173

### 14. RunHistoryList -> RunHistoryEntries

- Score: 62
- Root fanout: 2
- Prop mapping: onResumeRun -> onReplayFromEntry
- Location: src/features/ai/ai-paths/components/RunHistoryList.tsx:285

### 15. KangurPageContentEntryEditor -> KangurPageContentFragmentEditorProvider

- Score: 62
- Root fanout: 2
- Prop mapping: isSaving -> value
- Location: src/features/kangur/admin/components/KangurPageContentEntryEditor.tsx:492

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
