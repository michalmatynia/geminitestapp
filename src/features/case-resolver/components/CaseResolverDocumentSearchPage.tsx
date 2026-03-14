'use client';

import { ArrowDown, ArrowUp, FileImage, FileText, FolderOpen, Plus } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type {
  CaseResolverFile,
  CaseResolverTag,
  CaseResolverIdentifier,
  CaseResolverCategory,
} from '@/shared/contracts/case-resolver';
import {
  Button,
  EmptyState,
  Pagination,
  SearchInput,
  SelectSimple,
  Card,
  Badge,
  DocumentSearchPage,
} from '@/shared/ui';

import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';

type SortKey = 'updated' | 'created' | 'name';
type SortOrder = 'asc' | 'desc';
type FileTypeFilter = 'all' | 'document' | 'scanfile';

type FileSearchRow = {
  file: CaseResolverFile;
  normalizedName: string;
  normalizedFolder: string;
  normalizedTag: string;
  normalizedCaseIdentifier: string;
  normalizedCategory: string;
  normalizedContent: string;
};

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const toDateLabel = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const buildPathLabelMap = <
  T extends { id: string; name: string; parentId?: string | null | undefined },
>(
    items: T[]
  ): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item: T): [string, T] => [item.id, item]));
  const cache = new Map<string, string>();

  const resolveLabel = (id: string, visited: Set<string>): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const item = byId.get(id);
    if (!item) return '';
    if (visited.has(id)) {
      cache.set(id, item.name);
      return item.name;
    }
    if (!item.parentId || !byId.has(item.parentId)) {
      cache.set(id, item.name);
      return item.name;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const parentLabel = resolveLabel(item.parentId, nextVisited);
    const label = `${parentLabel} / ${item.name}`;
    cache.set(id, label);
    return label;
  };

  items.forEach((item: T): void => {
    resolveLabel(item.id, new Set<string>());
  });

  return cache;
};

