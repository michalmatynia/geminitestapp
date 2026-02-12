# Modal Templates

Reusable modal component templates for common UI patterns.

## Templates

### SettingsFormModal
Generic modal for CRUD settings forms (create, read, update).

**Use cases:** Country settings, Currency settings, Catalog settings, Language settings, Price group settings

**Props:**
- `open`: boolean - Modal visibility state
- `onClose`: () => void - Callback when modal closes
- `onSave`: () => Promise<void> - Save handler
- `title`: string - Modal title
- `children`: ReactNode - Form content
- `isSaving?`: boolean - Loading indicator for save button
- `isLoading?`: boolean - Loading state for entire form
- `formRef?`: React.RefObject - Reference to form element
- `size?`: 'sm' | 'md' | 'lg' | 'xl' - Modal size (default: 'md')

**Example:**
```tsx
<SettingsFormModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onSave={async () => {
    await saveMutation.mutateAsync(formData);
  }}
  title="Edit Country"
>
  <Input
    label="Country Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</SettingsFormModal>
```

### ConfirmDialogBatch
Component for rendering multiple related confirm dialogs.

**Use cases:** Batch delete confirmations, Multiple action confirmations

**Props:**
- `dialogs`: ConfirmDialogConfig[] - Array of dialog configurations

**Example:**
```tsx
<ConfirmDialogBatch
  dialogs={[
    {
      id: 'delete-selected',
      open: showDeleteConfirm,
      onOpenChange: setShowDeleteConfirm,
      title: 'Delete Selected Items?',
      onConfirm: handleDeleteAll,
      isDestructive: true,
    },
  ]}
/>
```

### ContentDisplayModal
Generic modal for displaying read-only content.

**Use cases:** Log viewers, Preview modals, Test result display, File preview

**Props:**
- `open`: boolean - Modal visibility state
- `onOpenChange?`: (open: boolean) => void - Visibility change callback
- `onClose?`: () => void - Close callback
- `title`: string - Modal title
- `children`: ReactNode - Content to display
- `size?`: 'sm' | 'md' | 'lg' | 'xl' - Modal size (default: 'md')
- `showClose?`: boolean - Show close button (default: true)
- `className?`: string - Additional CSS classes

**Example:**
```tsx
<ContentDisplayModal
  open={showLog}
  onClose={() => setShowLog(false)}
  title="View Operation Log"
  size="lg"
>
  <LogContent entries={logEntries} />
</ContentDisplayModal>
```

## Pattern Guidelines

### When to Use Templates
1. **SettingsFormModal**: Any CRUD modal that saves data
2. **ConfirmDialogBatch**: Multiple related confirmations
3. **ContentDisplayModal**: Read-only content display

### Creating New Features
Always check if a modal template fits your use case before creating a new one. 
This keeps the codebase consistent and maintainable.

### Extending Templates
If you need a template variant:
1. Create a new template file in this directory
2. Export it from index.ts
3. Document it here with examples
4. Add to consolidation backlog if it could replace existing modals

## Related Components
- `FormModal`: Base form modal (used by SettingsFormModal)
- `AppModal`: Generic modal container (used by ContentDisplayModal)
- `ConfirmDialog`: Base confirm dialog (used by ConfirmDialogBatch)
- `Dialog`: Radix UI dialog primitives
