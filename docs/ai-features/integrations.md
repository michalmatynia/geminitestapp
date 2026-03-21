---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'integration-guide'
scope: 'ai-features'
---

# AI Features — Integration Guide

How the five AI features interact with each other and the broader platform.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  User Interface Layer                    │
│  (Chatbot UI, Image Studio, Insights Dashboard, etc.)   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────┐
│              AI Features Layer                           │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Chatbot    │  │ Image Studio │  │ AI Insights  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                │                  │            │
│         └────────────────┼──────────────────┘            │
│                          │                              │
│  ┌──────────────────────┴──────────────────────┐       │
│  │                                             │        │
│  │ Agent Runtime (Execution Engine)            │       │
│  │ Agent Creator (Configuration)               │       │
│  │                                             │       │
│  └──────────────────────┬──────────────────────┘       │
│                         │                              │
└─────────────────────────┼──────────────────────────────┘
                          │
┌─────────────────────────┴──────────────────────────────┐
│              Platform Services                         │
│  Memory Management, Observability, Error Handling      │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Relationships

### 1. Chatbot ↔ Agent Creator

**How They Connect:**

```
Agent Creator
    ↓
  Creates Personas
    ↓
Chatbot Uses Personas
    ↓
  Defines behavior:
  - System prompt
  - Temperature
  - Mood variants
  - Memory settings
  - Teaching rules
```

**Data Flow:**

```typescript
// Chatbot loads persona from Agent Creator
const persona = await personaRepository.get(session.personaId);

// Applies persona settings
const botConfig = {
  systemPrompt: persona.teaching?.instructions,
  temperature: persona.model.temperature,
  modelId: persona.model.modelId,
  behaviors: persona.teaching?.rules,
};

// Persona's memory settings guide learning
const memoryPolicy = persona.memory.retentionPolicy;
```

**Integration Points:**

- Chatbot displays persona info in UI
- Each session tied to specific persona
- Persona changes automatically applied to future messages
- Avatar and mood variants from Agent Creator shown in chat UI
- Long-term memory learning per persona

**Example Workflow:**

```
User Action: Create Chatbot Session
    ↓
1. Select Persona from Agent Creator
2. Chatbot loads persona's system prompt
3. Chatbot inherits persona's memory settings
4. Future messages follow persona's teaching rules
5. Long-term memory learned per persona
6. User sees persona's avatar & mood variants
```

### 2. Agent Runtime ↔ Agent Creator

**How They Connect:**

```
Agent Creator
    ↓
  Defines Personas
    ↓
Agent Runtime Uses Personas
    ↓
  For planning:
  - Personality traits guide planning
  - Memory influences approach
  - Teaching rules constrain actions
```

**Data Flow:**

```typescript
// During planning phase, Agent Runtime loads persona
const persona = await personaRepository.get(agentId);

// Persona influences planning
const planPrompt = `
You are ${persona.name}.
Personality: ${persona.personality.traits.join(', ')}
Expertise: ${persona.personality.expertise.join(', ')}

Your approach should be:
${persona.teaching?.instructions?.join('\n')}
`;

// Use persona's model config for planning
const plan = await llm.complete({
  model: persona.model.modelId,
  temperature: persona.model.temperature,
  prompt: planPrompt,
});
```

**Integration Points:**

- Agent Runtime uses persona's personality in planning
- Teaching rules constrain what actions are acceptable
- Memory settings determine what context is loaded
- Model selection from persona configuration

**Example Workflow:**

```
User: Execute Agent Task
    ↓
1. Agent Runtime loads Agent Creator persona
2. Uses persona's system instructions
3. Plans steps respecting teaching rules
4. Applies persona's memory for context
5. Executes steps with personality
6. Learns for future runs (per persona)
```

### 3. Chatbot ↔ Image Studio

**How They Connect:**

```
Chatbot Conversation
    ↓
User asks for image generation
    ↓
Chatbot can:
- Suggest prompts
- Explain images
- Create variations
    ↓
Image Studio Generates
    ↓
Results shown in chat
```

**Data Flow:**

```typescript
// Chatbot can reference generated images
interface ChatMessage {
  content: string;
  metadata?: {
    // Images generated from this chat
    imagesGenerated?: {
      url: string;
      prompt: string;
      projectId: string;
    }[];
  };
}

// When user asks about images
const response = await chatbot.generateResponse({
  message: 'Generate a product image',
  context: {
    // Can reference Image Studio projects
    recentImages: await imageStudio.getRecentImages(),
    projects: await imageStudio.listProjects(),
  },
});
```

