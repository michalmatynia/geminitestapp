---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'index'
scope: 'ai-features'
canonical: true
---

# AI Features Documentation

Comprehensive guides for the platform's AI-powered capabilities: autonomous agents, conversational interfaces, image generation, persona management, and insight generation.

## Quick Navigation

| Feature | Purpose | Status | Priority |
|---------|---------|--------|----------|
| [Agent Runtime](#agent-runtime) | Autonomous agent execution with planning and tools | New | 🔴 High |
| [Chatbot](#chatbot) | Conversational AI with sessions and context | New | 🟠 Medium |
| [Image Studio](#image-studio) | AI image generation and manipulation | New | 🟠 Medium |
| [AI Insights](#ai-insights) | AI-generated analytics and system insights | New | 🟡 Low |
| [Agent Creator](#agent-creator) | Persona and agent configuration | New | 🟡 Low |

---

## Agent Runtime

**The execution engine for autonomous AI agents**

Handles multi-step planning, tool execution, approval gates, human intervention, memory management, and browser automation.

### Key Concepts
- **Execution Flow**: Plan generation → step execution → approval gates → finalization
- **Tool System**: Extensible tool definitions with browser, file, and data operations
- **Loop Detection**: Prevents infinite execution loops with backoff mechanisms
- **Memory**: Long-term and short-term memory for context persistence
- **Audit Trail**: Complete logging of agent actions and approvals

### Documentation
- [`agent-runtime-overview.md`](./agent-runtime-overview.md) — Architecture and core concepts ✅
- [`agent-runtime-execution-flow.md`](./agent-runtime-execution-flow.md) — Step-by-step execution guide ✅
- [`agent-runtime-tools.md`](./agent-runtime-tools.md) — Tool definitions and execution (Coming soon)
- [`agent-runtime-approval-gates.md`](./agent-runtime-approval-gates.md) — Approval workflows and human intervention (Coming soon)
- [`agent-runtime-debugging.md`](./agent-runtime-debugging.md) — Troubleshooting and debugging (Coming soon)

### Implementation Files
- Core: `src/features/ai/agent-runtime/core/`
- Execution: `src/features/ai/agent-runtime/execution/`
- Tools: `src/features/ai/agent-runtime/tools/`
- Memory: `src/features/ai/agent-runtime/memory/`
- Audit: `src/features/ai/agent-runtime/audit/`

---

## Chatbot

**Conversational AI with session management and context awareness**

A multi-turn conversational interface with support for personas, local/global context, memory, web search, and agent browsing.

### Key Concepts
- **Sessions**: Separate conversation threads with independent context
- **Personas**: Pre-configured bot personalities with behavior templates
- **Context Modes**: Local (session-specific) and global (system-wide) context injection
- **Memory**: Persistent conversation history and learned patterns
- **Extensions**: Web search and agent-browser integration

### Documentation
- [`chatbot-overview.md`](./chatbot-overview.md) — Feature overview and architecture ✅
- [`chatbot-sessions.md`](./chatbot-sessions.md) — Session lifecycle and management ✅
- [`chatbot-context.md`](./chatbot-context.md) — Context modes decision framework ✅
- [`chatbot-personas.md`](./chatbot-personas.md) — Persona configuration (Coming soon)
- [`chatbot-api.md`](./chatbot-api.md) — API endpoints and payloads (Coming soon)

### Implementation Files
- Pages: `src/features/ai/chatbot/pages/`
- Context: `src/features/ai/chatbot/context/ChatbotContext.tsx` (split into Messages, Settings, Sessions, UI)
- Hooks: `src/features/ai/chatbot/hooks/` (14 custom hooks)
- API: `src/features/ai/chatbot/api/`
- Services: `src/features/ai/chatbot/services/` (repository layer)

---

## Image Studio

**AI-powered image generation and manipulation platform**

Multi-project workspace with mask-based generation, shape tools, prompt engineering, batch processing, and object layout detection.

### Key Concepts
- **Projects**: Separate workspaces with independent settings and assets
- **Slots**: Generated image containers with mask and prompt association
- **Masks**: Shape-based image generation regions (freehand, rectangle, circle)
- **Prompts**: Reusable prompt templates with variables and optimization
- **Generation**: Batch processing with auto-scaling and real-time monitoring
- **Object Detection**: Automatic object boundary and layout detection

### Documentation
- [`image-studio-overview.md`](./image-studio-overview.md) — Platform overview and workflows ✅
- [`image-studio-architecture.md`](./image-studio-architecture.md) — Context split and state management (Coming soon)
- [`image-studio-workflows.md`](./image-studio-workflows.md) — Common generation workflows (Coming soon)
- [`image-studio-masks.md`](./image-studio-masks.md) — Mask types and shape tools (Coming soon)
- [`image-studio-generation.md`](./image-studio-generation.md) — Generation configuration and monitoring (Coming soon)
- [`image-studio-detection.md`](./image-studio-detection.md) — Object layout and auto-scaling (Coming soon)

### Implementation Files
- Pages: `src/features/ai/image-studio/pages/`
- Context: `src/features/ai/image-studio/context/` (6 domain contexts)
- Components: `src/features/ai/image-studio/components/` (50+ components)
- Server: `src/features/ai/image-studio/server/` (image processing, detection)
- Utils: `src/features/ai/image-studio/utils/` (15+ utilities)

---

## AI Insights

**AI-generated insights for analytics, runtime, and system logs**

Automatic insight generation across three categories: product analytics, system performance, and log anomalies.

### Key Concepts
- **Analytics Insights**: Product usage patterns, content optimization recommendations
- **Runtime Analytics**: System performance metrics, bottleneck identification
- **Log Insights**: Anomaly detection, trend analysis, system health patterns
- **Insight Scoring**: Relevance and impact ranking
- **Metadata**: Rich context including sources, evidence, and actionability

### Documentation
- [`ai-insights-overview.md`](./ai-insights-overview.md) — Overview of insight types ✅
- [`ai-insights-types.md`](./ai-insights-types.md) — Detailed insight categories (Coming soon)
- [`ai-insights-generation.md`](./ai-insights-generation.md) — Generation triggers and configuration (Coming soon)
- [`ai-insights-api.md`](./ai-insights-api.md) — Query and mutation endpoints (Coming soon)

### Implementation Files
- Pages: `src/features/ai/insights/pages/`
- Context: `src/features/ai/insights/context/InsightsContext.tsx`
- Hooks: `src/features/ai/insights/hooks/`
- Generator: `src/features/ai/insights/generator.ts`
- Repository: `src/features/ai/insights/repository.ts`

---

## Agent Creator

**Persona and agent configuration system**

Create and configure AI agent personas with custom avatars, memory settings, mood states, and teaching content.

### Key Concepts
- **Personas**: Named agent configurations with personality traits
- **Moods**: Mood-based avatar variants for personality expression
- **Avatars**: Custom image handling with automatic thumbnail generation
- **Memory**: Persona-specific memory settings and retention policies
- **Teaching**: Agent instruction and behavior customization

### Documentation
- [`agent-creator-overview.md`](./agent-creator-overview.md) — Overview and personas system ✅
- [`agent-creator-personas.md`](./agent-creator-personas.md) — Persona creation and configuration (Coming soon)
- [`agent-creator-avatars.md`](./agent-creator-avatars.md) — Avatar upload and mood management (Coming soon)
- [`agent-creator-memory.md`](./agent-creator-memory.md) — Memory settings and retention (Coming soon)
- [`agent-creator-teaching.md`](./agent-creator-teaching.md) — Teaching and instruction integration (Coming soon)

### Implementation Files
- Pages: `src/features/ai/agentcreator/pages/`
- Context: `src/features/ai/agentcreator/context/`
- Hooks: `src/features/ai/agentcreator/hooks/`
- Utils: `src/features/ai/agentcreator/utils/`
- Teaching: `src/features/ai/agentcreator/teaching/`

---

## Integration Guide

See [`integrations.md`](./integrations.md) for detailed information on how the five AI features interact:

- **Chatbot ↔ Agent Creator**: Personas, memory, teaching rules
- **Chatbot ↔ Agent Runtime**: Complex task delegation, context sharing
- **Chatbot ↔ Image Studio**: Image generation requests, result integration
- **Agent Runtime ↔ Agent Creator**: Persona-based planning and execution
- **AI Insights ↔ Agent Runtime**: Pattern analysis, optimization recommendations
- **Shared Concepts**: Personas, memory, context, configuration
- **Error Handling**: Graceful degradation, isolation, cascading failures
- **Scalability**: Feature independence, resource budgeting
- **Monitoring**: Cross-feature metrics, interaction logging

---

## Cross-Cutting Concepts

### Model Selection

Model selection in AI features follows **per-node or per-feature** configuration, NOT a global default:

- **AI Paths**: Model is chosen on each Model node individually within a path
- **Chatbot**: Model selected in chatbot settings
- **Image Studio**: Model specified per generation
- **Agent Runtime**: Model determined during planning phase

**Error Messages**: Always refer to feature-specific model configuration, not "AI Brain defaults".

### Error Handling

All AI features use consistent error classification and messaging:
- See: `src/shared/errors/error-classifier.ts`
- Pattern: Specific error type → user-actionable message
- Logging: All AI operations logged to observability system

### Context Management

Several features use **context-split architecture** for performance:
- **Image Studio**: 6 domain contexts (Settings, Projects, Slots, Masking, Prompt, Generation)
- **Chatbot**: 4 contexts (Messages, Settings, Sessions, UI)
- **AI Insights**: Single context with query/mutation separation

Pattern: Use domain-specific hooks to subscribe to relevant state only.

### State Management

All AI features follow the platform pattern:
- Context providers at feature level
- Separated state/actions hooks for performance
- Persistent storage via feature-specific services
- Query/mutation hooks for data operations

---

## Getting Started

### For Users
1. Start with the feature overview document
2. Follow the "Getting Started" section
3. Reference the workflows guide for your use case

### For Developers
1. Read the architecture overview
2. Review the implementation files in the codebase
3. Check the API documentation for integration points
4. Use troubleshooting guides for debugging

### For Architects
1. Review cross-cutting concepts above
2. Check error handling and state management patterns
3. See context-split architecture in Image Studio as reference
4. Review memory management in Agent Runtime

---

## Integration Points

### With AI Paths
- AI Paths can trigger Agent Runtime for complex workflows
- Models selected per-node in AI Path (not global)

### With Database/Storage
- Feature services use feature-specific repositories
- Long-term memory persisted in primary database
- Sessions and artifacts stored per-feature

### With Observability
- All features log to observability system
- Error classification handled by error-classifier.ts
- Metrics per feature tracked in docs/metrics/

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| **Core Overviews** | | |
| Agent Runtime Overview | ✅ Complete | 2026-03-21 |
| Chatbot Overview | ✅ Complete | 2026-03-21 |
| Image Studio Overview | ✅ Complete | 2026-03-21 |
| AI Insights Overview | ✅ Complete | 2026-03-21 |
| Agent Creator Overview | ✅ Complete | 2026-03-21 |
| **Deeper Guides** | | |
| Agent Runtime Execution Flow | ✅ Complete | 2026-03-21 |
| Chatbot Sessions Management | ✅ Complete | 2026-03-21 |
| Chatbot Context Modes | ✅ Complete | 2026-03-21 |
| Agent Runtime Tools & API | 🔄 Planned | — |
| Chatbot Personas | 🔄 Planned | — |
| Image Studio Workflows | 🔄 Planned | — |
| Integration Guides | 🔄 Planned | — |

---

## Contributing to AI Features

When adding new AI features or modifying existing ones:

1. **Update documentation** before merging
2. **Follow context-split pattern** for state management
3. **Use feature-specific repositories** for data access
4. **Log all operations** to observability system
5. **Test error paths** with error-classifier
6. **Document model selection** clearly (per-feature, not global)

---

## Support & Questions

- **Architecture questions**: See relevant overview document
- **Implementation questions**: Check the feature's README and code comments
- **Integration questions**: See Integration Points section above
- **Troubleshooting**: Check feature-specific debugging guide

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive documentation for all 5 AI features
**Scope:** Overview, architecture, workflows, API, troubleshooting

