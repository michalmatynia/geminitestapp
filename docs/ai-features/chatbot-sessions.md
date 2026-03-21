---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: "active"
scope: "ai-features"
canonical: true
doc_type: 'technical-guide'
feature: 'chatbot'
---

# Chatbot — Sessions & Management Guide

Comprehensive guide to understanding, creating, and managing chatbot sessions.

## Session Lifecycle

```
User Creates Session
    ↓
Session Initialized (empty, no messages)
    ↓
User Sends First Message
    ↓
Message Added → Bot Responds → Response Added
    ↓
Session Active (ongoing conversation)
    ├─ User sends more messages
    ├─ Each message stored with timestamp
    ├─ Conversation history grows
    └─ Session metadata updated
    ↓
User Closes/Leaves Session
    ↓
Session Saved (messages persisted, history available)
    ├─ Can be reopened later
    ├─ All history restored
    └─ Conversation continues seamlessly
    ↓
[Optional] Session Archived/Deleted
    ├─ Archived: Kept for history, not in active list
    └─ Deleted: Removed permanently
```

## Session Structure

### Session Record

```typescript
interface ChatbotSession {
  // Identity
  id: string;
  userId: string;
  workspaceId: string;

  // Configuration
  title: string;
  description?: string;
  personaId: string;

  // Context settings
  contextMode: 'local' | 'global';
  customSystemPrompt?: string;

  // Model settings (can override global)
  modelId?: string;
  temperature?: number;

  // Content
  messages: ChatMessage[];
  messageCount: number;

  // Status & metadata
  status: "active"
scope: "ai-features"
canonical: true
  isStarred: boolean;
  tags: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;

  // Memory & learning
  shortTermMemory: {
    recentContext: string[];
    summarizedContext: string;
  };
  longTermMemoryIds: string[];

  // Stats
  stats: {
    totalMessages: number;
    userMessages: number;
    botMessages: number;
    averageResponseLength: number;
    averageResponseTime: number;
  };
}
```

### Message Record

```typescript
interface ChatMessage {
  // Identity
  id: string;
  sessionId: string;

  // Content
  role: 'user' | 'assistant';
  content: string;

  // Metadata
  tokenCount: number;
  timestamp: Date;

  // Extensions (if used)
  metadata?: {
    // For web search results
    searchResults?: {
      title: string;
      url: string;
      snippet: string;
    }[];
    sourceUrls?: string[];

    // For agent actions
    toolsUsed?: string[];
    toolResults?: Record<string, unknown>;

    // For image generation
    imagesGenerated?: {
      url: string;
      prompt: string;
    }[];

    // User feedback
    userFeedback?: 'helpful' | 'unhelpful' | 'inaccurate';
  };
}
```

## Creating a Session

### API Endpoint

```typescript
// POST /api/chatbot/sessions

interface CreateSessionRequest {
  title: string;
  personaId: string;
  contextMode?: 'local' | 'global';  // Default: 'local'
  description?: string;
}

interface CreateSessionResponse {
  id: string;
  title: string;
  personaId: string;
  messages: [];
  createdAt: Date;
}
```

### Hook Usage

```tsx
function CreateSessionUI() {
  const { createSession, loading } = useCreateSession();
  const [title, setTitle] = useState('');
  const [personaId, setPersonaId] = useState('');

  const handleCreate = async () => {
    const session = await createSession({
      title,
      personaId,
      contextMode: 'local',
    });

    // Navigate to new session
    router.push(`/chatbot/${session.id}`);
  };

  return (
    <form onSubmit={handleCreate}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session title"
      />
      <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
        {/* Persona options */}
      </select>
      <button type="submit" disabled={loading}>
        Create Session
      </button>
    </form>
  );
}
```

### What Happens During Creation

1. **Validate Input**: Title, persona exist, etc.
2. **Create Session Record**: Initialize empty session
3. **Set Defaults**: Apply persona's settings
4. **Store in Database**: Persist session
5. **Return to User**: Session ready for first message

---

