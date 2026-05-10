import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/components.ts';

export const componentNodesPart1: ContextNode[] = [
  {
    id: 'component:context-registry-inspector',
    kind: 'component',
    name: 'ContextRegistryInspector',
    description:
      'Inspector workspace used by the admin Context Registry page. Presents searchable nodes, ' +
      'relationship previews, bundle envelopes, runtime document inspection, and AI tool metadata.',
    tags: ['ai', 'context', 'registry', 'inspector', 'admin'],
    relationships: [{ type: 'uses', targetId: 'page:context-registry' }],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:cms-page-builder-preview',
    kind: 'component',
    name: 'CmsPageBuilderPreview',
    description:
      'Primary live preview canvas in the CMS page builder. Renders the current page structure, ' +
      'drag-and-drop surface, responsive preview state, and persisted theme context.',
    tags: ['cms', 'page-builder', 'preview', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'reads', targetId: 'collection:cms-pages' },
      { type: 'reads', targetId: 'collection:cms-themes' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:cms-page-builder-inspector',
    kind: 'component',
    name: 'CmsPageBuilderInspector',
    description:
      'Right-hand inspector in the CMS page builder for editing selected page, section, block, ' +
      'and AI-assisted settings.',
    tags: ['cms', 'page-builder', 'inspector', 'ai', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'uses', targetId: 'action:cms-css-ai-stream' },
      { type: 'reads', targetId: 'collection:cms-pages' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:cms-theme-settings-panel',
    kind: 'component',
    name: 'CmsThemeSettingsPanel',
    description:
      'Theme editing panel used inside the CMS page builder for color schemes, typography, layout, ' +
      'branding, and AI-assisted theme generation.',
    tags: ['cms', 'theme', 'settings', 'ai', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'uses', targetId: 'action:cms-css-ai-stream' },
      { type: 'reads', targetId: 'collection:cms-themes' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:agent-teaching-chat-panel',
    kind: 'component',
    name: 'AgentTeachingChatPanel',
    description:
      'Chat workspace in Agent Creator used to select learner agents, send questions, and inspect retrieved sources.',
    tags: ['agent-creator', 'teaching', 'chat', 'rag'],
    relationships: [
      { type: 'uses', targetId: 'page:agent-teaching-chat' },
      { type: 'uses', targetId: 'action:agent-teaching-chat' },
      { type: 'reads', targetId: 'collection:agent-teaching-agents' },
      { type: 'reads', targetId: 'collection:agent-teaching-embedding-collections' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:chatbot-chat-interface',
    kind: 'component',
    name: 'ChatbotChatInterface',
    description:
      'Primary chat panel in the admin Chatbot workspace for viewing the active conversation and sending messages.',
    tags: ['chatbot', 'admin', 'chat', 'conversation'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:chatbot-session-sidebar',
    kind: 'component',
    name: 'ChatbotSessionSidebar',
    description:
      'Session navigation column for browsing, creating, selecting, and deleting chatbot conversations.',
    tags: ['chatbot', 'admin', 'sessions', 'sidebar'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:chatbot-settings-panel',
    kind: 'component',
    name: 'ChatbotSettingsPanel',
    description:
      'Settings tab in the admin Chatbot workspace for persona selection, web search, and operator-authored context.',
    tags: ['chatbot', 'admin', 'settings', 'context'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:chatbot-debug-panel',
    kind: 'component',
    name: 'ChatbotDebugPanel',
    description:
      'Debug panel in the admin Chatbot workspace for recent run state, diagnostics, and agent execution visibility.',
    tags: ['chatbot', 'admin', 'debug', 'agent'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:kangur-lesson-narrator',
    kind: 'component',
    name: 'KangurLessonNarrator',
    description:
      'Learner-facing narration control used in Kangur lessons and tests to request server-side lesson audio or browser fallback playback.',
    tags: ['kangur', 'tts', 'narration', 'learner', 'audio'],
    relationships: [
      { type: 'uses', targetId: 'page:kangur-lessons' },
      { type: 'uses', targetId: 'page:kangur-tests' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
      { type: 'reads', targetId: 'collection:kangur-lessons' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:kangur-lesson-narration-panel',
    kind: 'component',
    name: 'KangurLessonNarrationPanel',
    description:
      'Admin lesson-editor narration preview panel for choosing voice, previewing generated audio, and checking cached Kangur lesson narration.',
    tags: ['kangur', 'tts', 'narration', 'admin', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:kangur-admin-lessons-manager' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
      { type: 'reads', targetId: 'collection:kangur-lessons' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
