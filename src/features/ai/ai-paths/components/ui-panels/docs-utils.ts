import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';

type AiPathsNodeDocEntry = (typeof AI_PATHS_NODE_DOCS)[number];

export const DOCS_COPY_SYSTEM_OVERVIEW_LINES = [
  'Graphs run from a Trigger node and propagate data through connected ports.',
  'Ports are strict and type-safe by name: result -> result, images -> images.',
  'Multiple wires into the same input are collected as arrays; the runtime resolves the first value for single-input nodes.',
  'Image data travels as image URLs (not raw files), and the Model node converts URLs to base64 when calling the model.',
  'Outbound URL policy blocks local/private image URLs before model calls.',
];

export const DOCS_COPY_EXECUTION_STATE_LINES = [
  'Trigger fires the graph evaluation.',
  'Model, Database, HTTP, Delay run at most once per graph run.',
  'Runtime outputs are stored per node.',
  'Path canvas state and palette group collapse state are persisted per-user.',
];

export const DOCS_COPY_KEYBOARD_SHORTCUTS_LINES = [
  'Use Select tool to draw a selection rectangle.',
  'Shift/Cmd/Ctrl+click toggles selection. Ctrl/Cmd+A selects all nodes.',
  'Ctrl/Cmd+C copy, Ctrl/Cmd+X cut, Ctrl/Cmd+V paste, Ctrl/Cmd+D duplicate.',
];

export const DOCS_COPY_PORT_RULES_LINES = [
  'Ports must match exactly (e.g. result -> result).',
  'Trigger is initiator-only; context/meta/entity ports come from Fetcher.',
  'Context Filter accepts explicit context input from upstream nodes (typically Fetcher).',
  'Viewer is terminal (no outputs).',
  'Simulation trigger input only accepts trigger from Trigger.',
  'Multiple wires into the same input are collected as arrays.',
  'Gate expects valid from a Validator or Validation Pattern node.',
];

export const DOCS_COPY_TROUBLESHOOTING_LINES = [
  'No result in Viewer: check port names match (e.g. result -> result).',
  'Model node does nothing: ensure Prompt output is connected and non-empty.',
  'Poll node stuck: confirm a jobId is wired in AI Job mode, or query config is correct in Database mode.',
  'Database update missing entityId: wire Parser.productId or entityId into Database.entityId.',
  'Images not detected: images must be URL strings.',
  'Connection rejected: ports must match exactly and node types must be compatible.',
];

const buildNodeDocClipboardSection = (
  doc: AiPathsNodeDocEntry,
  nodeJsonSnippetByType: Record<string, string>,
): string => {
  const lines: string[] = [
    `## Node: ${doc.title} (${doc.type})`,
    '',
    `Purpose: ${doc.purpose}`,
    '',
    `Inputs: ${doc.inputs.length ? doc.inputs.join(', ') : 'None'}`,
    `Outputs: ${doc.outputs.length ? doc.outputs.join(', ') : 'None'}`,
    '',
    '### Configuration',
  ];
  if (doc.config.length === 0) {
    lines.push('- None documented.');
  } else {
    doc.config.forEach((field) => {
      lines.push(
        `- ${field.path}: ${field.description}${field.defaultValue !== undefined ? ` (default: ${field.defaultValue})` : ''}`,
      );
    });
  }
  if (doc.notes?.length) {
    lines.push('', '### Notes');
    doc.notes.forEach((note) => {
      lines.push(`- ${note}`);
    });
  }
  lines.push('', '### JSON Snippet', '```json', nodeJsonSnippetByType[doc.type] ?? '{}', '```');
  return lines.join('\\n');
};

export const buildFullDocumentationClipboardText = (args: {
  docsOverviewSnippet: string;
  docsWiringSnippet: string;
  docsDescriptionSnippet: string;
  docsJobsSnippet: string;
  executionControlsText: string[];
  nodeJsonSnippetByType: Record<string, string>;
}): string => {
  const {
    docsOverviewSnippet,
    docsWiringSnippet,
    docsDescriptionSnippet,
    docsJobsSnippet,
    executionControlsText,
    nodeJsonSnippetByType,
  } = args;

  const sections: string[] = [
    '# AI Paths Documentation',
    '',
    '## How AI Paths Works',
    '```text',
    docsOverviewSnippet,
    '```',
    '',
    '## System Overview',
    ...DOCS_COPY_SYSTEM_OVERVIEW_LINES.map((line) => `- ${line}`),
    '',
    '## Execution & State',
    ...DOCS_COPY_EXECUTION_STATE_LINES.map((line) => `- ${line}`),
    '',
    '## Execution Controls',
    ...executionControlsText.map((line) => `- ${line}`),
    '',
    '## Keyboard Shortcuts',
    ...DOCS_COPY_KEYBOARD_SHORTCUTS_LINES.map((line) => `- ${line}`),
    '',
    '## Port Rules',
    ...DOCS_COPY_PORT_RULES_LINES.map((line) => `- ${line}`),
    '',
    '## Quick Wiring',
    '```text',
    docsWiringSnippet,
    '```',
    '',
    '## AI Description Wiring',
    '```text',
    docsDescriptionSnippet,
    '```',
    '',
    '## AI Job Wiring',
    '```text',
    docsJobsSnippet,
    '```',
    '',
    '## Troubleshooting',
    ...DOCS_COPY_TROUBLESHOOTING_LINES.map((line) => `- ${line}`),
    '',
    '# Node Documentation',
    '',
  ];

  const nodeSections = AI_PATHS_NODE_DOCS
    .map((doc) => buildNodeDocClipboardSection(doc, nodeJsonSnippetByType))
    .join('\\n\\n');
  sections.push(nodeSections);
  sections.push('');
  return sections.join('\\n');
};
