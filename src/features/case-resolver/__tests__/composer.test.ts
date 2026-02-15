import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';
import { compileCaseResolverPrompt } from '@/features/case-resolver/composer';
import type { CaseResolverGraph } from '@/features/case-resolver/types';

const createPromptNode = (input: {
  id: string;
  title: string;
  template: string;
  x: number;
  y: number;
}): AiNode => ({
  id: input.id,
  type: 'prompt',
  title: input.title,
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x: input.x, y: input.y },
  config: {
    prompt: {
      template: input.template,
    },
  },
});

const createEdge = (input: {
  id: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
}): Edge => ({
  id: input.id,
  from: input.from,
  to: input.to,
  fromPort: input.fromPort,
  toPort: input.toPort,
});

describe('case-resolver composer', () => {
  it('compiles linked nodes from selected node and applies join/operator rules', () => {
    const nodes: AiNode[] = [
      createPromptNode({ id: 'a', title: 'A', template: 'Alpha', x: 0, y: 0 }),
      createPromptNode({ id: 'b', title: 'B', template: 'Beta', x: 100, y: 0 }),
      createPromptNode({ id: 'c', title: 'C', template: 'Gamma', x: 200, y: 0 }),
      createPromptNode({ id: 'd', title: 'D', template: 'Detached', x: 0, y: 120 }),
    ];
    const edges: Edge[] = [
      createEdge({ id: 'e1', from: 'a', to: 'b' }),
      createEdge({ id: 'e2', from: 'b', to: 'c' }),
    ];
    const graph: CaseResolverGraph = {
      nodes,
      edges,
      nodeMeta: {
        a: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        b: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'double',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        c: {
          role: 'text_note',
          includeInOutput: false,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        d: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        e1: { joinMode: 'newline' },
        e2: { joinMode: 'tab' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
    };

    const compiled = compileCaseResolverPrompt(graph, 'a');

    expect(compiled.prompt).toBe('Alpha\n"Beta"');
    expect(compiled.segments.map((segment) => segment.nodeId)).toEqual(['a', 'b', 'c']);
    expect(compiled.segments[2]?.includeInOutput).toBe(false);
    expect(compiled.outputsByNode['a']?.content).toBe('Alpha');
    expect(compiled.outputsByNode['b']?.content).toBe('Alpha\n"Beta"');
  });

  it('supports custom surround text around compiled node values', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'focus', title: 'Focus', template: 'Quoted text', x: 0, y: 0 }),
        createPromptNode({ id: 'other', title: 'Other', template: 'Should not be included', x: 0, y: 100 }),
      ],
      edges: [],
      nodeMeta: {
        focus: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'single',
          surroundPrefix: '<<',
          surroundSuffix: '>>',
        },
        other: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {},
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
    };

    const compiled = compileCaseResolverPrompt(graph, 'focus');

    expect(compiled.prompt).toBe('<<\'Quoted text\'>>');
    expect(compiled.segments).toHaveLength(1);
    expect(compiled.segments[0]?.text).toBe('<<\'Quoted text\'>>');
    expect(compiled.outputsByNode['focus']).toEqual({
      textfield: 'Quoted text',
      content: '<<\'Quoted text\'>>',
    });
  });

  it('supports document-node textfield/content flow outputs', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'doc-a', title: 'Doc A', template: 'Alpha', x: 0, y: 0 }),
        createPromptNode({ id: 'doc-b', title: 'Doc B', template: 'Beta', x: 150, y: 0 }),
      ],
      edges: [
        createEdge({
          id: 'content-flow',
          from: 'doc-a',
          to: 'doc-b',
          fromPort: 'content',
          toPort: 'content',
        }),
      ],
      nodeMeta: {
        'doc-a': {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        'doc-b': {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'double',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        'content-flow': { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        'doc-a': 'file-a',
        'doc-b': 'file-b',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'doc-a');

    expect(compiled.outputsByNode['doc-a']).toEqual({
      textfield: 'Alpha',
      content: 'Alpha',
    });
    expect(compiled.outputsByNode['doc-b']).toEqual({
      textfield: 'Beta',
      content: 'Alpha\n"Beta"',
    });
    expect(compiled.prompt).toBe('Alpha\n"Beta"');
  });
});