export function CaseResolverDocumentSearchPage(): React.JSX.Element {
  const {
    workspace,
    caseResolverTags: tags,
    caseResolverIdentifiers: identifiers,
    caseResolverCategories: categories,
  } = useCaseResolverPageState();
  const { onCreateDocumentFromSearch, onOpenFileFromSearch, onEditFileFromSearch } =
    useCaseResolverPageActions();
  const files: CaseResolverFile[] = useMemo(
    (): CaseResolverFile[] =>
      workspace.files.filter((file: CaseResolverFile): boolean => file.fileType !== 'case'),
    [workspace.files]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<FileTypeFilter>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('__all__');
  const [selectedCaseIdentifierId, setSelectedCaseIdentifierId] = useState<string>('__all__');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('__all__');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const tagPathById = useMemo(
    () => buildPathLabelMap(tags.map((t) => ({ ...t, name: t.label || t.id }))),
    [tags]
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(identifiers.map((i) => ({ ...i, name: i.name || i.label || i.id }))),
    [identifiers]
  );
  const categoryPathById = useMemo(() => buildPathLabelMap(categories), [categories]);
  const tagOptions = useMemo(
    () => [
      { value: '__all__', label: 'All tags' },
      ...tags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tagPathById.get(tag.id) || tag.label || tag.id,
      })),
    ],
    [tagPathById, tags]
  );
  const caseIdentifierOptions = useMemo(
    () => [
      { value: '__all__', label: 'All case identifiers' },
      ...identifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label:
          caseIdentifierPathById.get(identifier.id) ||
          identifier.name ||
          identifier.label ||
          identifier.id,
      })),
    ],
    [caseIdentifierPathById, identifiers]
  );
  const categoryOptions = useMemo(
    () => [
      { value: '__all__', label: 'All categories' },
      ...categories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: categoryPathById.get(category.id) || category.name || category.id,
      })),
    ],
    [categories, categoryPathById]
  );

  const indexedRows = useMemo(
    (): FileSearchRow[] =>
      files.map(
        (file: CaseResolverFile): FileSearchRow => ({
          file,
          normalizedName: file.name.toLowerCase(),
          normalizedFolder: file.folder.toLowerCase(),
          normalizedTag: (file.tagId ? (tagPathById.get(file.tagId) ?? '') : '').toLowerCase(),
          normalizedCaseIdentifier: (file.caseIdentifierId
            ? (caseIdentifierPathById.get(file.caseIdentifierId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedCategory: (file.categoryId
            ? (categoryPathById.get(file.categoryId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedContent: (file.documentContentPlainText.trim().length > 0
            ? file.documentContentPlainText
            : stripHtml(file.documentContent)
          ).toLowerCase(),
        })
      ),
    [caseIdentifierPathById, categoryPathById, files, tagPathById]
  );

  const filteredFiles = useMemo((): CaseResolverFile[] => {
    const query = searchQuery.trim().toLowerCase();
    const tagFilter = selectedTagId === '__all__' ? null : selectedTagId;
    const caseIdentifierFilter =
      selectedCaseIdentifierId === '__all__' ? null : selectedCaseIdentifierId;
    const categoryFilter = selectedCategoryId === '__all__' ? null : selectedCategoryId;

    const filtered = indexedRows
      .filter((row: FileSearchRow): boolean => {
        if (selectedFileType !== 'all' && row.file.fileType !== selectedFileType) return false;
        if (tagFilter && row.file.tagId !== tagFilter) return false;
        if (caseIdentifierFilter && row.file.caseIdentifierId !== caseIdentifierFilter)
          return false;
        if (categoryFilter && row.file.categoryId !== categoryFilter) return false;
        if (!query) return true;
        return (
          row.normalizedName.includes(query) ||
          row.normalizedFolder.includes(query) ||
          row.normalizedTag.includes(query) ||
          row.normalizedCaseIdentifier.includes(query) ||
          row.normalizedCategory.includes(query) ||
          row.normalizedContent.includes(query)
        );
      })
      .map((row: FileSearchRow): CaseResolverFile => row.file);

    filtered.sort((left: CaseResolverFile, right: CaseResolverFile): number => {
      let delta: number;
      if (sortBy === 'name') {
        delta = left.name.localeCompare(right.name);
      } else if (sortBy === 'created') {
        delta = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      } else {
        delta =
          new Date(left.updatedAt || left.createdAt || 0).getTime() -
          new Date(right.updatedAt || right.createdAt || 0).getTime();
      }
      return sortOrder === 'asc' ? delta : -delta;
    });

    return filtered;
  }, [
    indexedRows,
    searchQuery,
    selectedFileType,
    selectedTagId,
    selectedCaseIdentifierId,
    selectedCategoryId,
    sortBy,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / pageSize));
  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    selectedFileType,
    selectedTagId,
    selectedCaseIdentifierId,
    selectedCategoryId,
    sortBy,
    sortOrder,
    pageSize,
  ]);

  const pagedFiles = useMemo((): CaseResolverFile[] => {
    const start = (page - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, page, pageSize]);

  return (
    <DocumentSearchPage
      title='Document Search'
      startAdornment={
        <>
          <Button
            type='button'
            onClick={onCreateDocumentFromSearch}
            className='size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90'
            aria-label='Create document'
            title='Create document'
          >
            <Plus className='size-5' />
          </Button>
        </>
      }
      titleAdornment={
        <Badge variant='neutral' className='bg-card/40 font-normal'>
          {filteredFiles.length} result{filteredFiles.length === 1 ? '' : 's'}
        </Badge>
      }
      endAdornment={
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[12, 24, 48]}
          showPageSize
          variant='compact'
        />
      }
      filters={
        <div className='space-y-3'>
          <SearchInput
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setSearchQuery(event.target.value);
            }}
            onClear={(): void => {
              setSearchQuery('');
            }}
            placeholder='Search documents by name, folder, tag, case identifier, category, or content...'
            className='h-10 border-border bg-card/60 text-sm text-white'
          />
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-6'>
            <SelectSimple
              size='sm'
              value={selectedFileType}
              onValueChange={(value: string): void => {
                setSelectedFileType(value === 'document' || value === 'scanfile' ? value : 'all');
              }}
              options={[
                { value: 'all', label: 'All file types' },
                { value: 'document', label: 'Document' },
                { value: 'scanfile', label: 'Scan File' },
              ]}
              triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
             ariaLabel="Select option" title="Select option"/>
            <SelectSimple
              size='sm'
              value={selectedTagId}
              onValueChange={setSelectedTagId}
              options={tagOptions}
              triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
             ariaLabel="Select option" title="Select option"/>
            <SelectSimple
              size='sm'
              value={selectedCaseIdentifierId}
              onValueChange={setSelectedCaseIdentifierId}
              options={caseIdentifierOptions}
              triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
             ariaLabel="Select option" title="Select option"/>
            <SelectSimple
              size='sm'
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              options={categoryOptions}
              triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
             ariaLabel="Select option" title="Select option"/>
            <SelectSimple
              size='sm'
              value={sortBy}
              onValueChange={(value: string): void => {
                setSortBy(value === 'created' || value === 'name' ? value : 'updated');
              }}
              options={[
                { value: 'updated', label: 'Sort: Modified' },
                { value: 'created', label: 'Sort: Created' },
                { value: 'name', label: 'Sort: Name' },
              ]}
              triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
             ariaLabel="Select option" title="Select option"/>
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                setSortOrder((current: SortOrder) => (current === 'asc' ? 'desc' : 'asc'));
              }}
              className='h-9 border-border bg-card/60 text-xs text-gray-200 hover:bg-muted/60'
              title={`Sorting ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className='mr-1.5 size-3.5' />
              ) : (
                <ArrowDown className='mr-1.5 size-3.5' />
              )}
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </div>
      }
      loading={false}
      hasResults={filteredFiles.length > 0}
      emptyState={
        <EmptyState
          title='No documents found'
          description='Adjust search filters or create a new document.'
          icon={<FolderOpen className='size-10' />}
          action={
            <Button type='button' onClick={onCreateDocumentFromSearch}>
              <Plus className='mr-2 size-4' />
              Create Document
            </Button>
          }
        />
      }
    >
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {pagedFiles.map((file: CaseResolverFile) => {
          const previewText = (
            file.documentContentPlainText.trim().length > 0
              ? file.documentContentPlainText
              : stripHtml(file.documentContent)
          ).slice(0, 220);
          const tagLabel = file.tagId ? (tagPathById.get(file.tagId) ?? 'Unknown tag') : 'No tag';
          const caseIdentifierLabel = file.caseIdentifierId
            ? (caseIdentifierPathById.get(file.caseIdentifierId) ?? 'Unknown case identifier')
            : 'No case identifier';
          const categoryLabel = file.categoryId
            ? (categoryPathById.get(file.categoryId) ?? 'Unknown category')
            : 'No category';
          return (
            <Card key={file.id} variant='subtle' padding='md' className='bg-card/45'>
              <div className='mb-1 flex items-start justify-between gap-2'>
                <Button
                  variant='link'
                  className='h-auto p-0 line-clamp-2 justify-start text-left text-sm font-semibold text-white hover:text-cyan-200 hover:no-underline'
                  onClick={(): void => {
                    onOpenFileFromSearch(file.id);
                  }}
                >
                  <span className='line-clamp-2'>{file.name}</span>
                </Button>
                <Badge
                  variant='neutral'
                  className='shrink-0 border-border/60 bg-black/30 font-normal uppercase'
                >
                  {file.fileType}
                </Badge>
              </div>
              <div className='mb-2 text-[11px] text-gray-500'>{file.folder || '(root)'}</div>
              <div className='mb-2 line-clamp-3 text-xs text-gray-300'>
                {previewText || 'No content yet.'}
              </div>
              <div className='space-y-1 text-[11px] text-gray-400'>
                <div>Tag: {tagLabel}</div>
                <div>Case Identifier: {caseIdentifierLabel}</div>
                <div>Category: {categoryLabel}</div>
                <div>Modified: {toDateLabel(file.updatedAt)}</div>
              </div>
              <div className='mt-3 flex items-center justify-end gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 border-white/20 px-2 text-xs'
                  onClick={(): void => {
                    onOpenFileFromSearch(file.id);
                  }}
                >
                  {file.fileType === 'scanfile' ? (
                    <FileImage className='mr-1.5 size-3.5' />
                  ) : (
                    <FileText className='mr-1.5 size-3.5' />
                  )}
                  Open
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 border-white/20 px-2 text-xs'
                  onClick={(): void => {
                    onEditFileFromSearch(file.id);
                  }}
                >
                  Edit
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </DocumentSearchPage>
  );
}
