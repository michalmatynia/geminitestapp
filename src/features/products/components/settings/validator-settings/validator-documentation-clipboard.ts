import {
  VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_MANIFEST,
  VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_OPTIONS,
  VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_SCHEMA,
  VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_TYPES,
} from '@/features/documentation/catalogs/validator-semantic-grammar';

import {
  VALIDATOR_FUNCTION_DOCS,
  VALIDATOR_UI_DOCS,
  type ValidatorFunctionDoc,
  type ValidatorUiDoc,
} from './validator-docs-catalog';

export const VALIDATOR_SAMPLE_IMPORT_JSON = `{
  "version": 1,
  "scope": "products",
  "mode": "upsert",
  "patterns": [
    {
      "code": "product.name.trim_spaces",
      "label": "Trim duplicate spaces in name",
      "target": "name",
      "regex": "\\\\s{2,}",
      "flags": "g",
      "message": "Multiple spaces found in product name.",
      "severity": "warning",
      "enabled": true,
      "replacementEnabled": true,
      "replacementValue": " ",
      "replacementFields": ["name_en", "name_pl", "name_de"],
      "appliesToScopes": ["draft_template", "product_create", "product_edit"]
    }
  ],
  "sequences": [
    {
      "code": "seq.product.name_cleanup",
      "label": "Name Cleanup",
      "debounceMs": 150,
      "steps": [
        {
          "patternCode": "product.name.trim_spaces",
          "order": 10
        }
      ]
    }
  ]
}`;

const joinText = (items: string[]): string => (items.length > 0 ? items.join(' ') : 'None.');

const buildFunctionDocClipboardSection = (doc: ValidatorFunctionDoc): string => {
  return [
    `### ${doc.symbol}`,
    `- ID: ${doc.id}`,
    `- File: ${doc.file}`,
    `- Purpose: ${doc.purpose}`,
    `- Params: ${joinText(doc.params)}`,
    `- Returns: ${doc.returns}`,
    `- Errors: ${joinText(doc.errors)}`,
    `- Edge cases: ${joinText(doc.edgeCases)}`,
    '',
    '```ts',
    doc.example,
    '```',
  ].join('\n');
};

const buildUiDocClipboardSection = (doc: ValidatorUiDoc): string => {
  return [
    `### ${doc.title}`,
    `- ID: ${doc.id}`,
    `- Description: ${doc.description}`,
    `- Related functions: ${joinText(doc.relatedFunctions)}`,
  ].join('\n');
};

const toJsonSnippet = (value: unknown): string => JSON.stringify(value, null, 2);

export const buildFullValidatorDocumentationClipboardText = (): string => {
  const sections: string[] = [
    '# Validator Pattern Documentation',
    '',
    '## Overview',
    '- Use this document to copy-paste validator import schema, options, and type descriptors.',
    '- Semantic codes are stable machine identifiers for patterns, sequences, steps, and options.',
    '- Pattern and sequence entities are described in JSON so tools can parse and generate payloads.',
    '',
    '## Quick Start Import JSON',
    '```json',
    VALIDATOR_SAMPLE_IMPORT_JSON.trim(),
    '```',
    '',
    '## Semantic Grammar Manifest',
    '```json',
    toJsonSnippet(VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_MANIFEST),
    '```',
    '',
    '## Semantic Grammar Schema',
    '```json',
    toJsonSnippet(VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_SCHEMA),
    '```',
    '',
    '## Semantic Grammar Options',
    '```json',
    toJsonSnippet(VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_OPTIONS),
    '```',
    '',
    '## Semantic Grammar Types',
    '```json',
    toJsonSnippet(VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_TYPES),
    '```',
    '',
    '## Function Reference',
    '',
  ];

  sections.push(
    VALIDATOR_FUNCTION_DOCS.map((doc: ValidatorFunctionDoc) =>
      buildFunctionDocClipboardSection(doc)
    ).join('\n\n')
  );

  sections.push('', '## UI Controls & Tooltips', '');
  sections.push(
    VALIDATOR_UI_DOCS.map((doc: ValidatorUiDoc) =>
      buildUiDocClipboardSection(doc)
    ).join('\n\n')
  );

  sections.push('', '## Source Paths', '- docs/validator/semantic-grammar/*', '- src/features/documentation/catalogs/validator-docs.ts', '');

  return sections.join('\n');
};