**Integration Points:**

- Chatbot can initiate Image Studio generation
- Chatbot explains image generation results
- Image history visible in chat context
- Generated images can be referenced in future messages

**Example Workflow:**

```
User in Chatbot: "Create a winter product photo"
    ↓
1. Chatbot understands request
2. Suggests prompt to Image Studio
3. User approves in Image Studio
4. Image Studio generates
5. Result shown in chatbot
6. User provides feedback
7. Chatbot refines approach
```

### 4. Chatbot ↔ Agent Runtime

**How They Connect:**

```
Chatbot Conversation
    ↓
Complex task detected
    ↓
Chatbot initiates Agent Runtime
    ↓
Agent executes multi-step task
    ↓
Results reported to chatbot
    ↓
Chatbot formats response
```

**Data Flow:**

```typescript
// Chatbot detects complex request
if (isComplexTask(userMessage)) {
  // Delegate to Agent Runtime
  const run = await agentRuntime.execute({
    agentId: session.personaId,
    task: userMessage,
    context: {
      conversationHistory: session.messages,
      userProfile: user.profile,
    },
  });

  // Wait for completion
  const result = await agentRuntime.waitForCompletion(run.id);

  // Return result to chat
  return {
    role: 'assistant',
    content: `I completed the task: ${result.summary}`,
    metadata: {
      toolsUsed: result.toolsUsed,
      stepsTaken: result.plan.steps.length,
    },
  };
}
```

**Integration Points:**

- Chatbot can trigger Agent Runtime for complex tasks
- Agent Runtime uses chatbot context for planning
- Results flow back to chatbot for presentation
- Same persona used for consistency
- Memory shared between systems

**Example Workflow:**

```
User in Chatbot: "Check my email and send a summary"
    ↓
1. Chatbot detects multi-step task
2. Initiates Agent Runtime
3. Agent plans: Check email → Filter → Summarize
4. Agent executes steps
5. Agent returns summary
6. Chatbot presents results
7. User asks follow-up in chat
```

### 5. AI Insights ↔ Agent Runtime

**How They Connect:**

```
Agent Runtime Execution
    ↓
Logs actions and results
    ↓
AI Insights analyzes patterns
    ↓
Generates recommendations
    ↓
Agent Runtime learns from insights
```

**Data Flow:**

```typescript
// Agent Runtime logs execution
const run = await executeAgent();

// AI Insights analyzes patterns
const insights = await aiInsights.generate({
  type: 'runtime_analytics',
  data: {
    recentRuns: await getRuns({ limit: 100 }),
    successRate: calculateSuccessRate(),
    commonFailures: extractFailures(),
  },
});

// Extract recommendations
const recommendations = insights
  .filter(i => i.category === 'optimization')
  .map(i => i.recommendations)
  .flat();

// Next run can apply recommendations
const nextRun = await executeAgent({
  optimizationTips: recommendations,
});
```

**Integration Points:**

- AI Insights analyzes Agent Runtime execution patterns
- Recommendations guide future planning
- Success rates tracked and reported
- Failure modes documented and avoided
- Loop detection patterns shared

**Example Workflow:**

```
Multiple Agent Runs
    ↓
1. AI Insights analyzes patterns
2. Detects: "Browser interactions failing 30% of the time"
3. Recommends: "Add retry logic, check element visibility"
4. Next Agent Run implements recommendation
5. Success rate improves
6. Insights updated
```

---

## Data Flow Examples

### Example 1: End-to-End Chatbot Task

```
User: "Create marketing images for summer collection"
    │
    ├─→ Chatbot receives request
    │   ├─ Loads persona (Agent Creator)
    │   └─ Loads session context
    │
    ├─→ Chatbot detects complex task
    │   └─ Initiates Agent Runtime
    │
    ├─→ Agent Runtime:
    │   ├─ Plans: "Gather requirements → Generate variations → Review → Export"
    │   ├─ Executes with Image Studio
    │   │   ├─ Creates project
    │   │   ├─ Generates base images
    │   │   └─ Creates variations
    │   └─ Returns results
    │
    ├─→ Chatbot receives results
    │   ├─ Formats response
    │   ├─ Saves images to session metadata
    │   └─ Presents to user
    │
    └─→ User provides feedback
        ├─ Chatbot learns preferences
        ├─ AI Insights records pattern
        └─ Next request uses learning
```

### Example 2: Continuous Improvement Loop