## Loading a Session

### API Endpoint

```typescript
// GET /api/chatbot/sessions/:sessionId

interface LoadSessionResponse {
  session: ChatbotSession;
  messages: ChatMessage[];
  persona: AgentPersona;
}
```

### Hook Usage

```tsx
function ChatUI({ sessionId }: { sessionId: string }) {
  const { session, messages, loading } = useLoadSession(sessionId);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <header>{session.title}</header>
      <ChatHistory messages={messages} />
      <ChatInput sessionId={sessionId} />
    </div>
  );
}
```

### What Happens During Load

1. **Fetch Session**: Get session metadata
2. **Fetch Messages**: Load conversation history (paginated)
3. **Load Persona**: Get persona's settings
4. **Reconstruct Context**: Build conversation context
5. **Return Data**: Ready for interaction

### Message Pagination

```typescript
// Load messages in chunks
const firstBatch = await loadMessages({
  sessionId,
  offset: 0,
  limit: 20,
});

// Load older messages
const olderMessages = await loadMessages({
  sessionId,
  offset: 20,
  limit: 20,
});

// Results:
// mostRecent: [message19, message18, ..., message0]
// older: [message39, message38, ..., message20]
```

---

## Sending a Message

### Message Flow

```
User types message
    ↓
[SEND] Click send
    ↓
Add to session (optimistic update)
    ↓
Send to API
    ↓
API: Load context (session history + persona settings)
    ↓
API: Call LLM with context
    ↓
API: Stream response back
    ↓
[STREAM] Render response as it arrives
    ↓
API: Save complete response
    ↓
Complete message added to session
    ↓
Session updated on client
```

### Hook Usage

```tsx
function ChatInput({ sessionId }: { sessionId: string }) {
  const { sendMessage, loading, error } = useSendMessage();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    // Optimistic update: add message immediately
    addMessageToUI({
      role: 'user',
      content: input,
      status: "active"
scope: "ai-features"
canonical: true
    });

    try {
      // Send message
      const response = await sendMessage({
        sessionId,
        content: input,
      });

      // Update message status
      updateMessageStatus('sent');

      // Add bot response
      addMessageToUI({
        role: 'assistant',
        content: response.content,
        metadata: response.metadata,
      });

      setInput('');
    } catch (err) {
      // Show error
      updateMessageStatus('failed');
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSend}>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button type="submit" disabled={loading}>
        Send
      </button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </form>
  );
}
```

### API Processing

```typescript
// POST /api/chatbot/message

async function handleChatMessage(
  sessionId: string,
  messageContent: string
): Promise<ChatMessage> {
  // 1. Load session
  const session = await sessionRepository.get(sessionId);

  // 2. Add user message
  const userMessage = new ChatMessage({
    sessionId,
    role: 'user',
    content: messageContent,
    timestamp: new Date(),
  });
  await messageRepository.create(userMessage);

  // 3. Build context
  const context = {
    // Recent conversation
    conversationHistory: await getRecentMessages(sessionId, 20),
    // Session settings
    persona: await personaRepository.get(session.personaId),
    // Memory
    longTermMemory: await memoryRepository.getRelevantMemories(sessionId),
  };

  // 4. Generate response
  const response = await llm.complete({
    model: session.modelId || context.persona.model.modelId,
    temperature: session.temperature || context.persona.model.temperature,
    messages: buildPrompt(context, userMessage),
  });

  // 5. Create bot message
  const botMessage = new ChatMessage({
    sessionId,
    role: 'assistant',
    content: response.content,
    metadata: response.metadata,
    timestamp: new Date(),
  });
  await messageRepository.create(botMessage);

  // 6. Update session
  await sessionRepository.update(sessionId, {
    messageCount: session.messageCount + 2,
    lastActivityAt: new Date(),
  });

  // 7. Save to long-term memory (async)
  saveToMemory(sessionId, userMessage, botMessage);

  return botMessage;
}
```

---

## Context Management

### Local Context (Session-Only)

Used for focused conversations:

