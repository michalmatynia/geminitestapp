import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { BlockInstance, SectionInstance } from '@/shared/contracts/cms';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { InspectorAiContextPreviewTab } from './InspectorAiContext.types';

const PAGE_CONTEXT_LIMIT = 6000;
const ELEMENT_CONTEXT_LIMIT = 2500;

interface BuilderStateSnapshot {
  currentPage?: {
    id: string;
    name: string;
    status?: string | null;
    themeId?: string | null;
    publishedAt?: string | null;
    slugs?: Array<string | { slug?: string | null }> | null;
  } | null;
  sections?: SectionInstance[] | null;
}

interface InspectorAiToastOptions {
  variant: 'success' | 'error' | 'info';
}

type InspectorAiToast = (message: string, options: InspectorAiToastOptions) => void;

interface UseInspectorAiContextPreviewArgs {
  state: BuilderStateSnapshot | null | undefined;
  selectedSection: SectionInstance | null | undefined;
  selectedBlock: BlockInstance | null | undefined;
  selectedColumn: BlockInstance | null | undefined;
  selectedColumnParentSection: SectionInstance | null | undefined;
  selectedParentSection: SectionInstance | null | undefined;
  selectedParentColumn: BlockInstance | null | undefined;
  selectedParentBlock: BlockInstance | null | undefined;
  toast: InspectorAiToast;
}

interface UseInspectorAiContextPreviewResult {
  buildPageContext: (limit?: number | null) => string;
  buildElementContext: (limit?: number | null) => string;
  contextPreviewOpen: boolean;
  setContextPreviewOpen: Dispatch<SetStateAction<boolean>>;
  contextPreviewTab: InspectorAiContextPreviewTab;
  setContextPreviewTab: Dispatch<SetStateAction<InspectorAiContextPreviewTab>>;
  contextPreviewFull: boolean;
  setContextPreviewFull: Dispatch<SetStateAction<boolean>>;
  contextPreviewNonce: number;
  setContextPreviewNonce: Dispatch<SetStateAction<number>>;
  pageContextPreview: string;
  elementContextPreview: string;
  copyContext: (value: string) => Promise<void>;
}

interface SerializedBlock {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks: SerializedBlock[];
}

function stringifyContext(value: unknown, limit?: number | null): string {
  try {
    const json = JSON.stringify(value, null, 2);
    if (limit == null) return json;
    if (json.length <= limit) return json;
    return `${json.slice(0, limit)}\n...truncated...`;
  } catch (error) {
    logClientError(error);
    const fallback =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : '[complex value]';
    if (limit == null) return fallback;
    return fallback.length <= limit ? fallback : `${fallback.slice(0, limit)}...`;
  }
}

function serializeBlock(block: BlockInstance): SerializedBlock {
  return {
    id: block.id,
    type: block.type,
    settings: block.settings ?? {},
    blocks: (block.blocks ?? []).map((child: BlockInstance) => serializeBlock(child)),
  };
}