```
Week 1: Initial Agent Runs
    │
    ├─→ Multiple runs executed
    │   └─ Some succeed, some fail
    │
    └─→ AI Insights analyzes
        └─ "Loop detected: retry same action 3x"

Week 2: Optimization
    │
    ├─→ Agent Runtime learns
    │   └─ Implements retry backoff
    │
    ├─→ Runs improve
    │   └─ Success rate increases
    │
    └─→ AI Insights updated
        └─ "Success rate improved 30%"

Week 3: Advanced Learning
    │
    ├─→ Chatbot incorporates insights
    │   └─ Suggests better approaches
    │
    ├─→ Agent Creator updates persona
    │   └─ Adds new teaching rules
    │
    └─→ System-wide improvement
        └─ All features benefit
```

---

## Shared Concepts

### Persona

Used by: Agent Creator, Chatbot, Agent Runtime

```typescript
interface SharedPersona {
  // Unique across system
  id: string;
  name: string;

  // Used by all features
  model: { modelId: string; temperature: number };
  personality: { traits: string[]; expertise: string[] };

  // Long-term learning across features
  memory: { retentionPolicy: string; learningEnabled: boolean };

  // Teaching rules apply to all
  teaching: { instructions: string[]; rules: BehaviorRule[] };
}

// Consistency: Same persona → same behavior
// across Chatbot, Agent Runtime, and interactions
```

### Memory

Shared across: Agent Creator, Chatbot, Agent Runtime

```typescript
interface SharedMemory {
  // What is learned
  type: 'user_preference' | 'successful_pattern' | 'failure_mode';

  // Who learns
  personaId: string;
  userId: string;

  // Where applied
  // ✅ Chatbot: Shapes responses
  // ✅ Agent Runtime: Guides planning
  // ✅ AI Insights: Analyzes effectiveness

  // Lifecycle
  createdAt: Date;
  relevance: number; // 0-100
  ttl: number; // Days before expiration
}
```

### Context

Shared concept: Agent Runtime, Chatbot

```typescript
// Both use three-layer context

interface SharedContext {
  // 1. System level
  system: {
    instructions: string;
    constraints: string[];
  };

  // 2. Session level
  conversation: {
    messages: Message[];
    metadata: Record<string, unknown>;
  };

  // 3. User level
  user: {
    preferences: Record<string, unknown>;
    history: SessionSummary[];
  };
}

// Both can choose:
// - LOCAL: Session only (fast, cheap)
// - GLOBAL: Full context (comprehensive)
```

---

## Configuration & Control

### Per-Session Overrides

```typescript
interface SessionOverrides {
  // Chatbot can override:
  modelId?: string;              // Different model
  temperature?: number;          // Different creativity
  contextMode?: 'local' | 'global';
  customSystemPrompt?: string;   // Session-specific instructions
  memorySave?: boolean;          // Enable/disable learning

  // Agent Runtime respects same:
  agentModelId?: string;
  planningTemperature?: number;
  memoryRetention?: 'short' | 'medium' | 'long';
}

// Consistency: Overrides apply to all features
// in that session/run
```

### Feature Toggles

```typescript
interface FeatureFlags {
  // Enable/disable per feature
  chatbotEnabled: boolean;
  imagingEnabled: boolean;
  agentRuntimeEnabled: boolean;
  aiInsightsEnabled: boolean;
  agentCreatorEnabled: boolean;

  // Cross-feature toggling
  agentRuntimeFromChatbot: boolean;  // Chatbot can trigger agents
  imagingFromChatbot: boolean;       // Chatbot can generate images
  aiInsightsEnabled: boolean;        // Analyze all features
}
```

---

## Error Handling & Resilience

### Cascading Errors

```
Chatbot calls Agent Runtime
    │
    ├─→ Agent Runtime fails
    │   └─ Error logged to Observability
    │
    ├─→ AI Insights analyzes
    │   └─ Records failure pattern
    │
    ├─→ Chatbot handles gracefully
    │   └─ User informed with suggestions
    │
    └─→ Next attempt uses learning
        └─ Avoids repeated failure
```

### Isolation

Features fail gracefully:

```typescript
// If Image Studio unavailable
try {
  const images = await imageStudio.generate(...);
} catch (error) {
  // Chatbot continues without it
  return `Let me help with text: ${response}`;
  // (No image generation, but conversation works)
}

// If Agent Runtime unavailable
try {
  const result = await agentRuntime.execute(...);
} catch (error) {
  // Chatbot handles directly
  return simplifiedResponse;
  // (No complex tasks, but basic chat works)
}
```

---

## Scalability Patterns

### Feature Independence

