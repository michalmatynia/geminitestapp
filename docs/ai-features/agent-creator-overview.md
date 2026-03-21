---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'feature-guide'
feature: 'agent-creator'
---

# Agent Creator — Feature Overview

Agent Creator is a persona and agent configuration system that enables creation of custom AI agent personalities with avatars, memory settings, mood states, and teaching integration.

## Feature Overview

Agent Creator provides tools to:

- **Create Personas**: Named AI agent configurations with unique personalities
- **Manage Avatars**: Upload and manage custom agent avatars with mood-based variants
- **Configure Memory**: Set memory retention policies and learning parameters
- **Define Moods**: Create mood-based avatar variations for personality expression
- **Integrate Teaching**: Add instructions and behavior customization

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Agent Creator System                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Admin Pages                                   │
│  ├─ AgentPersonasPage (persona library)        │
│  ├─ AgentPersonaMemoryPage (memory config)     │
│  ├─ AgentRunsPage (execution history)          │
│  └─ AgentPersonaTeachingPage (instructions)    │
│                                                 │
│  Context Layer                                 │
│  └─ AgentCreatorSettingsContext                │
│     ├─ State: personas, settings, teaching     │
│     └─ Actions: create, edit, delete           │
│                                                 │
│  Hooks                                         │
│  ├─ useAgentPersonas() (query + mutations)     │
│  ├─ usePersonaMemory() (memory management)     │
│  ├─ usePersonaTeaching() (instruction mgmt)    │
│  └─ useAgentRuns() (execution history)         │
│                                                 │
│  Utils                                         │
│  ├─ personas.ts (normalization, validation)    │
│  ├─ avatars.ts (upload, thumbnail)             │
│  └─ moods.ts (mood management)                 │
│                                                 │
│  Teaching System                               │
│  ├─ Teaching module manager                    │
│  ├─ Instruction templates                      │
│  └─ Behavior customization                     │
│                                                 │
│  API Layer                                     │
│  ├─ POST /api/agents/personas                  │
│  ├─ GET /api/agents/personas/:id               │
│  ├─ PUT /api/agents/personas/:id               │
│  ├─ DELETE /api/agents/personas/:id            │
│  └─ POST /api/agents/personas/:id/avatar       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### Personas

A persona is a configuration for a distinct AI agent personality:

```typescript
interface AgentPersona {
  // Identity
  id: string;
  name: string;
  description: string;

  // Personality
  personality: {
    traits: string[];        // e.g., ["helpful", "creative"]
    communicationStyle: string;
    expertise: string[];     // e.g., ["coding", "design"]
  };

  // Model configuration
  model: {
    modelId: string;
    temperature: number;     // 0.0-2.0
    topP?: number;
    frequencyPenalty?: number;
  };

  // Avatar & appearance
  avatar: {
    defaultImageUrl: string;
    moods: MoodVariant[];   // Mood-based variants
    accentColor?: string;
  };

  // Memory & learning
  memory: {
    retentionPolicy: 'short' | 'medium' | 'long';
    learningEnabled: boolean;
    maxStoredInteractions: number;
  };

  // Teaching & customization
  teaching?: {
    instructions: string[];
    behaviorRules: BehaviorRule[];
    trainingData?: string[];
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

**Persona Lifespan:**
```
Create → Configure → Activate → Use in Conversations → Analyze Runs → Improve
```

### Moods

Moods represent emotional states with corresponding avatar variants:

```typescript
interface MoodVariant {
  mood: 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited';

  // Visual representation
  avatarImageUrl: string;
  avatarThumbnailUrl: string;

  // Behavior adjustments (optional)
  temperatureAdjustment?: number;  // Add to base temperature
  responseLengthHint?: 'brief' | 'normal' | 'detailed';

  // Trigger conditions
  triggers?: {
    emotion: string;
    condition: string;
    probability: number;  // 0-100
  }[];
}
```

**Mood Examples:**
- **Neutral**: Default state, balanced responses
- **Happy**: Positive tone, encouraging feedback
- **Thinking**: Contemplative, detailed analysis
- **Concerned**: Cautious, verification-focused
- **Excited**: Enthusiastic, creative suggestions

### Memory Settings

Configure how the persona learns and retains information:

```typescript
interface AgentPersonaMemorySettings {
  // Retention policy
  retentionPolicy: {
    type: 'short' | 'medium' | 'long';

    shortTerm: {
      enabled: boolean;
      lifespan: 'session';  // Only current conversation
    };

    mediumTerm: {
      enabled: boolean;
      lifespan: number;     // Hours (e.g., 24, 48, 72)
      purgeOldest: boolean;
    };

    longTerm: {
      enabled: boolean;
      lifespan: number;     // Days (e.g., 30, 90, 365)
      archiveAfter: number; // Days before archiving
    };
  };

