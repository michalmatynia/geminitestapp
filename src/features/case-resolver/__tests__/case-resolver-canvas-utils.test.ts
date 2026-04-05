import { describe, expect, it } from 'vitest';

import {
  buildPromptTemplateFromDroppedDocumentFile,
  resolvePromptNodeStaticOutputs,
  stripHtmlToPlainText,
} from '@/features/case-resolver/components/case-resolver-canvas-utils';
import { DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import { type AiNode, type CaseResolverFile } from '@/shared/contracts/case-resolver';

const createPromptNode = (template: string): AiNode => ({
  id: 'prompt-1',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: ['wysiwygText', 'plaintextContent', 'plainText'],
  outputs: ['wysiwygText', 'plaintextContent', 'plainText'],
  position: { x: 0, y: 0 },
  config: {
    prompt: {
      template,
    },
  },
});

const createTemplateSourceFile = (input: {
  name: string;
  fileType?: string;
  documentContentHtml?: string;
  documentContentPlainText?: string;
  documentContentMarkdown?: string;
  documentContent?: string;
  ocrText?: string;
  scanSlots?: Array<{ ocrText?: string }>;
}): CaseResolverFile =>
  ({
    name: input.name,
    fileType: input.fileType ?? 'document',
    documentContentHtml: input.documentContentHtml ?? '',
    documentContentPlainText: input.documentContentPlainText ?? '',
    documentContentMarkdown: input.documentContentMarkdown ?? '',
    documentContent: input.documentContent ?? '',
    ocrText: input.ocrText ?? '',
    scanSlots: input.scanSlots ?? [],
  }) as unknown as CaseResolverFile;

describe('case-resolver canvas utils', () => {
  it('builds prompt template from plain text when html is unavailable', () => {
    const file = createTemplateSourceFile({
      name: 'Doc A',
      documentContentPlainText: 'Plain text body',
    });

    expect(stripHtmlToPlainText(buildPromptTemplateFromDroppedDocumentFile(file))).toBe(
      'Plain text body'
    );
  });

  it('falls back to markdown content when plain text is unavailable', () => {
    const file = createTemplateSourceFile({
      name: 'Doc B',
      documentContentMarkdown: '# Heading',
    });

    expect(stripHtmlToPlainText(buildPromptTemplateFromDroppedDocumentFile(file))).toBe(
      '# Heading'
    );
  });

  it('prefers scan markdown text for dropped scan files', () => {
    const file = createTemplateSourceFile({
      name: 'Scan A',
      fileType: 'scanfile',
      documentContentMarkdown: 'Edited markdown text',
      scanSlots: [{ ocrText: 'First page OCR' }, { ocrText: 'Second page OCR' }],
      ocrText: 'Fallback OCR',
    });

    expect(stripHtmlToPlainText(buildPromptTemplateFromDroppedDocumentFile(file))).toBe(
      'Edited markdown text'
    );
  });

  it('falls back to scan slot OCR text when scan markdown is unavailable', () => {
    const file = createTemplateSourceFile({
      name: 'Scan B',
      fileType: 'scanfile',
      scanSlots: [{ ocrText: 'First page OCR' }, { ocrText: 'Second page OCR' }],
      ocrText: 'Fallback OCR',
    });

    expect(stripHtmlToPlainText(buildPromptTemplateFromDroppedDocumentFile(file))).toBe(
      'First page OCR\n\nSecond page OCR'
    );
  });

  it('resolves static prompt outputs for connector previews', () => {
    const node = createPromptNode('<p>Alpha</p>');
    const outputs = resolvePromptNodeStaticOutputs(node, {
      ...DEFAULT_CASE_RESOLVER_NODE_META,
      quoteMode: 'double',
      surroundPrefix: '[[',
      surroundSuffix: ']]',
    });

    expect(outputs).toEqual({
      wysiwygText: 'Alpha',
      plaintextContent: '[["Alpha"]]',
      plainText: '[["Alpha"]]',
      wysiwygContent: '',
    });
  });
});