```typescript
// Only messages from THIS session
const contextPrompt = `
CONVERSATION HISTORY:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

USER: ${newMessage}

ASSISTANT:
`;

// Pros:
// ✅ Lightweight (fewer tokens)
// ✅ Fast (no external lookups)
// ✅ Focused (no noise from other sessions)

// Cons:
// ❌ No long-term learning
// ❌ Can't reference past sessions
// ❌ Limited reasoning
```

### Global Context (System + Session + Memory)

Used for comprehensive reasoning:

```typescript
// Includes everything
const contextPrompt = `
SYSTEM INSTRUCTIONS:
${systemPrompt}

YOUR LONG-TERM KNOWLEDGE:
${longTermMemory}

CONVERSATION HISTORY:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

USER: ${newMessage}

ASSISTANT:
`;

// Pros:
// ✅ Full context
// ✅ Can reference past sessions
// ✅ Better reasoning
// ✅ Learns from history

// Cons:
// ❌ More tokens (slower, more expensive)
// ❌ Larger prompt = slower response
// ❌ Can be noisy
```

### Choosing Context Mode

```typescript
interface ContextModeDecision {
  // Use LOCAL if:
  useLocal: {
    conditions: [
      'Quick, focused conversation needed',
      'Cost is important',
      'Speed is critical',
      'Session is independent',
    ],
  },

  // Use GLOBAL if:
  useGlobal: {
    conditions: [
      'Complex reasoning needed',
      'Needs to learn from history',
      'Multi-session context helps',
      'Persona customization important',
    ],
  },
};
```

---

## Session Management

### Listing Sessions

```typescript
// GET /api/chatbot/sessions?status=active&limit=20&offset=0

interface ListSessionsResponse {
  sessions: ChatbotSession[];
  total: number;
  hasMore: boolean;
}
```

### Updating Session

```typescript
// PUT /api/chatbot/sessions/:sessionId

interface UpdateSessionRequest {
  title?: string;
  description?: string;
  contextMode?: 'local' | 'global';
  modelId?: string;
  temperature?: number;
  isStarred?: boolean;
  tags?: string[];
}
```

### Archiving/Deleting Sessions

```typescript
// POST /api/chatbot/sessions/:sessionId/archive
// Keeps session but hides from active list

// DELETE /api/chatbot/sessions/:sessionId
// Permanently removes session
```

### Session Stats

```typescript
interface SessionStats {
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  averageResponseLength: number;    // words
  averageResponseTime: number;       // ms
  mostFrequentTopics: string[];
  sessionDuration: number;           // ms
  lastActivityAt: Date;
}

// Use for analytics and recommendations
```

---

## Memory in Sessions

### Short-term Memory (Session-specific)

Cached during conversation for efficiency:

```typescript
interface SessionShortTermMemory {
  // Recent messages (last 10)
  recentContext: string[];

  // Summarized context (for long conversations)
  summarizedContext: string;

  // User state
  currentTopic?: string;
  unresolved?: string[];

  // Session state
  messageCount: number;
  elapsedTime: number;
}

// Cleared when session closed
```

### Long-term Memory (Persistent)

Persists across sessions for learning:

```typescript
interface SessionMemory {
  // User preferences learned
  preferences: {
    tone: 'formal' | 'casual' | 'technical';
    verbosity: 'brief' | 'detailed' | 'balanced';
    responseFormat: 'bullet' | 'paragraph' | 'code';
  };

  // Topics discussed
  topics: {
    topic: string;
    frequency: number;
    lastDiscussed: Date;
  }[];

  // Successful conversation patterns
  patterns: {
    userQuery: string;
    successfulApproach: string;
    effectiveness: number;  // 0-100
  }[];

  // Known facts about user
  facts: {
    fact: string;
    confidence: number;  // 0-100
    source: string;
  }[];
}

// Persisted with session
// Used in future sessions
```

---

## Performance Optimization

### Message Caching

