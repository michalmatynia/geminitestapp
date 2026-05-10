import { FileText } from 'lucide-react';
import React from 'react';

import type { FilemakerDocument } from '../../filemaker-document.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import {
  FilemakerLinkedRecordActions,
  type FilemakerLinkedRecordEditField,
} from './FilemakerLinkedRecordActions';

export interface FilemakerDocumentsSectionProps {
  documents: FilemakerDocument[];
  isSaving?: boolean;
  onDeleteDocument?: (id: string) => Promise<void> | void;
  onUpdateDocument?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const firstNonEmpty = (...values: Array<string | null | undefined>): string =>
  values
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .find((value: string): boolean => value.length > 0) ?? missingValue;

const documentTitle = (document: FilemakerDocument): string =>
  firstNonEmpty(
    document.documentName,
    document.codeA,
    document.codeB,
    document.comment,
    document.legacyUuid
  );

const valueOrEmpty = (value: string | null | undefined): string => value ?? '';

const buildDocumentEditFields = (document: FilemakerDocument): FilemakerLinkedRecordEditField[] => [
  { key: 'documentName', label: 'Document Name', value: valueOrEmpty(document.documentName) },
  { key: 'codeA', label: 'Code A', value: valueOrEmpty(document.codeA) },
  { key: 'codeB', label: 'Code B', value: valueOrEmpty(document.codeB) },
  { key: 'documentTypeLabel', label: 'Type Label', value: valueOrEmpty(document.documentTypeLabel) },
  { key: 'documentTypeValueId', label: 'Type Value ID', value: valueOrEmpty(document.documentTypeValueId) },
  {
    key: 'legacyDocumentTypeUuid',
    label: 'Legacy Type UUID',
    value: valueOrEmpty(document.legacyDocumentTypeUuid),
  },
  { key: 'issuedBy', label: 'Issued By', value: valueOrEmpty(document.issuedBy) },
  { key: 'issueDate', label: 'Issue Date', value: valueOrEmpty(document.issueDate) },
  { key: 'expiryDate', label: 'Expiry Date', value: valueOrEmpty(document.expiryDate) },
  { key: 'comment', label: 'Comment', type: 'textarea', rows: 5, value: valueOrEmpty(document.comment) },
  { key: 'updatedBy', label: 'Modified By', value: valueOrEmpty(document.updatedBy) },
];

const DocumentTitleBlock = ({ document }: { document: FilemakerDocument }): React.JSX.Element => (
  <div className='flex min-w-0 items-start gap-2'>
    <FileText className='mt-0.5 size-3.5 shrink-0 text-indigo-300' />
    <div className='min-w-0'>
      <div className='truncate text-sm font-semibold text-white'>{documentTitle(document)}</div>
      <div className='truncate text-[10px] text-gray-600'>
        Legacy UUID: {formatOptionalValue(document.legacyUuid)} | Owner UUID:{' '}
        {formatOptionalValue(document.legacyOwnerUuid)}
      </div>
    </div>
  </div>
);

const DocumentLinkedActions = ({
  document,
  isSaving,
  onDelete,
  onUpdate,
}: {
  document: FilemakerDocument;
  isSaving: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
}): React.JSX.Element => (
  <FilemakerLinkedRecordActions
    deleteLabel='document'
    editTitle='Edit Document'
    isSaving={isSaving}
    fields={buildDocumentEditFields(document)}
    onSave={
      onUpdate === undefined
        ? undefined
        : (patch: Record<string, unknown>) => onUpdate(document.id, patch)
    }
    onDelete={onDelete === undefined ? undefined : () => onDelete(document.id)}
  />
);

const DocumentDetailsGrid = ({ document }: { document: FilemakerDocument }): React.JSX.Element => (
  <div className='grid gap-2 text-xs text-gray-300 md:grid-cols-2'>
    <div>Code A: {formatOptionalValue(document.codeA)}</div>
    <div>Code B: {formatOptionalValue(document.codeB)}</div>
    <div>Type: {formatOptionalValue(document.documentTypeLabel ?? document.legacyDocumentTypeUuid)}</div>
    <div>Issued by: {formatOptionalValue(document.issuedBy)}</div>
    <div>Issued: {formatTimestamp(document.issueDate)}</div>
    <div>Expires: {formatTimestamp(document.expiryDate)}</div>
  </div>
);

const DocumentComment = ({ document }: { document: FilemakerDocument }): React.JSX.Element | null => {
  if ((document.comment?.trim().length ?? 0) === 0) return null;
  return (
    <div className='whitespace-pre-wrap rounded border border-border bg-muted/20 p-2 text-xs leading-5 text-gray-200'>
      {document.comment}
    </div>
  );
};

const DocumentAuditBadges = ({ document }: { document: FilemakerDocument }): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Badge variant='outline' className='text-[10px]'>
      Created: {formatTimestamp(document.createdAt)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified: {formatTimestamp(document.updatedAt)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified By: {formatOptionalValue(document.updatedBy)}
    </Badge>
  </div>
);

const FilemakerDocumentCard = (props: {
  document: FilemakerDocument;
  isSaving: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
}): React.JSX.Element => (
  <Card key={props.document.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start justify-between gap-2'>
        <DocumentTitleBlock document={props.document} />
        <DocumentLinkedActions {...props} />
      </div>
      <DocumentDetailsGrid document={props.document} />
      <DocumentComment document={props.document} />
      <DocumentAuditBadges document={props.document} />
    </div>
  </Card>
);

export function FilemakerDocumentsSection({
  documents,
  isSaving = false,
  onDeleteDocument,
  onUpdateDocument,
  title = 'Documents',
}: FilemakerDocumentsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {documents.length === 0 ? (
        <div className='text-xs text-gray-500'>No documents linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {documents.map((document: FilemakerDocument) => (
            <FilemakerDocumentCard
              key={document.id}
              document={document}
              isSaving={isSaving}
              onDelete={onDeleteDocument}
              onUpdate={onUpdateDocument}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
