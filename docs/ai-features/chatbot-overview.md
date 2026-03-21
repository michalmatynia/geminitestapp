---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'feature-guide'
feature: 'chatbot'
---

# Chatbot — Feature Overview

The Chatbot is an AI-powered conversational interface with session management, persona support, context awareness, memory capabilities, and optional extensions like web search and agent browsing.

## Feature Overview

The chatbot enables multi-turn conversations with intelligent context management:

- **Sessions**: Separate conversation threads, each with independent history
- **Personas**: Pre-configured bot personalities with unique behaviors
- **Context**: Local (session-specific) and global (system-wide) context injection
- **Memory**: Persistent conversation history and learned patterns
- **Extensions**: Optional web search and agent-browser integration

## Architecture

```
┌────────────────────────────────────────────────────┐
│  Chatbot System                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  Admin Pages                                      │
│  ├─ AdminChatbotPage (main chat)                 │
│  ├─ AdminChatbotSessionsPage (session list)      │
│  ├─ AdminChatbotContextPage (context manager)    │
│  └─ AdminChatbotMemoryPage (memory viewer)       │
│                                                    │
│  Context Layer (Split into 4 domains)            │
│  ├─ MessagesContext (conversation history)       │
│  ├─ SettingsContext (bot config)                 │
│  ├─ SessionsContext (session management)         │
│  └─ UIContext (UI state)                         │
│                                                    │
│  Hooks (14 total)                                │
│  ├─ useMessages() / useMessagesState()            │
│  ├─ useSettings() / useSettingsState()            │
│  ├─ useSessions() / useSessionsState()            │
│  ├─ useUI() / useUIState()                        │
│  └─ Custom: useSendMessage, useLoadMore, etc.    │
│                                                    │
│  API Layer                                        │
│  ├─ POST /api/chatbot/message (send message)     │
│  ├─ GET /api/chatbot/sessions (list sessions)    │
│  ├─ POST /api/chatbot/sessions (create)          │
│  └─ DELETE /api/chatbot/sessions/:id (delete)   │
│                                                    │
│  Services (Repository Layer)                      │
│  ├─ ChatbotSessionRepository (CRUD)              │
│  └─ ChatbotJobRepository (async jobs)            │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Core Concepts

### Sessions

Each session is an independent conversation thread:

```
Session A: "Tell me about React"
├─ Message 1 (user): "What is React?"
├─ Message 2 (bot): "React is a JavaScript library..."
└─ Message 3 (user): "How do I install it?"

Session B: "JavaScript basics"
├─ Message 1 (user): "What is a closure?"
├─ Message 2 (bot): "A closure is a function that..."
└─ ...
```

**Session Record**:
```typescript
interface ChatbotSession {
  id: string;
  title: string;
  personaId: string;
  messages: ChatMessage[];
  contextMode: 'local' | 'global';
  createdAt: Date;
  updatedAt: Date;
}
```

### Personas

Pre-configured bot personalities with behavior templates:

| Persona | Behavior | Use Case |
|---------|----------|----------|
| Assistant | Helpful, professional | General tasks |
| Expert | In-depth analysis | Technical questions |
| Tutor | Explanatory, patient | Learning |
| Creative | Imaginative, flexible | Brainstorming |

**Persona Record**:
```typescript
interface ChatbotPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
}
```

### Context Modes

**Local Context** (session-specific):
- Uses only messages from current session
- Best for focused conversations
- Lighter token usage
- Faster responses

**Global Context** (system-wide):
- Includes system instructions and knowledge base
- Best for complex requests
- Better reasoning capability
- Higher token usage

Configuration:
```typescript
interface ChatbotContextMode {
  mode: 'local' | 'global';
  includeSystemPrompt: boolean;
  includeKnowledgeBase: boolean;
  maxContextTokens: number;
}
```

### Message Structure

```typescript
interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    searchResults?: SearchResult[];
    sourceUrls?: string[];
    tokens?: number;
    generatedAt?: Date;
  };
}
```

### Memory

**Conversation History**: Stored with each session
**Learned Patterns**: Persistent across sessions
- User preferences
- Common topics
- Interaction history

Memory is used to:
- Provide personalized responses
- Remember user context
- Optimize future conversations
- Improve response relevance

---

## Typical Workflows

### Creating a New Conversation

```
1. User clicks "New Chat"
2. System creates Session with selected Persona
3. User sees empty message list
4. User types first message
5. Message sent → API call → Bot responds
6. Response added to message list
7. Session auto-saved
```

### Switching Sessions

```
1. User clicks session in sidebar
2. System loads Session (messages, context)
3. Message list updates
4. User can continue conversation
```

### Using Web Search Extension

```
1. Conversation starts with web search enabled
2. User: "What's the latest news about AI?"
3. Bot detects need for current information
4. Triggers web search tool
5. Collects search results
6. Incorporates results in response
7. Shows source URLs in metadata
```

### Applying Global Context

```
1. Session context mode set to 'global'
2. User message sent
3. System loads:
   - Session messages
   - System prompt
   - Knowledge base
   - Recent user history