  // Learning
  learning: {
    enabled: boolean;
    learnFromCorrections: boolean;
    learnFromFeedback: boolean;
    learnFromPatterns: boolean;
  };

  // Capacity
  capacity: {
    maxStoredInteractions: number;
    maxStoredPatterns: number;
    maxStoredPreferences: number;
  };
}
```

**Policy Examples:**

| Policy | Use Case | Retention |
|--------|----------|-----------|
| **Short** | Chatbot conversations | Current session only |
| **Medium** | User preferences | 7 days |
| **Long** | Learned patterns | 90 days + archive |

### Teaching & Instructions

Customize agent behavior through teaching:

```typescript
interface AgentTeaching {
  // Core instructions
  systemInstructions: string[];

  // Behavior rules
  rules: BehaviorRule[];

  // Domain knowledge
  knowledgeBase?: {
    domain: string;
    content: string[];
    sources: string[];
  }[];

  // Training examples
  examples: {
    input: string;
    expectedOutput: string;
    category: string;
  }[];
}

interface BehaviorRule {
  condition: string;
  action: string;
  priority: number;
  exceptions?: string[];
}
```

**Example Teaching:**
```
Rule 1: "When user asks for code, always include comments"
Rule 2: "When uncertain, ask clarifying questions first"
Rule 3: "For sensitive topics, validate information before responding"
```

### Avatar Management

Handle avatar uploads and mood variants:

```typescript
interface AvatarManagement {
  // Upload process
  upload: {
    file: File;
    moodType: string;
    generateThumbnail: boolean;
  };

  // Storage
  storage: {
    originalUrl: string;
    thumbnailUrl: string;  // Auto-generated
    size: number;          // Bytes
    format: 'jpeg' | 'png' | 'webp';
  };

  // Mood mapping
  moodMapping: {
    [mood: string]: {
      imageUrl: string;
      thumbnailUrl: string;
    };
  };
}
```

**Avatar Requirements:**
- Formats: JPEG, PNG, WebP
- Max size: 5MB
- Recommended: 512x512px or larger
- Thumbnails auto-generated at 128x128px

---

## Typical Workflows

### Creating a New Persona

```
1. Click "Create New Persona"
2. Enter basic info:
   - Name: "TutorBot"
   - Description: "Patient teaching assistant"
   - Traits: ["helpful", "patient", "educational"]
3. Configure model:
   - Model: GPT-4
   - Temperature: 0.5 (balanced)
4. Upload avatar:
   - Default image
   - Mood variants (happy, thinking, etc.)
5. Set memory policy:
   - Long-term for learning
   - Max 1000 interactions
6. Add teaching:
   - "Always ask first, explain later"
   - "Break concepts into steps"
7. Save and activate
```

### Managing Moods

```
1. Open persona "TutorBot"
2. Go to Moods section
3. Edit mood: "Thinking"
4. Upload new thinking avatar
5. Set trigger: "When analyzing complex topic"
6. Set behavior: Temperature +0.2
7. Save
```

### Configuring Memory

```
1. Open persona "TutorBot"
2. Go to Memory Settings
3. Select policy: "Long-term"
4. Set lifespan: 90 days
5. Enable learning:
   - Learn from corrections
   - Learn from patterns
6. Set capacity: 2000 interactions
7. Save
```

### Adding Teaching

```
1. Open persona "TutorBot"
2. Go to Teaching section
3. Add rule: "Always provide examples"
4. Add instruction: "Be encouraging"
5. Add knowledge base: "Math concepts"
6. Upload training examples
7. Validate and save
```

### Using Persona in Chatbot

```
1. Open Chatbot
2. Create new session
3. Select persona: "TutorBot"
4. Start conversation
5. Persona applies:
   - Teaching rules
   - Memory settings
   - Mood-based responses
6. Persona learns from interaction
```

---

## Key Files

### Pages
- `src/features/ai/agentcreator/pages/AgentPersonasPage.tsx` — Persona CRUD
- `src/features/ai/agentcreator/pages/AgentPersonaMemoryPage.tsx` — Memory config
- `src/features/ai/agentcreator/pages/AgentPersonaTeachingPage.tsx` — Teaching mgmt
- `src/features/ai/agentcreator/pages/AgentRunsPage.tsx` — Execution history

### Context & State
- `src/features/ai/agentcreator/context/AgentCreatorSettingsContext.tsx` — State/actions

### Hooks
- `src/features/ai/agentcreator/hooks/useAgentPersonas.ts` — Query/mutations
- `src/features/ai/agentcreator/hooks/usePersonaMemory.ts` — Memory management
- `src/features/ai/agentcreator/hooks/usePersonaTeaching.ts` — Teaching management

### Utilities
- `src/features/ai/agentcreator/utils/personas.ts` — Persona normalization
- `src/features/ai/agentcreator/utils/avatars.ts` — Avatar handling
- `src/features/ai/agentcreator/utils/moods.ts` — Mood management

### Teaching System
- `src/features/ai/agentcreator/teaching/` — Teaching modules and integration

### Contracts
- `src/shared/contracts/agents.ts` — Zod schemas for type safety

---

## API Reference

### Create Persona

```
POST /api/agents/personas

