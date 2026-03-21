---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: "active"
scope: "ai-features"
canonical: true
doc_type: 'technical-guide'
feature: 'chatbot'
---

# Chatbot — Context Modes Deep Dive

Comprehensive guide to understanding, choosing, and optimizing context modes in the chatbot.

## Context Modes Comparison

| Aspect | Local Context | Global Context |
|--------|---------------|-----------------|
| **What's Included** | Session messages only | System + session + memory |
| **Token Count** | 500-2,000 | 2,000-8,000 |
| **Response Time** | 0.5-2 sec | 1-5 sec |
| **Cost Per 10 Msgs** | ~$0.01 | ~$0.10 |
| **When to Use** | Quick Q&A, focused chat | Complex tasks, learning |
| **Reasoning Quality** | Good | Excellent |
| **Scalability** | Excellent | Good |

---

## Mode 1: Local Context

### What It Includes

Local context contains ONLY information from the current session:

```typescript
interface LocalContext {
  // Session identification
  sessionTitle: string;
  sessionDescription?: string;

  // Conversation history (from this session only)
  messages: ChatMessage[];

  // Optimization: recent window
  recentMessages: ChatMessage[];  // Last 10-20 messages

  // Current user request
  userMessage: string;
}

// Explicitly EXCLUDES:
// ❌ System instructions (persona details)
// ❌ Long-term memory (patterns, preferences)
// ❌ Other sessions (conversation history)
// ❌ Knowledge base (external info)
// ❌ Agent system prompt
```

### Implementation

```typescript
async function buildLocalPrompt(
  session: ChatbotSession,
  newMessage: string
): Promise<string> {
  // Use only recent messages for efficiency
  const windowSize = 20;
  const recentMessages = session.messages.slice(-windowSize);

  // Count tokens to ensure we stay under limit
  const tokenCount = countTokens(
    session.title +
    recentMessages.map(m => m.content).join('\n')
  );

  // If too many tokens, summarize older messages
  if (tokenCount > 1500) {
    const toSummarize = recentMessages.slice(0, -10);
    const summary = await summarizeMessages(toSummarize);
    recentMessages = [
      new ChatMessage({
        role: 'system',
        content: `Earlier conversation summary: ${summary}`,
      }),
      ...recentMessages.slice(-10),
    ];
  }

  // Build prompt
  return `Session: ${session.title}

Conversation:
${recentMessages
  .map(m => `${m.role}: ${m.content}`)
  .join('\n\n')}

User: ${newMessage}`;
}
```

### Characteristics