export function useInspectorAiContextPreview({
  state,
  selectedSection,
  selectedBlock,
  selectedColumn,
  selectedColumnParentSection,
  selectedParentSection,
  selectedParentColumn,
  selectedParentBlock,
  toast,
}: UseInspectorAiContextPreviewArgs): UseInspectorAiContextPreviewResult {
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [contextPreviewTab, setContextPreviewTab] =
    useState<InspectorAiContextPreviewTab>('page');
  const [contextPreviewFull, setContextPreviewFull] = useState(false);
  const [contextPreviewNonce, setContextPreviewNonce] = useState(0);

  const buildPageContext = useCallback(
    (limit?: number | null): string => {
      const resolvedLimit = limit === undefined ? PAGE_CONTEXT_LIMIT : limit;
      if (!state?.currentPage) return 'No page loaded.';
      return stringifyContext(
        {
          page: {
            id: state.currentPage.id,
            name: state.currentPage.name,
            status: state.currentPage.status ?? null,
            themeId: state.currentPage.themeId ?? null,
            publishedAt: state.currentPage.publishedAt ?? null,
            slugs: (state.currentPage.slugs ?? [])
              .map((slugEntry: string | { slug?: string | null }): string =>
                typeof slugEntry === 'string' ? slugEntry : slugEntry.slug?.trim() ?? ''
              )
              .filter((slug: string): boolean => slug.length > 0),
          },
          sections: (state.sections ?? []).map((section: SectionInstance) => ({
            id: section.id,
            type: section.type,
            zone: section.zone,
            settings: section.settings ?? {},
            blocks: (section.blocks ?? []).map((block: BlockInstance) => serializeBlock(block)),
          })),
        },
        resolvedLimit
      );
    },
    [state]
  );

  const selectedGridRow = useMemo<BlockInstance | null>(() => {
    if (selectedParentSection?.type !== 'Grid' || !selectedParentColumn) return null;
    return (
      selectedParentSection.blocks.find(
        (block: BlockInstance) =>
          block.type === 'Row' &&
          (block.blocks ?? []).some(
            (column: BlockInstance) => column.id === selectedParentColumn.id
          )
      ) ?? null
    );
  }, [selectedParentColumn, selectedParentSection]);

  const buildElementContext = useCallback(
    (limit?: number | null): string => {
      const resolvedLimit = limit === undefined ? ELEMENT_CONTEXT_LIMIT : limit;
      if (selectedSection && !selectedBlock && !selectedColumn) {
        return stringifyContext(
          {
            kind: 'section',
            id: selectedSection.id,
            type: selectedSection.type,
            zone: selectedSection.zone,
            settings: selectedSection.settings ?? {},
            blocks: (selectedSection.blocks ?? []).map((block: BlockInstance) =>
              serializeBlock(block)
            ),
          },
          resolvedLimit
        );
      }
      if (selectedColumn) {
        return stringifyContext(
          {
            kind: 'column',
            id: selectedColumn.id,
            sectionId: selectedColumnParentSection?.id,
            rowId: selectedGridRow?.id,
            settings: selectedColumn.settings ?? {},
            blocks: (selectedColumn.blocks ?? []).map((block: BlockInstance) =>
              serializeBlock(block)
            ),
          },
          resolvedLimit
        );
      }
      if (selectedBlock) {
        return stringifyContext(
          {
            kind: selectedBlock.type === 'Row' ? 'row' : 'block',
            id: selectedBlock.id,
            type: selectedBlock.type,
            sectionId: selectedParentSection?.id,
            columnId: selectedParentColumn?.id,
            parentBlockId: selectedParentBlock?.id,
            settings: selectedBlock.settings ?? {},
            blocks: (selectedBlock.blocks ?? []).map((block: BlockInstance) =>
              serializeBlock(block)
            ),
          },
          resolvedLimit
        );
      }
      return 'No element selected.';
    },
    [
      selectedBlock,
      selectedColumn,
      selectedColumnParentSection,
      selectedGridRow,
      selectedParentBlock,
      selectedParentColumn,
      selectedParentSection,
      selectedSection,
    ]
  );

  const pageContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return '';
    return buildPageContext(contextPreviewFull ? null : undefined);
  }, [buildPageContext, contextPreviewFull, contextPreviewNonce, contextPreviewOpen]);

  const elementContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return '';
    return buildElementContext(contextPreviewFull ? null : undefined);
  }, [buildElementContext, contextPreviewFull, contextPreviewNonce, contextPreviewOpen]);

  const copyContext = useCallback(
    async (value: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(value);
        toast('Context copied.', { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast('Failed to copy context.', { variant: 'error' });
        logClientError(error as Error, {
          context: { source: 'InspectorAiContext', action: 'copyContext' },
        });
      }
    },
    [toast]
  );

  return {
    buildPageContext,
    buildElementContext,
    contextPreviewOpen,
    setContextPreviewOpen,
    contextPreviewTab,
    setContextPreviewTab,
    contextPreviewFull,
    setContextPreviewFull,
    contextPreviewNonce,
    setContextPreviewNonce,
    pageContextPreview,
    elementContextPreview,
    copyContext,
  };
}
