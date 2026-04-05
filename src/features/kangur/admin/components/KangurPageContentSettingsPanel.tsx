'use client';

import {
  Alert,
  Badge,
  Button,
  FormField,
  FormSection,
  Textarea,
} from '@/features/kangur/shared/ui';
import { KANGUR_GRID_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentMutations } from '../hooks/useKangurPageContentMutations';
import {
  KANGUR_ADMIN_INSET_CARD_CLASS_NAME,
  KangurAdminCard,
  KangurAdminInsetCard,
} from './KangurAdminCard';
import { KangurPageContentEntryEditor } from './KangurPageContentEntryEditor';
import { KangurPageContentEntryList } from './KangurPageContentEntryList';
import { KangurPageContentManifestCoverage } from './KangurPageContentManifestCoverage';

const AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE = 'pl';
const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';

export function KangurPageContentSettingsPanel(): React.JSX.Element {
  const {
    editorValue,
    setEditorValue,
    isLoading,
    isSaving,
    selectedEntryId,
    setSelectedEntryId,
    selectedFragmentId,
    setSelectedFragmentId,
    isDirty,
    parsedState,
    selectedEntry,
    loadStore,
    handleSave,
    handleAddEntry,
    handleDuplicateSelectedEntry,
    handleDeleteSelectedEntry,
    handleMoveSelectedEntry,
    handleResetToDefaults,
    updateSelectedEntry,
    updateSelectedFragment,
    handleAddFragment,
    handleDuplicateSelectedFragment,
    handleDeleteSelectedFragment,
    handleMoveSelectedFragment,
  } = useKangurPageContentMutations();

  return (
    <FormSection
      title='AI Tutor Page Content'
      description='Edit the canonical Mongo section records that connect page anchors, content ids, and linked native-guide explanations.'
      className={SETTINGS_SECTION_CLASS_NAME}
    >
      <KangurAdminCard>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Canonical section layer</div>
              <Badge variant='secondary'>Locale {AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE}</Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Each record is a canonical Kangur page or section node. The tutor uses these ids for
              section targeting, while the knowledge graph links them to native guides.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void loadStore();
              }}
              disabled={isLoading || isSaving}
            >
              {isLoading ? 'Loading...' : 'Reload page content'}
            </Button>
            <Button variant='outline' size='sm' onClick={handleAddEntry} disabled={isSaving}>
              Add section
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetToDefaults}
              disabled={isSaving}
            >
              Reset to defaults
            </Button>
            <Button
              size='sm'
              onClick={() => {
                void handleSave();
              }}
              disabled={
                isLoading ||
                isSaving ||
                !isDirty ||
                Boolean(parsedState.error) ||
                !parsedState.store
              }
            >
              {isSaving ? 'Saving page content...' : 'Save page content'}
            </Button>
          </div>
        </div>

        {parsedState.error ? (
          <Alert variant='error' title='Invalid page-content JSON' className='mt-4'>
            {parsedState.error}
          </Alert>
        ) : null}

        {parsedState.store ? (
          <KangurPageContentManifestCoverage store={parsedState.store} />
        ) : isLoading ? (
          <Alert variant='info' title='Loading page content from Mongo' className='mt-4'>
            Waiting for the canonical Kangur page-content store.
          </Alert>
        ) : null}

        {!parsedState.store && !parsedState.error && !isLoading ? (
          <Alert variant='info' title='No page content loaded' className='mt-4'>
            Reload the Mongo-backed page-content store or reset to defaults to begin editing.
          </Alert>
        ) : null}

        {parsedState.store ? (
          <div
            className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 xl:grid-cols-[320px_minmax(0,1fr)]`}
          >
            <KangurPageContentEntryList
              entries={parsedState.store.entries}
              selectedEntryId={selectedEntryId}
              onSelect={setSelectedEntryId}
              className={KANGUR_ADMIN_INSET_CARD_CLASS_NAME}
            />

            {selectedEntry ? (
              <KangurPageContentEntryEditor
                entry={selectedEntry}
                onUpdateEntry={updateSelectedEntry}
                onDuplicateEntry={handleDuplicateSelectedEntry}
                onDeleteEntry={handleDeleteSelectedEntry}
                onMoveEntry={handleMoveSelectedEntry}
                isSaving={isSaving}
                canDelete={parsedState.store.entries.length > 1}
                selectedFragmentId={selectedFragmentId}
                onSelectFragment={setSelectedFragmentId}
                onUpdateFragment={updateSelectedFragment}
                onAddFragment={handleAddFragment}
                onDuplicateFragment={handleDuplicateSelectedFragment}
                onDeleteFragment={handleDeleteSelectedFragment}
                onMoveFragment={handleMoveSelectedFragment}
                className={KANGUR_ADMIN_INSET_CARD_CLASS_NAME}
                insetCardClassName={KANGUR_ADMIN_INSET_CARD_CLASS_NAME}
              />
            ) : (
              <KangurAdminInsetCard>
                <div className='rounded-2xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground text-center'>
                  Select a page-content entry from the list to start editing.
                </div>
              </KangurAdminInsetCard>
            )}
          </div>
        ) : null}

        <KangurAdminInsetCard className='mt-4'>
          <FormField
            label='Page content JSON'
            description='Raw mirror of the full canonical section document. Use this for bulk edits or direct structural changes.'
          >
            <Textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              rows={20}
              aria-label='Page content JSON'
              spellCheck={false}
              className='font-mono text-xs'
              title='Page content JSON'
            />
          </FormField>
          <div className='mt-2 text-xs text-muted-foreground text-center'>
            {isDirty ? 'Unsaved page-content changes' : 'Page content in sync'}
          </div>
        </KangurAdminInsetCard>
      </KangurAdminCard>
    </FormSection>
  );
}
