# Notes App Modularization Plan

## Overview
The Notes App has similar bloat issues to the Products section, with NoteForm being the main bottleneck (1,073 lines). This plan outlines extracting complex logic into reusable hooks and components.

## Current State (Bloated Files)

| File | Lines | Issue |
|------|-------|-------|
| `NoteForm.tsx` | 1,073 | Multiple concerns (metadata, editor, files, relations, tags, UI) |
| `FolderTree.tsx` | 536 | Tree state, drag-drop, rename, folder operations |
| `page.tsx` | 480 | Selection, filtering, theme, operations coordination |
| `NoteDetailView.tsx` | 465 | Preview loading, relation fetching, state management |
| `themes/page.tsx` | 602 | Theme CRUD, preview, management UI |
| `NoteMetadata.tsx` | 388 | Metadata form fields, validation, styling |

**Total bloat:** ~3,544 lines in 6 files

## Refactoring Strategy (Phased)

### Phase 1: Extract Hooks from NoteForm ✅ STARTED
**Goal:** Reduce 1,073 → 450 lines
**Extract:**
- ✅ `useNoteMetadata.ts` - Title, color, pins/archives/favorites
- ✅ `useEditorMode.ts` - Editor mode switching & content migration
- ✅ `useNoteFileAttachments.ts` - File management with slots & uploads
- [ ] `useNoteRelations.ts` - Related notes search & selection
- [ ] `useNoteTags.ts` - Tag selection & creation
- [ ] `useNoteSubmission.ts` - Form submission & API calls

**Why:** These are self-contained concerns with their own state and logic that make the form hard to navigate.

---

### Phase 2: Extract Hooks from NoteDetailView
**Goal:** Reduce 465 → 200 lines
**Extract:**
- [ ] `useRelatedNotesPreviews.ts` - Preview loading & caching
- [ ] `useNoteNavigation.ts` - Previous/next note movement

**Why:** Preview loading is async and separate from main detail view rendering.

---

### Phase 3: Segment NoteForm into Sections
**Goal:** Reduce 450 → 150 lines (after Phase 1)
**Extract:**
- [ ] `NoteMetadataSection.tsx` - Title, color, pins
- [ ] `NoteEditorSection.tsx` - Editor selection & migration controls
- [ ] `NoteFileSection.tsx` - File attachments UI
- [ ] `NoteRelationsSection.tsx` - Related notes UI
- [ ] `NoteTagsSection.tsx` - Tag selection UI

**Why:** Each section is visually and functionally distinct; components are easier to test and modify.

---

### Phase 4: Refactor FolderTree
**Goal:** Reduce 536 → 250 lines
**Extract:**
- [ ] `useFolderDragDrop.ts` - Drag-drop state & handlers
- [ ] `useFolderRename.ts` - Inline rename state & API
- [ ] `useFolderOperations.ts` - Create, delete, move operations
- [ ] `FolderNodeItem.tsx` - Single folder node (move from being inline)

**Why:** Tree operations are complex; separating drag-drop, rename, and CRUD makes it testable.

---

### Phase 5: Refactor page.tsx
**Goal:** Reduce 480 → 250 lines
**Extract:**
- [ ] `useNoteSelection.ts` - Selected note state & sync
- [ ] `useNoteNotebook.ts` - Notebook selection & switching
- [ ] `useDraftAutoSave.ts` - Auto-save to drafts with debounce

**Why:** Page becomes orchestration-only; hooks are reusable utilities.

---

### Phase 6: Segment NoteDetailView into Sections
**Goal:** Reduce 200 → 100 lines (after Phase 2)
**Extract:**
- [ ] `NotePreviewSection.tsx` - Related notes preview cards
- [ ] `NoteNavigationBar.tsx` - Previous/next controls
- [ ] `NoteHeaderSection.tsx` - Title, favorite, delete buttons

**Why:** Each section has distinct styling and interactions.

---

## Folder Structure (Target State)