Body:
{
  name: "TutorBot",
  description: "Patient teaching assistant",
  personality: {
    traits: ["helpful", "patient"],
    communicationStyle: "educational",
    expertise: ["teaching"]
  },
  model: {
    modelId: "gpt-4",
    temperature: 0.5
  }
}

Response: { id: "persona-123", ... }
```

### Get Persona

```
GET /api/agents/personas/:id

Response:
{
  id: "persona-123",
  name: "TutorBot",
  avatar: { ... },
  memory: { ... },
  teaching: { ... }
}
```

### Update Persona

```
PUT /api/agents/personas/:id

Body: { /* partial updates */ }

Response: { /* updated persona */ }
```

### Upload Avatar

```
POST /api/agents/personas/:id/avatar

Body: FormData with file

Response:
{
  originalUrl: "...",
  thumbnailUrl: "..."
}
```

### List Personas

```
GET /api/agents/personas?active=true

Response:
{
  personas: [ ... ],
  total: 15
}
```

### Delete Persona

```
DELETE /api/agents/personas/:id

Response: { success: true }
```

---

## Configuration

### Persona Template

Use templates to create personas quickly:

```typescript
const tutorTemplate: AgentPersona = {
  name: "Tutor",
  personality: {
    traits: ["patient", "educational", "encouraging"],
    communicationStyle: "simple and clear",
    expertise: ["teaching", "explanation"],
  },
  model: {
    modelId: "gpt-4",
    temperature: 0.4,  // Lower for consistency
  },
  memory: {
    retentionPolicy: "long",
    learningEnabled: true,
    maxStoredInteractions: 2000,
  },
  teaching: {
    instructions: [
      "Break concepts into steps",
      "Always provide examples",
      "Be encouraging and patient",
    ],
  },
};
```

---

## Integration Points

### With Chatbot
- Chatbot uses personas from Agent Creator
- Applies persona's settings and teaching
- Learns per-persona across conversations

### With Agent Runtime
- Agent Runtime uses persona during execution
- Applies memory and teaching to planning
- Persona influences tool selection and responses

### With Observability
- Track persona usage statistics
- Monitor persona learning effectiveness
- Log persona configuration changes

---

## Common Tasks

### Create Persona

```tsx
const { createPersona } = useAgentPersonas();

const persona = await createPersona({
  name: "TutorBot",
  personality: {
    traits: ["helpful", "patient"],
    communicationStyle: "educational",
  },
});
```

### Upload Avatar

```tsx
const { uploadAvatar } = useAgentPersonas();

await uploadAvatar({
  personaId: "persona-123",
  file: avatarFile,
  mood: "happy",
});
```

### Update Memory

```tsx
const { updateMemorySettings } = usePersonaMemory();

await updateMemorySettings({
  personaId: "persona-123",
  retentionPolicy: "long",
  learningEnabled: true,
});
```

### Get Persona Runs

```tsx
const { getPersonaRuns } = useAgentRuns();

const runs = await getPersonaRuns({
  personaId: "persona-123",
  limit: 20,
});
```

---

## Performance Optimization

### Avatar Handling
- Thumbnails generated automatically
- Images cached with CDN
- Lazy loading for avatars

### Memory
- Learned patterns indexed
- Old interactions archived
- Capacity limits enforced

### Teaching
- Instructions compiled once
- Rules evaluated efficiently
- Knowledge base searched indexed

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Avatar not displaying | Upload failed | Check file size, format, try again |
| Persona not learning | Learning disabled | Enable in memory settings |
| Memory full | Too many interactions | Increase max, reduce retention |
| Teaching not applied | Rules not triggered | Check condition, verify syntax |

---

## Best Practices

### Persona Design
- Keep traits (3-5) to avoid confusion
- Model temperature 0.3-0.8 for consistency
- Test personas before production use

### Avatar Management
- Use high-quality images (512x512+ recommended)
- Create mood variants for expression
- Keep file sizes under 1MB when possible

### Memory Configuration
- Short-term for quick chatbot sessions
- Medium-term for daily use patterns
- Long-term for multi-month learning

### Teaching
- Start with 3-5 core rules
- Test each rule independently
- Document rule intent and exceptions
- Review rules quarterly

---

## Next Steps

1. **Creating Your First Persona**: Step-by-step guide
2. **Avatar Design**: Best practices and tools
3. **Memory & Learning**: How personas improve over time
4. **Teaching Integration**: Advanced behavior customization
5. **Analytics**: Understanding persona performance

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive feature overview
**Related Docs:** AI Features README, Chatbot integration, Agent Runtime integration