4. Bot generates response with full context
5. Response is more thorough and informed
```

---

## Settings & Configuration

### Bot Settings

```typescript
interface ChatbotSettings {
  // Model selection
  modelId: string;
  temperature: number;  // 0.0 - 2.0
  maxTokens: number;

  // Behavior
  personaId: string;
  contextMode: 'local' | 'global';

  // Extensions
  enableWebSearch: boolean;
  enableAgentBrowser: boolean;

  // Safety
  profanityFilter: boolean;
  contentFilter: boolean;
}
```

### Per-Session Overrides

Sessions can override global settings:
- Different persona per session
- Different context mode
- Different temperature for creative vs analytical

---

## Key Files

### Pages
- `src/features/ai/chatbot/pages/AdminChatbotPage.tsx` — Main chat interface
- `src/features/ai/chatbot/pages/AdminChatbotSessionsPage.tsx` — Session list
- `src/features/ai/chatbot/pages/AdminChatbotContextPage.tsx` — Context manager
- `src/features/ai/chatbot/pages/AdminChatbotMemoryPage.tsx` — Memory viewer

### Context & State
- `src/features/ai/chatbot/context/ChatbotContext.tsx` — Main context provider
  - MessagesContext
  - SettingsContext
  - SessionsContext
  - UIContext

### Hooks (14 total)
- `src/features/ai/chatbot/hooks/` — All custom hooks
- Key: `useSendMessage`, `useLoadMore`, `useCreateSession`, `useLoadSession`

### API
- `src/features/ai/chatbot/api/chat.ts` — Client API for sending messages
- Routes: `POST /api/chatbot/message`, `GET /api/chatbot/sessions`, etc.

### Services
- `src/features/ai/chatbot/services/` — Repository layer for data access

---

## Integration Points

### With Agent Creator
- Chatbot uses personas defined in Agent Creator
- Persona changes reflected in bot behavior
- Memory settings inherited from persona configuration

### With Image Studio
- Chatbot can reference generated images
- Image metadata included in context
- Generate images from chat descriptions

### With AI Paths
- Chatbot results can feed into AI Path executions
- Conversation history used as context for automations

---

## Common Tasks

### Send a Message
```tsx
const { sendMessage, loading } = useSendMessage();

await sendMessage({
  sessionId: 'session-123',
  content: 'What is React?',
});
```

### Load Session
```tsx
const { session, messages } = useLoadSession(sessionId);

// Use session.title, messages array, etc.
```

### Create New Session
```tsx
const { createSession } = useCreateSession();

const newSession = await createSession({
  title: 'React Questions',
  personaId: 'tutor',
  contextMode: 'local',
});
```

### Update Settings
```tsx
const { updateSettings } = useSettingsState();

await updateSettings({
  temperature: 0.7,
  enableWebSearch: true,
});
```

---

## Performance & Optimization

### Message Streaming
- Responses stream in real-time
- UI updates as tokens arrive
- Better UX for long responses

### Context Pagination
- Messages paginated (load 20 per request)
- "Load More" button for older messages
- Reduces initial load time

### Session Lazy Loading
- Session list shows only metadata
- Full message history loaded on demand
- Caching prevents re-fetching

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot not responding | API timeout | Check network, increase timeout |
| Context too large | Global context + long history | Switch to local context mode |
| Memory not persisting | Session not saved | Check save button, refresh page |
| Web search not working | Search not enabled | Enable in settings |

---

## Next Steps

1. **Sessions & Management**: How to organize conversations
2. **Personas & Configuration**: Creating custom bot personalities
3. **Context Modes**: Local vs global context trade-offs
4. **Memory System**: Using conversation history effectively
5. **API Reference**: Detailed endpoint documentation

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive feature overview
**Related Docs:** AI Features README, Agent Creator overview, Image Studio overview

