/**
 * Log Display Helpers
 * 
 * Utilities for extracting and formatting log data for UI display.
 * Provides:
 * - Safe value extraction from log records
 * - Type conversion and validation
 * - Display value formatting
 * - Status variant mapping
 * - Context document parsing
 */

import { type SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { StatusVariant } from '@/shared/contracts/ui/base';

import {
  type ContextRegistryDisplay,
  type ContextDocumentDisplay,
  type ContextDocumentSectionDisplay,
  type ContextRegistryNodeDisplay,
  type AlertEvidenceDisplay,
  type AlertEvidenceSampleDisplay,
} from '../types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/**
 * Safely reads a string value from log context
 * 
 * @param log - System log record
 * @param key - Context key to read
 * @returns String value or null if not found/empty
 */
export const readContextString = (log: SystemLogRecord, key: string): string | null => {
  const value = log.context?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

/**
 * Converts unknown value to record object
 * 
 * @param value - Value to convert
 * @returns Record object or null if not a plain object
 */
export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Safely reads a string from a record
 * 
 * @param value - Value to read
 * @returns Trimmed string or null if empty
 */
export const readRecordString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/**
 * Safely reads a number from a record
 * 
 * @param value - Value to read
 * @returns Finite number or null
 */
export const readRecordNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Converts any value to a display string
 * Handles strings, numbers, booleans, arrays, and objects
 * 
 * @param value - Value to convert
 * @returns Display string or null if empty/invalid
 */
export const toDisplayValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const formatted = value
      .map((item) => toDisplayValue(item))
      .filter((item): item is string => Boolean(item));
    return formatted.length > 0 ? formatted.join(', ') : null;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientError(error);
      return null;
    }
  }
  return null;
};

/**
 * Maps status strings to UI status variants
 * Normalizes various status values to standard variants
 * 
 * @param status - Status string to map
 * @returns UI status variant
 */
export const getStatusVariant = (status: string | null | undefined): StatusVariant => {
  const normalized = (status ?? '').toLowerCase();
  if (['completed', 'cached', 'success', 'healthy'].includes(normalized)) return 'success';
  if (['warn', 'warning', 'blocked', 'skipped'].includes(normalized)) return 'warning';
  if (['failed', 'error', 'fatal', 'timeout', 'cancelled', 'canceled'].includes(normalized)) {
    return 'error';
  }
  if (['info', 'running'].includes(normalized)) return 'info';
  return 'neutral';
};

/**
 * Parses a context document from unknown value
 * Extracts document metadata and sections
 * 
 * @param value - Value to parse
 * @returns Parsed document display or null if invalid
 */
export const readContextDocument = (value: unknown): ContextDocumentDisplay | null => {
  const record = asRecord(value);
  const id = readRecordString(record?.['id']);
  const title = readRecordString(record?.['title']);
  if (!id || !title) return null;

  const factsRecord = asRecord(record?.['facts']);
  const sections = Array.isArray(record?.['sections']) ? record?.['sections'] : [];

  return {
    id,
    entityType: readRecordString(record?.['entityType']),
    title,
    summary: readRecordString(record?.['summary']),
    status: readRecordString(record?.['status']),
    tags: Array.isArray(record?.['tags'])
      ? record['tags']
        .map((tag) => readRecordString(tag))
        .filter((tag): tag is string => Boolean(tag))
        .slice(0, 6)
      : [],
    facts: factsRecord
      ? Object.entries(factsRecord)
        .map(([key, rawValue]) => {
          const val = toDisplayValue(rawValue);
          return val ? { label: key, value: val } : null;
        })
        .filter((entry): entry is LabeledOptionDto<string> => Boolean(entry))
      : [],
    sections: sections
      .map((section): ContextDocumentSectionDisplay | null => {
        const sectionRecord = asRecord(section);
        const sectionTitle = readRecordString(sectionRecord?.['title']);
        if (!sectionTitle) return null;
        const items = Array.isArray(sectionRecord?.['items']) ? sectionRecord?.['items'] : [];

        return {
          id: readRecordString(sectionRecord?.['id']),
          kind: readRecordString(sectionRecord?.['kind']),
          title: sectionTitle,
          summary: readRecordString(sectionRecord?.['summary']),
          text: readRecordString(sectionRecord?.['text']),
          items: items
            .map((item) => {
              const itemRecord = asRecord(item);
              if (!itemRecord) return null;
              const normalized = Object.fromEntries(
                Object.entries(itemRecord)
                  .map(([key, rawValue]) => [key, toDisplayValue(rawValue)])
                  .filter((entry): entry is [string, string] => Boolean(entry[1]))
              );
              return Object.keys(normalized).length > 0 ? normalized : null;
            })
            .filter((item): item is Record<string, string> => Boolean(item))
            .slice(0, 6),
        };
      })
      .filter((section): section is ContextDocumentSectionDisplay => Boolean(section)),
  };
};

