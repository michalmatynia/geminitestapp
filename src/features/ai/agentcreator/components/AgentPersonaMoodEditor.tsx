'use client';

import React from 'react';

import { AgentPersonaMoodEditorView } from './AgentPersonaMoodEditorView';
import type { AgentPersonaMoodEditorProps } from './mood-editor/agent-persona-mood-editor.shared';
import { useAgentPersonaMoodEditor } from './mood-editor/use-agent-persona-mood-editor';

export function AgentPersonaMoodEditor(props: AgentPersonaMoodEditorProps): React.JSX.Element {
  const editor = useAgentPersonaMoodEditor(props);
  return <AgentPersonaMoodEditorView editor={editor} />;
}