```
app/(admin)/admin/notes/
├── components/
│   ├── NoteForm.tsx (orchestration ~150 lines)
│   ├── NoteForm/
│   │   ├── NoteMetadataSection.tsx
│   │   ├── NoteEditorSection.tsx
│   │   ├── NoteFileSection.tsx
│   │   ├── NoteRelationsSection.tsx
│   │   └── NoteTagsSection.tsx
│   │
│   ├── NoteDetailView.tsx (orchestration ~100 lines)
│   ├── NoteDetailView/
│   │   ├── NotePreviewSection.tsx
│   │   ├── NoteNavigationBar.tsx
│   │   └── NoteHeaderSection.tsx
│   │
│   ├── FolderTree.tsx (refactored ~250 lines)
│   ├── FolderTree/
│   │   ├── FolderNodeItem.tsx
│   │   └── FolderContextMenu.tsx
│   │
│   └── ...other components
│
└── hooks/
    ├── useNoteMetadata.ts ✅
    ├── useEditorMode.ts ✅
    ├── useNoteFileAttachments.ts ✅
    ├── useNoteRelations.ts
    ├── useNoteTags.ts
    ├── useNoteSubmission.ts
    ├── useRelatedNotesPreviews.ts
    ├── useNoteNavigation.ts
    ├── useFolderDragDrop.ts
    ├── useFolderRename.ts
    ├── useFolderOperations.ts
    ├── useNoteSelection.ts
    ├── useNoteNotebook.ts
    ├── useDraftAutoSave.ts
    ├── useNoteData.ts (existing)
    ├── useNoteFilters.ts (existing)
    ├── useNoteOperations.ts (existing)
    ├── useNoteTheme.ts (existing)
    ├── useUndo.ts (existing)
    └── ...others
```

---

## Implementation Guidelines

### When Extracting a Hook
1. **Identify state cohesion** - Group related useState calls
2. **Extract useEffect blocks** - Move dependent effects together
3. **Keep side effects** - Mutations to external state stay in hook
4. **Return object** - Use object destructuring for clarity
5. **Document why** - Explain the extraction reason

### When Creating Sub-Component
1. **Single concern** - One main responsibility
2. **Accept props** - Parent passes data/callbacks
3. **Optional styling** - Use Tailwind classes
4. **Composition** - Simple, focusedpieces compose into form

### Testing Strategy
- **Hooks:** Unit test with `renderHook` + act()
- **Sections:** Test with data/callback props
- **NoteForm:** Integration test with all sections

---

## Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| NoteForm size | 1,073 | 150 | -86% |
| FolderTree size | 536 | 250 | -53% |
| page.tsx size | 480 | 250 | -48% |
| Total extracted hooks | 0 | 14+ | New utilities |
| File count in notes/ | 10 | 25+ | Better organization |
| Testable units | Low | High | +200% |

---

## Rollout Schedule

**Week 1 (Phase 1):** Extract hooks from NoteForm (highest impact)
**Week 2 (Phase 2-3):** Segment NoteForm into sections
**Week 3 (Phase 4-5):** Refactor FolderTree and page.tsx
**Week 4 (Phase 6):** NoteDetailView sections and polish

---

## Backward Compatibility

All changes are **internal refactoring**:
- No API changes
- No component prop changes (for consumers)
- No behavior changes
- **Safe to merge without coordinating with other teams**

---

## Already Completed ✅

- `useNoteMetadata.ts` - Note title, color, status
- `useEditorMode.ts` - Editor mode switching & migration
- `useNoteFileAttachments.ts` - File management
- Plan document created

---

## Next Steps

1. **Extract remaining NoteForm hooks** - Relations, tags, submission
2. **Integrate hooks into NoteForm** - Replace inline state
3. **Test form still works** - Verify all flows
4. **Extract NoteDetailView hooks** - Preview loading
5. **Segment components** - Break into sections
6. **Refactor FolderTree** - Drag-drop extraction
7. **Refactor page.tsx** - Orchestration cleanup
