'use client';

import type { AgentPersonaMoodEditorController } from './agent-persona-mood-editor-controller.types';
import type { AgentPersonaMoodEditorProps } from './agent-persona-mood-editor.shared';
import { useAgentPersonaMoodEditorBase } from './use-agent-persona-mood-editor-base';
import { useMoodEditorUploadErrorLogger } from './use-mood-editor-persona-handlers';

export type { AgentPersonaMoodEditorController } from './agent-persona-mood-editor-controller.types';

export function useAgentPersonaMoodEditor(
  props: AgentPersonaMoodEditorProps
): AgentPersonaMoodEditorController {
  const base = useAgentPersonaMoodEditorBase(props);
  const logUploadError = useMoodEditorUploadErrorLogger();
  return { ...base, logUploadError };
}
