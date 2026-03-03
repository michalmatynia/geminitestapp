import { describe, expect, it } from 'vitest';

import { compileCaseResolverPrompt } from '@/features/case-resolver/composer';
import type { AiNode, Edge, CaseResolverGraph } from '@/shared/contracts/case-resolver';

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
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}): Edge =>
  ({
    id: input.id,
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle,
    targetHandle: input.targetHandle,
  }) as Edge;

describe('case-resolver composer', () => {
  it('compiles linked nodes from selected node and applies join/operator rules', () => {
    const nodes: AiNode[] = [
      createPromptNode({ id: 'a', title: 'A', template: 'Alpha', x: 0, y: 0 }),
      createPromptNode({ id: 'b', title: 'B', template: 'Beta', x: 100, y: 0 }),
      createPromptNode({ id: 'c', title: 'C', template: 'Gamma', x: 200, y: 0 }),
      createPromptNode({ id: 'd', title: 'D', template: 'Detached', x: 0, y: 120 }),
    ];
    const edges: Edge[] = [
      createEdge({
        id: 'e1',
        source: 'a',
        target: 'b',
        sourceHandle: 'plaintextContent',
        targetHandle: 'plaintextContent',
      }),
      createEdge({
        id: 'e2',
        source: 'b',
        target: 'c',
        sourceHandle: 'plaintextContent',
        targetHandle: 'plaintextContent',
      }),
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
    expect(compiled.outputsByNode['a']?.plaintextContent).toBe('Alpha');
    expect(compiled.outputsByNode['b']?.plaintextContent).toBe('Alpha\n"Beta"');
  });

  it('supports custom surround text around compiled node values', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'focus', title: 'Focus', template: 'Quoted text', x: 0, y: 0 }),
        createPromptNode({
          id: 'other',
          title: 'Other',
          template: 'Should not be included',
          x: 0,
          y: 100,
        }),
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

    expect(compiled.prompt).toBe("<<'Quoted text'>>");
    expect(compiled.segments).toHaveLength(1);
    expect(compiled.segments[0]?.text).toBe("<<'Quoted text'>>");
    expect(compiled.outputsByNode['focus']).toEqual({
      textfield: "<<'Quoted text'>>",
      plaintextContent: "<<'Quoted text'>>",
      plainText: "<<'Quoted text'>>",
      wysiwygContent: '',
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
          source: 'doc-a',
          target: 'doc-b',
          sourceHandle: 'plaintextContent',
          targetHandle: 'plaintextContent',
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
      plaintextContent: 'Alpha',
      plainText: 'Alpha',
      wysiwygContent: '',
    });
    expect(compiled.outputsByNode['doc-b']).toEqual({
      textfield: '"Beta"',
      plaintextContent: 'Alpha\n"Beta"',
      plainText: '"Beta"',
      wysiwygContent: '',
    });
    expect(compiled.prompt).toBe('Alpha\n"Beta"');
  });

  it('supports plainText input/output and strips HTML-like wrappers', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Alpha', x: 0, y: 0 }),
        createPromptNode({
          id: 'target',
          title: 'Target',
          template: '<p>Fallback</p>',
          x: 150,
          y: 0,
        }),
      ],
      edges: [
        createEdge({
          id: 'plain-flow',
          source: 'source',
          target: 'target',
          sourceHandle: 'plaintextContent',
          targetHandle: 'plainText',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '<b>',
          surroundSuffix: '</b>',
        },
        target: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        'plain-flow': { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        target: 'file-target',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['source']).toEqual({
      textfield: '<b>Alpha</b>',
      plaintextContent: '<b>Alpha</b>',
      plainText: 'Alpha',
      wysiwygContent: '',
    });
    expect(compiled.outputsByNode['target']).toEqual({
      textfield: 'Alpha',
      plaintextContent: 'Alpha',
      plainText: 'Alpha',
      wysiwygContent: '',
    });
    expect(compiled.prompt).toBe('Alpha');
  });

  it('injects plainText input into node text lane and forwards plainText output', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Upstream text', x: 0, y: 0 }),
        createPromptNode({
          id: 'scan-edit',
          title: 'Edit Scan',
          template: 'Existing markdown',
          x: 150,
          y: 0,
        }),
        createPromptNode({ id: 'next', title: 'Next', template: 'Tail', x: 300, y: 0 }),
      ],
      edges: [
        createEdge({
          id: 'source-to-scan-plain',
          source: 'source',
          target: 'scan-edit',
          sourceHandle: 'plainText',
          targetHandle: 'plainText',
        }),
        createEdge({
          id: 'scan-to-next-plain',
          source: 'scan-edit',
          target: 'next',
          sourceHandle: 'plainText',
          targetHandle: 'plainText',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        'scan-edit': {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        next: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        'source-to-scan-plain': { joinMode: 'newline' },
        'scan-to-next-plain': { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        'scan-edit': 'file-scan',
        next: 'file-next',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['scan-edit']).toEqual({
      textfield: 'Upstream text',
      plaintextContent: 'Upstream text',
      plainText: 'Upstream text',
      wysiwygContent: '',
    });
    expect(compiled.outputsByNode['next']).toEqual({
      textfield: 'Upstream text',
      plaintextContent: 'Upstream text',
      plainText: 'Upstream text',
      wysiwygContent: '',
    });
  });

  it('keeps explanatory plainText output to explanatory text while content appends upstream plainText', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Upstream text', x: 0, y: 0 }),
        createPromptNode({
          id: 'note',
          title: 'Explanatory',
          template: 'Additional note',
          x: 150,
          y: 0,
        }),
      ],
      edges: [
        createEdge({
          id: 'plain-flow',
          source: 'source',
          target: 'note',
          sourceHandle: 'plainText',
          targetHandle: 'plainText',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        note: {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        'plain-flow': { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        note: 'file-note',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['note']).toEqual({
      textfield: 'Upstream text\nAdditional note',
      plaintextContent: 'Upstream text\nAdditional note',
      plainText: 'Additional note',
      wysiwygContent: 'Additional note',
    });
  });

  it('merges explanatory node text with incoming textfield input', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Input text', x: 0, y: 0 }),
        createPromptNode({
          id: 'note',
          title: 'Explanatory',
          template: 'Additional note',
          x: 150,
          y: 0,
        }),
      ],
      edges: [
        createEdge({
          id: 'flow',
          source: 'source',
          target: 'note',
          sourceHandle: 'plaintextContent',
          targetHandle: 'plaintextContent',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        note: {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        flow: { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        note: 'file-note',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['note']).toEqual({
      textfield: 'Input text\nAdditional note',
      plaintextContent: 'Input text\nInput text\nAdditional note',
      plainText: 'Input text\nAdditional note',
      wysiwygContent: 'Additional note',
    });
    expect(compiled.prompt).toBe('Input text\nInput text\nAdditional note');
  });

  it('keeps explanatory content/plainText outputs as plain text when upstream content is HTML-formatted', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Alpha', x: 0, y: 0 }),
        createPromptNode({
          id: 'note',
          title: 'Explanatory',
          template: 'Additional note',
          x: 150,
          y: 0,
        }),
      ],
      edges: [
        createEdge({
          id: 'flow',
          source: 'source',
          target: 'note',
          sourceHandle: 'plaintextContent',
          targetHandle: 'plaintextContent',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
          textColor: '#ff0000',
        },
        note: {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
          textColor: '#00ff00',
        },
      },
      edgeMeta: {
        flow: { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        note: 'file-note',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');
    const noteOutputs = compiled.outputsByNode['note'];

    expect(noteOutputs).toEqual({
      textfield: '<span style="color: #ff0000;">Alpha</span>\nAdditional note',
      plaintextContent: 'Alpha\nAlpha\nAdditional note',
      plainText: 'Alpha\nAdditional note',
      wysiwygContent: 'Additional note',
    });
    expect(noteOutputs?.plaintextContent).not.toContain('<');
    expect(noteOutputs?.plainText).not.toContain('<');
  });

  it('does not mirror wysiwygText-only input into content/plainText outputs', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'source', title: 'Source', template: 'Input text', x: 0, y: 0 }),
        createPromptNode({ id: 'note', title: 'Explanatory', template: '', x: 150, y: 0 }),
      ],
      edges: [
        createEdge({
          id: 'flow',
          source: 'source',
          target: 'note',
          sourceHandle: 'wysiwygText',
          targetHandle: 'wysiwygText',
        }),
      ],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        note: {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        flow: { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
        note: 'file-note',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['note']).toEqual({
      textfield: 'Input text',
      plaintextContent: '',
      plainText: '',
      wysiwygContent: '',
    });
    expect(compiled.prompt).toBe('');
  });

  it('appends incoming WYSIWYGContent with explanatory node WYSIWYG text', () => {
    const graph: CaseResolverGraph = {
      nodes: [
        createPromptNode({ id: 'note-a', title: 'Note A', template: '<p>First</p>', x: 0, y: 0 }),
        createPromptNode({
          id: 'note-b',
          title: 'Note B',
          template: '<p>Second</p>',
          x: 180,
          y: 0,
        }),
      ],
      edges: [
        createEdge({
          id: 'wysiwyg-flow',
          source: 'note-a',
          target: 'note-b',
          sourceHandle: 'wysiwygContent',
          targetHandle: 'wysiwygContent',
        }),
      ],
      nodeMeta: {
        'note-a': {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
        'note-b': {
          role: 'explanatory',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        },
      },
      edgeMeta: {
        'wysiwyg-flow': { joinMode: 'newline' },
      },
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        'note-a': 'file-note-a',
        'note-b': 'file-note-b',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'note-a');

    expect(compiled.outputsByNode['note-a']?.wysiwygContent).toBe('<p>First</p>');
    expect(compiled.outputsByNode['note-b']?.wysiwygContent).toBe('<p>First</p>\n<p>Second</p>');
  });

  it('strips escaped HTML entities from plainText output', () => {
    const graph: CaseResolverGraph = {
      nodes: [createPromptNode({ id: 'source', title: 'Source', template: 'Alpha', x: 0, y: 0 })],
      edges: [],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '&lt;b&gt;',
          surroundSuffix: '&lt;/b&gt;',
        },
      },
      edgeMeta: {},
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['source']).toEqual({
      textfield: '&lt;b&gt;Alpha&lt;/b&gt;',
      plaintextContent: '&lt;b&gt;Alpha&lt;/b&gt;',
      plainText: 'Alpha',
      wysiwygContent: '',
    });
  });

  it('applies node-level trailing newline and text color wrappers', () => {
    const graph: CaseResolverGraph = {
      nodes: [createPromptNode({ id: 'source', title: 'Source', template: 'Alpha', x: 0, y: 0 })],
      edges: [],
      nodeMeta: {
        source: {
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
          appendTrailingNewline: true,
          textColor: '#ff0000',
        },
      },
      edgeMeta: {},
      pdfExtractionPresetId: 'plain_text',
      documentFileLinksByNode: {},
      documentDropNodeId: null,
      documentSourceFileIdByNode: {
        source: 'file-source',
      },
    };

    const compiled = compileCaseResolverPrompt(graph, 'source');

    expect(compiled.outputsByNode['source']).toEqual({
      textfield: 'Alpha\n',
      plaintextContent: '<span style="color: #ff0000;">Alpha\n</span>',
      plainText: 'Alpha',
      wysiwygContent: '',
    });
    expect(compiled.prompt).toBe('<span style="color: #ff0000;">Alpha\n</span>');
  });
});