Each feature can scale separately:

```
Chatbot: Many concurrent users
  └─ Mostly LOCAL context (fast)
  └─ Minimal memory loading

Agent Runtime: Fewer, longer tasks
  └─ Mostly GLOBAL context
  └─ More memory intensive

Image Studio: Async batch processing
  └─ Queue-based
  └─ Doesn't block other features

AI Insights: Periodic analysis
  └─ Background job
  └─ Doesn't impact user-facing features
```

### Resource Management

```typescript
interface ResourceBudgets {
  // Chatbot gets most tokens (many users)
  chatbot: {
    localContextTokens: 2000,
    globalContextTokens: 5000,
    concurrentSessions: 1000,
  },

  // Agent Runtime gets medium (fewer, intensive)
  agentRuntime: {
    maxContextTokens: 8000,
    maxConcurrentRuns: 50,
    maxStepsPerRun: 20,
  },

  // Image Studio async
  imageStudio: {
    queueSize: 1000,
    maxBatchSize: 100,
  },

  // AI Insights periodic
  aiInsights: {
    analysisInterval: 'hourly',
    maxDataPoints: 10000,
  },
}
```

---

## Monitoring & Observability

### Cross-Feature Metrics

```typescript
interface CrossFeatureMetrics {
  // Chatbot → Agent Runtime
  chatbotToAgentRuntimeRatio: number;      // % of chats that trigger agents
  agentRuntimeSuccessFromChatbot: number;  // Success rate when called from chat

  // Chatbot ↔ Image Studio
  imageGenerationRequests: number;         // From chatbot
  imageAcceptanceRate: number;             // User approval %

  // Memory effectiveness
  memoryHitRate: number;                   // % of queries using memory
  learningAccuracy: number;                // % of learned patterns useful

  // System health
  featureDependencies: {
    chatbotHealthy: boolean;
    agentRuntimeHealthy: boolean;
    imagingHealthy: boolean;
  };
}
```

### Debugging Integration Issues

```typescript
// When features interact, log context
logger.info('feature_interaction', {
  source: 'chatbot',
  target: 'agent_runtime',
  personaId: session.personaId,
  messageCount: session.messages.length,
  contextMode: session.contextMode,
  timestamp: new Date(),
  result: 'success' | 'failure',
});

// For AI Insights analysis
aiInsights.recordInteraction({
  from: 'chatbot',
  to: 'agent_runtime',
  outcome: result,
  duration: executionTime,
  errorType: error?.type,
});
```

---

## Best Practices for Integration

### Rule 1: Maintain Consistency

```typescript
// ✅ Good: Same persona used everywhere
const persona = await personaRepository.get(personaId);
chatbot.setPersona(persona);
agentRuntime.setPersona(persona);

// ❌ Bad: Different personas in different features
chatbot.setPersona(persona1);
agentRuntime.setPersona(persona2); // Inconsistent!
```

### Rule 2: Preserve Context

```typescript
// ✅ Good: Pass full context
const context = {
  conversation: chatbot.getHistory(),
  memory: await memoryRepository.get(userId),
  preferences: user.preferences,
};
agentRuntime.plan(task, context);

// ❌ Bad: Lose context
agentRuntime.plan(task); // Missing context = poor planning
```

### Rule 3: Learn from Failures

```typescript
// ✅ Good: Record failure for learning
try {
  await operation();
} catch (error) {
  await memory.recordFailure({
    operation,
    error,
    context,
    timestamp: new Date(),
  });
  // Next attempt can avoid this
}

// ❌ Bad: Ignore failure
try {
  await operation();
} catch (error) {
  // Just fail silently
}
```

### Rule 4: Graceful Degradation

```typescript
// ✅ Good: Work with whatever's available
const fullResponse = await chatbot.generateResponse({
  message,
  withAgentRuntime: featureFlags.agentRuntimeEnabled,
  withImaging: featureFlags.imagingEnabled,
});

// ❌ Bad: Fail if any feature unavailable
if (!featureFlags.agentRuntimeEnabled) {
  throw new Error('Agent Runtime required');
}
```

---

## Next Steps

1. **Understand Individual Features**: Read the overview docs
2. **Learn Deep Dives**: Read execution flow, sessions, context guides
3. **Integrate in Code**: Use personas across all features
4. **Monitor Interactions**: Track cross-feature metrics
5. **Optimize Based on Insights**: Use AI Insights to improve

---

**Last Updated:** 2026-03-21
**Status:** Complete integration guide
**Related Docs:** All AI feature guides, Observability systems