```typescript
// Cache recent messages
const messageCache = new Map<string, ChatMessage[]>();

async function getMessages(sessionId: string, limit: number) {
  const cached = messageCache.get(sessionId);

  if (cached && cached.length >= limit) {
    return cached.slice(0, limit);
  }

  // Fetch from database
  const messages = await messageRepository.getRecent(sessionId, limit);

  // Cache for next request
  messageCache.set(sessionId, messages);

  return messages;
}

// Clear cache on new message
on('message:created', ({ sessionId }) => {
  messageCache.delete(sessionId);
});
```

### Context Summarization

For long conversations, summarize old messages:

```typescript
async function summarizeOldMessages(sessionId: string): Promise<void> {
  const messages = await getMessages(sessionId, 100);

  // If more than 50 messages
  if (messages.length > 50) {
    // Summarize oldest 30
    const toSummarize = messages.slice(50, 80);

    const summary = await llm.complete({
      prompt: `Summarize this conversation:\n${toSummarize.join('\n')}`,
    });

    // Store summary
    await sessionRepository.update(sessionId, {
      shortTermMemory: {
        summarizedContext: summary,
        recentContext: messages.slice(0, 50),
      },
    });

    // Optionally archive old messages
    await messageRepository.archive(sessionId, toSummarize);
  }
}
```

### Query Optimization

```typescript
// Indexes to create:
db.sessions.createIndex({ userId: 1, createdAt: -1 });
db.sessions.createIndex({ status: "active"
scope: "ai-features"
canonical: true
db.messages.createIndex({ sessionId: 1, timestamp: -1 });
db.messages.createIndex({ sessionId: 1, role: 1 });

// Queries will be fast:
db.sessions.find({ userId, status: "active"
scope: "ai-features"
canonical: true
db.messages.find({ sessionId }).sort({ timestamp: -1 }).limit(20);
```

---

## Error Handling

### Message Send Failures

```typescript
// Network error
if (!navigator.onLine) {
  // Queue message for later
  await queueMessage({ sessionId, content });
  showNotification('Message queued - will send when online');
}

// API error
try {
  await sendMessage(sessionId, content);
} catch (error) {
  if (error.status === 400) {
    // Validation error (message too long, etc.)
    showError('Message validation failed');
  } else if (error.status === 429) {
    // Rate limited
    showNotification('Please wait before sending another message');
  } else if (error.status === 500) {
    // Server error
    showError('Service temporarily unavailable');
    queueMessage({ sessionId, content });
  }
}
```

### Session Loading Failures

```typescript
try {
  const session = await loadSession(sessionId);
} catch (error) {
  if (error.status === 404) {
    showError('Session not found');
    navigateToSessionList();
  } else if (error.status === 403) {
    showError('You do not have access to this session');
  } else {
    showError('Failed to load session');
    // Retry with backoff
    retryWithBackoff(() => loadSession(sessionId));
  }
}
```

---

## Best Practices

### Session Organization

- ✅ One session per topic/project
- ✅ Use descriptive titles
- ✅ Tag sessions for filtering
- ✅ Archive completed sessions
- ❌ Don't reuse sessions for unrelated topics
- ❌ Don't leave sessions untitled

### Context Selection

- ✅ Use LOCAL for quick questions
- ✅ Use GLOBAL for complex reasoning
- ✅ Switch modes as needed
- ✅ Monitor token usage
- ❌ Don't always use GLOBAL (costs more)
- ❌ Don't mix unrelated topics in one session

### Memory Management

- ✅ Clear old sessions periodically
- ✅ Archive completed sessions
- ✅ Export important sessions
- ✅ Review long-term memory periodically
- ❌ Don't keep unlimited message history
- ❌ Don't save sensitive data in long-term memory

---

## Next Steps

1. **Context Modes**: See `chatbot-context.md`
2. **API Reference**: See `chatbot-api.md`
3. **Memory Systems**: See `chatbot-memory.md`

---

**Last Updated:** 2026-03-21
**Status:** Complete sessions guide
**Related Docs:** Chatbot overview, Context guide, Memory systems