export const readContextRegistryNode = (value: unknown): ContextRegistryNodeDisplay | null => {
  const record = asRecord(value);
  const id = readRecordString(record?.['id']);
  const name = readRecordString(record?.['name']);
  if (!id || !name) return null;

  return {
    id,
    kind: readRecordString(record?.['kind']),
    name,
  };
};

export const readContextRegistryDisplay = (value: unknown): ContextRegistryDisplay | null => {
  const contextRegistry = asRecord(value);
  if (!contextRegistry) return null;

  const refs = Array.isArray(contextRegistry['refs']) ? contextRegistry['refs'] : [];
  const resolved = asRecord(contextRegistry['resolved']);
  const documents = Array.isArray(resolved?.['documents']) ? resolved?.['documents'] : [];
  const nodes = Array.isArray(resolved?.['nodes']) ? resolved?.['nodes'] : [];

  return {
    refs: refs
      .map((ref) => readRecordString(asRecord(ref)?.['id']))
      .filter((ref): ref is string => Boolean(ref)),
    documents: documents
      .map((document) => readContextDocument(document))
      .filter((document): document is ContextDocumentDisplay => Boolean(document)),
    nodes: nodes
      .map((node) => readContextRegistryNode(node))
      .filter((node): node is ContextRegistryNodeDisplay => Boolean(node)),
  };
};

export const readLogContextRegistry = (log: SystemLogRecord): ContextRegistryDisplay | null => {
  const context = asRecord(log.context);
  return readContextRegistryDisplay(context?.['contextRegistry']);
};

export const readAlertEvidenceSample = (value: unknown): AlertEvidenceSampleDisplay | null => {
  const record = asRecord(value);
  if (!record) return null;

  return {
    logId: readRecordString(record['logId']),
    createdAt: readRecordString(record['createdAt']),
    level: readRecordString(record['level']),
    source: readRecordString(record['source']),
    message: readRecordString(record['message']),
    fingerprint: readRecordString(record['fingerprint']),
    contextRegistry: readContextRegistryDisplay(record['contextRegistry']),
  };
};

export const readAlertEvidence = (log: SystemLogRecord): AlertEvidenceDisplay | null => {
  const context = asRecord(log.context);
  const alertEvidence = asRecord(context?.['alertEvidence']);
  if (!alertEvidence) return null;

  const samples = Array.isArray(alertEvidence['samples'])
    ? (alertEvidence['samples'] as unknown[])
    : [];

  return {
    matchedCount: readRecordNumber(alertEvidence['matchedCount']),
    sampleSize: readRecordNumber(alertEvidence['sampleSize']),
    windowStart: readRecordString(alertEvidence['windowStart']),
    windowEnd: readRecordString(alertEvidence['windowEnd']),
    lastObservedLog: readAlertEvidenceSample(alertEvidence['lastObservedLog']),
    samples: samples
      .map((sample) => readAlertEvidenceSample(sample))
      .filter((sample): sample is AlertEvidenceSampleDisplay => Boolean(sample)),
  };
};

export const getPrimaryContextDocument = (
  contextRegistry: ContextRegistryDisplay | null
): ContextDocumentDisplay | null => contextRegistry?.documents[0] ?? null;

export const getLogCategory = (log: SystemLogRecord): string | null => {
  return typeof log.category === 'string' && log.category.trim().length > 0
    ? log.category
    : readContextString(log, 'category');
};