**Pros:**
- ✅ Fast (low token count, quick inference)
- ✅ Cheap (fewer tokens = lower cost)
- ✅ Focused (no noise from other sessions)
- ✅ Private (doesn't access system-wide data)
- ✅ Scalable (works with many concurrent users)
- ✅ Deterministic (same session always same context)

**Cons:**
- ❌ No learning across sessions
- ❌ Can't reference past conversations
- ❌ Limited reasoning depth
- ❌ No access to system instructions
- ❌ Loses context if session very long
- ❌ No user preferences available

### When to Use Local Context

**Best for:**
- Quick questions and answers
- Focused topic discussions
- Real-time chat (speed matters)
- Budget-conscious applications
- Independent conversations
- Privacy-sensitive scenarios
- Multi-user scenarios (many concurrent)

**Example scenarios:**
- Customer asking "What's your refund policy?" → Ask system directly
- User: "Summarize our conversation" → Have full session context
- Quick fact lookup → Don't need history
- First message in new session → No history anyway

---

## Mode 2: Global Context

### What It Includes

Global context combines session information with system-wide data:

```typescript
interface GlobalContext {
  // System level (always included)
  systemInstructions: string;        // Persona system prompt
  agentPersonality: AgentPersona;    // Traits, behavior, expertise

  // User level (long-term)
  longTermMemory: Memory[];          // Patterns, preferences, facts
  pastSessions: SessionSummary[];    // Recent session summaries
  userProfile: UserProfile;          // Known info about user

  // Session level (current)
  sessionTitle: string;
  messages: ChatMessage[];           // All or recent messages
  recentMessages: ChatMessage[];     // Last 10-20 messages

  // External (optional)
  knowledgeBase?: KnowledgeEntry[];  // Relevant docs
  contextualInstructions?: string;   // Task-specific instructions

  // Current request
  userMessage: string;
}
```

### Implementation

```typescript
async function buildGlobalPrompt(
  session: ChatbotSession,
  newMessage: string,
  userId: string
): Promise<string> {
  // Load all context sources in parallel
  const [persona, longTermMemory, recentMessages] = await Promise.all([
    personaRepository.get(session.personaId),
    memoryRepository.getRelevant(userId, session.personaId),
    getRecentMessages(session.id, 20),
  ]);

  // Count tokens carefully (max 6000-8000)
  let totalTokens = 0;
  const tokenBudget = 7000;

  // 1. System context (most important)
  const systemSection = `
SYSTEM INSTRUCTIONS:
${persona.systemPrompt}

YOUR PERSONALITY:
${Object.entries(persona.personality)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}`;
  totalTokens += countTokens(systemSection);

  // 2. Long-term memory (if room)
  let memorySection = '';
  if (totalTokens < tokenBudget * 0.5) {
    memorySection = `
YOUR KNOWLEDGE ABOUT THE USER:
${longTermMemory
  .slice(0, 5) // Top 5 memories
  .map(m => m.content)
  .join('\n')}`;
    totalTokens += countTokens(memorySection);
  }

  // 3. Recent conversation (remaining space)
  const conversationSection = `
CONVERSATION:
${recentMessages
  .map(m => `${m.role}: ${m.content}`)
  .join('\n\n')}`;
  totalTokens += countTokens(conversationSection);

  // Build final prompt
  return systemSection + memorySection + conversationSection + `\n\nUser: ${newMessage}`;
}
```

### Characteristics

**Pros:**
- ✅ Comprehensive reasoning (full context)
- ✅ Learns from history (remembers preferences)
- ✅ Can reference past sessions
- ✅ Applies system instructions consistently
- ✅ Better user experience (remembers user)
- ✅ More intelligent responses

**Cons:**
- ❌ Slower (more tokens to process)
- ❌ More expensive (higher token count)
- ❌ Potential privacy concerns
- ❌ Can be noisy (conflicting context)
- ❌ Memory management overhead
- ❌ Harder to scale (more data per user)

### When to Use Global Context

**Best for:**
- Complex multi-step tasks
- Personalized responses
- Learning from user behavior
- Deep reasoning needed
- Long-term relationships
- Contextual expertise required

**Example scenarios:**
- "Create a plan based on our past projects" → Need session history + memory
- "What did I ask last week?" → Need to reference past sessions
- "Recommend something for my use case" → Need user profile + memory
- Complex analysis → Need full system context

---

## Decision Framework

### Quick Decision Tree

```
Does the user need complex reasoning?
├─ YES
│  └─ Does cost matter more than quality?
│     ├─ YES  → Consider LOCAL with summarization
│     └─ NO   → Use GLOBAL
└─ NO
   ├─ Is speed critical?
   │  ├─ YES  → Use LOCAL
   │  └─ NO   → Either works, lean LOCAL for cost
   └─ End
```

### Decision Matrix

| Scenario | Local | Global | Why |
|----------|-------|--------|-----|
| Quick FAQ answer | ✅✅ | ✅ | Local is fast enough |
| Multi-turn problem solving | ✅ | ✅✅ | Global gives better reasoning |
| Learning from user | ❌ | ✅✅ | Need memory |
| First message | ✅✅ | ✅ | No history yet |
| Returning user | ✅ | ✅✅ | Global uses memory |
| Budget constrained | ✅✅ | ⚠️ | Local is cheaper |
| Speed critical | ✅✅ | ✅ | Local is faster |
| Complex analysis | ✅ | ✅✅ | Global gives better results |

---

## Implementation Examples

### Example 1: Default to Local

```tsx
function ChatInput({ sessionId }) {
  const [message, setMessage] = useState('');

  // Default: LOCAL context (fast, cheap)
  const { sendMessage } = useSendMessage({
    contextMode: 'local',  // Default
  });

  const handleSend = async () => {
    await sendMessage({
      sessionId,
      content: message,
    });
  };

  return (
    <form onSubmit={handleSend}>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      <button type="submit">Send</button>
    </form>
  );
}
```

### Example 2: Switch Based on Complexity

```tsx
function ChatInput({ sessionId, messageCount }) {
  const [message, setMessage] = useState('');

  // Switch modes based on conversation length
  const contextMode = messageCount > 10 ? 'global' : 'local';

  const { sendMessage } = useSendMessage({ contextMode });

  const handleSend = async () => {
    await sendMessage({
      sessionId,
      content: message,
    });
  };

  return (
    <form onSubmit={handleSend}>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      <p>Mode: {contextMode}</p>
      <button type="submit">Send</button>
    </form>
  );
}
```

### Example 3: User-Controlled

```tsx
function ChatUI({ sessionId }) {
  const [contextMode, setContextMode] = useState<'local' | 'global'>('local');

  const { sendMessage } = useSendMessage({ contextMode });

  return (
    <div>
      <div className="controls">
        <label>
          <input
            type="radio"
            value="local"
            checked={contextMode === 'local'}
            onChange={(e) => setContextMode('local')}
          />
          Local (Fast, Cheap)
        </label>
        <label>
          <input
            type="radio"
            value="global"
            checked={contextMode === 'global'}
            onChange={(e) => setContextMode('global')}
          />
          Global (Comprehensive)
        </label>
      </div>
      <ChatMessages sessionId={sessionId} />
      <ChatInput sessionId={sessionId} />
    </div>
  );
}
```

---

## Performance Metrics

### Token Usage Comparison

```
Message: "What's 2+2?"

LOCAL:
├─ Session: 50 tokens
├─ Recent messages (10): 200 tokens
└─ User message: 5 tokens
TOTAL: ~255 tokens
Cost: ~$0.003

GLOBAL:
├─ System instructions: 300 tokens
├─ Long-term memory: 400 tokens
├─ Recent messages (10): 200 tokens
├─ User message: 5 tokens
└─ Other metadata: 100 tokens
TOTAL: ~1,005 tokens
Cost: ~$0.012
```

### Response Time Comparison

```
LOCAL:
Input tokens:    255
Processing:      ~0.5s (inference with small context)
Output generation: ~1.0s
TOTAL:           ~1.5s

GLOBAL:
Input tokens:    1,005
Processing:      ~2.0s (inference with large context)
Output generation: ~2.0s
TOTAL:           ~4.0s
```

---

## Best Practices

### For Performance

- Start with LOCAL context
- Switch to GLOBAL only when needed
- Use message summarization for long sessions
- Implement token counting and limits
- Cache recently used contexts

### For Cost

- Default to LOCAL (10x cheaper)
- Batch GLOBAL requests (use sparingly)
- Monitor token usage per session
- Archive old sessions to reduce memory load
- Use cost budgets per user/session

### For Quality

- Use GLOBAL for complex tasks
- Ensure long-term memory is accurate
- Test both modes for your use case
- Monitor user satisfaction by mode
- Adjust thresholds based on feedback

### For Scalability

- Monitor memory usage with GLOBAL
- Implement purging of old memories
- Use LOCAL for high-traffic scenarios
- Consider hybrid approach (adaptive mode)
- Plan for GLOBAL mode growth

---

## Troubleshooting

### Problem: Slow Responses

```
Symptom: Average response time > 3 seconds
Cause: Likely using GLOBAL context unnecessarily

Solutions:
1. Check if GLOBAL is needed for this use case
2. Switch to LOCAL context
3. Reduce long-term memory loaded (top 3 instead of 10)
4. Implement message summarization
```

### Problem: High Costs

```
Symptom: Higher than expected API costs
Cause: Likely using GLOBAL context too much

Solutions:
1. Switch sessions to LOCAL by default
2. Use GLOBAL only for complex scenarios
3. Implement cost budgets
4. Monitor GLOBAL usage patterns
```

### Problem: Lost Context

```
Symptom: Bot doesn't remember user preferences
Cause: Using LOCAL context, memories not saving

Solutions:
1. Switch to GLOBAL context
2. Verify long-term memory is being saved
3. Check memory retention policies
4. Test memory loading in GLOBAL mode
```

### Problem: Conflicting Information

```
Symptom: Bot contradicts itself from earlier in chat
Cause: GLOBAL context includes conflicting memories

Solutions:
1. Review long-term memory accuracy
2. Prune outdated memories
3. Increase system instruction priority in prompt
4. Test memory loading and selection
```

---

## Advanced Patterns

### Hybrid Mode (Adaptive)

```typescript
async function chooseContextMode(
  session: ChatbotSession,
  userMessage: string
): Promise<'local' | 'global'> {
  // Analyze message complexity
  const complexity = analyzeComplexity(userMessage);
  const isPersonalQuestion = checkIfPersonal(userMessage);
  const requiresMemory = requiresLongTermMemory(userMessage);

  // Decide mode
  if (requiresMemory || (complexity > 0.7 && isPersonalQuestion)) {
    return 'global';  // Complex + personal
  } else if (complexity > 0.5) {
    return 'global';  // Complex enough to warrant full context
  } else {
    return 'local';   // Simple question, local is fine
  }
}
```

### Progressive Enhancement

```typescript
// Start with LOCAL, upgrade to GLOBAL if needed
async function sendMessageProgressive(
  session: ChatbotSession,
  message: string
): Promise<ChatMessage> {
  // Try LOCAL first
  const localResponse = await sendWithContext({
    session,
    message,
    contextMode: 'local',
  });

  // Check if response quality is low
  const quality = evaluateQuality(localResponse);
  if (quality.score < 0.6) {
    // Retry with GLOBAL
    return sendWithContext({
      session,
      message,
      contextMode: 'global',
    });
  }

  return localResponse;
}
```

---

## Next Steps

1. **Choosing Your Mode**: Consult decision matrix above
2. **Implementation**: See `chatbot-overview.md` for API details
3. **Memory Management**: See `chatbot-memory.md` (coming soon)
4. **Session Management**: See `chatbot-sessions.md`

---

**Last Updated:** 2026-03-21
**Status:** Complete context modes guide
**Related Docs:** Chatbot overview, Sessions guide, Memory systems

