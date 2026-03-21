---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'feature-guide'
feature: 'agent-runtime'
---

# Agent Runtime — Architecture & Core Concepts

The Agent Runtime is the execution engine for autonomous AI agents. It orchestrates multi-step planning, tool execution, approval gates, human intervention, memory management, and browser automation.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Agent Runtime System                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Planning Phase                                   │  │
│  │ • Generate initial plan                          │  │
│  │ • Load context (system, conversation, long-term) │  │
│  │ • Estimate step count and complexity             │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Step Execution Loop                              │  │
│  │ • Execute single step                            │  │
│  │ • Collect tool results                           │  │
│  │ • Check for loops/errors                         │  │
│  │ • Update plan if needed                          │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Approval Gates (if configured)                   │  │
│  │ • Present action for human review                │  │
│  │ • Wait for approval/rejection                    │  │
│  │ • Handle refusal or continuation                 │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Finalization                                     │  │
│  │ • Summarize results                              │  │
│  │ • Save long-term memory                          │  │
│  │ • Log audit trail                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Execution State

Each agent run tracks:
- **Status**: `pending` | `running` | `approved` | `completed` | `failed` | `cancelled`
- **Plan**: Current execution plan with steps and predictions
- **Current Step**: What the agent is currently doing
- **Memory**: Short-term context for current run
- **Audit Log**: Complete history of actions and approvals

### 2. Planning Phase

Before execution begins, the runtime:
1. **Generates a plan** based on the user request/goal
2. **Loads context** from three sources:
   - System context (instructions, constraints)
   - Conversation history (previous interactions)
   - Long-term memory (patterns from past runs)
3. **Estimates complexity**: Expected step count, reasoning depth
4. **Validates feasibility**: Checks if goal is achievable with available tools

### 3. Step Execution

Each step in the plan:
- Represents a single agent action (call tool, wait for result, reason)
- **Inputs**: Previous step outputs, current context
- **Execution**: Run tool (browser, file, data operation, etc.)
- **Outputs**: Result data, error status, next step recommendations
- **Loop Detection**: Checks if agent is repeating failed attempts

### 4. Tool System

Agents have access to a toolset:

| Tool Category | Examples | Purpose |
|---------------|----------|---------|
| **Browser** | Navigate, click, extract, screenshot | Web automation |
| **File** | Read, write, parse | Local file operations |
| **Data** | Query, transform, aggregate | Database operations |
| **Search** | Web search, knowledge base lookup | Information retrieval |
| **Communication** | Send email, post message | External communication |

Tools are defined as Zod schemas with:
- **Input schema**: Typed parameters
- **Output schema**: Result structure
- **Permission requirements**: Access control
- **Execution handler**: Implementation function

### 5. Approval Gates

For sensitive operations, runs can require human approval:

```
Agent Action → [Needs Approval?] → Human Review → Approve/Reject
                        ↓                              ↓
                     No gate                    Continues / Stops
```

Typical approval triggers:
- Critical data modifications
- External system changes
- Unusual agent behavior
- Cost-sensitive operations

### 6. Memory System

**Short-term Memory** (current run):
- Conversation context
- Previous step outputs
- Running state

**Long-term Memory** (persistent):
- Successful patterns
- Known failure modes
- User preferences
- System state snapshots

Memory is used during planning to:
- Learn from past successful runs
- Avoid previously failed approaches
- Remember user preferences
- Adapt to system constraints

### 7. Loop Detection & Backoff

Prevents infinite loops:

```
Step N tries action → Fails
Step N+1 tries same action → Detected as loop
         ↓
Apply backoff strategy:
• Increase reasoning depth
• Change approach
• Request human intervention
• Or terminate if threshold exceeded
```

---

## Execution Flow Diagram

```
User Request
    ↓
Plan Generation
    ├─ Load system context
    ├─ Load conversation history
    ├─ Load long-term memory
    ├─ Generate steps
    └─ Validate feasibility
    ↓
Step Execution Loop (repeat until done)
    ├─ Select next step
    ├─ Prepare tool inputs
    ├─ Execute tool
    ├─ Collect results
    ├─ Check for loops
    ├─ Update plan if needed
    └─ Check completion
    ↓
Approval Gate? (if configured)
    ├─ Yes → Present to human
    │         ├─ Approved → Continue
    │         └─ Rejected → Stop
    └─ No → Continue
    ↓
Finalization
    ├─ Generate summary
    ├─ Save long-term memory
    ├─ Log audit trail
    └─ Return results
    ↓
User Response
```

---

## Data Structures

### Run Record

```typescript
interface AgentRun {
  id: string;
  agentId: string;
  userId: string;

  // Execution state
  status: 'pending' | 'running' | 'approved' | 'completed' | 'failed';
  plan: AgentPlan;
  currentStepIndex: number;

  // Context & memory
  shortTermMemory: ConversationContext;
  longTermMemoryIds: string[];

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Results
  output: string;
  errorMessage?: string;
  auditLog: AuditEntry[];
}
```

### Agent Plan

```typescript
interface AgentPlan {
  goal: string;
  steps: ExecutionStep[];
  estimatedStepCount: number;
  reasoning: string;
  context: {
    system: string;
    conversation: string;
    longTermMemory: string;
  };
}
```

### Execution Step

```typescript
interface ExecutionStep {
  index: number;
  action: string;
  tool: ToolDefinition;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'pending' | 'executed' | 'failed';
  error?: string;
  timestamp: Date;
}
```

---

## Key Files

### Core System
- `src/features/ai/agent-runtime/core/` — Runtime orchestration
- `src/features/ai/agent-runtime/execution/` — Step runner, loop guards, finalization
- `src/features/ai/agent-runtime/planning/` — Plan generation and re-planning

### Tools & Extensions
- `src/features/ai/agent-runtime/tools/` — Tool definitions
- `src/features/ai/agent-runtime/browsing/` — Playwright integration
- `src/features/ai/agent-runtime/memory/` — Memory management

### Audit & Control
- `src/features/ai/agent-runtime/audit/` — Audit logging
- `src/features/ai/agent-runtime/approval/` — Approval gate orchestration
- `src/features/ai/agent-runtime/store-delegates.ts` — Storage layer

---

## Integration Points

### With Agent Creator
- Agent Creator defines persona configurations
- Agent Runtime uses persona during planning
- Runs are associated with specific agents

### With AI Paths
- AI Paths can invoke Agent Runtime as a node type
- Runtime executes the equivalent of a "RunAgent" node
- Results flow back into the path execution

### With Observability
- All steps logged to observability system
- Failures trigger error classification
- Metrics tracked: execution time, steps, approvals, failures

---

## Common Workflows

### Simple Task Execution

```
1. User: "Find the best pizza place near me"
2. Runtime: Plan → ["Search for pizza places", "Filter by rating", "Get address"]
3. Execution: Run search tool → Get results → Filter → Return top result
4. Result: Address and review of top-rated pizza place
```

### Multi-Step Data Processing

```
1. User: "Summarize Q1 sales and highlight top performers"
2. Runtime: Plan → ["Query Q1 data", "Aggregate by region", "Generate summary", "Identify top performers"]
3. Execution: Each step collects results used in next step
4. Result: Summary with top performers by region
```

### Approval-Required Action

```
1. User: "Update customer contact information"
2. Runtime: Plan → ["Load record", "Validate new data", "Prepare update"]
3. At update step: Needs approval
4. Human: Reviews proposed change → Approves
5. Runtime: Executes update → Saves to database
6. Result: Confirmation of update
```

---

## Error Handling

Errors are classified and handled consistently:

| Error Type | Handling | User Message |
|------------|----------|--------------|
| **Tool execution failed** | Retry with backoff or re-plan | "Action failed, trying alternative approach" |
| **Loop detected** | Switch strategy or request intervention | "Detected repetitive pattern, need guidance" |
| **Context overrun** | Summarize and continue | "Summarizing context to continue" |
| **Approval rejected** | Stop and report | "Action rejected, stopping" |
| **Unrecoverable error** | Terminate and log | "Unable to complete, see error details" |

See `src/shared/errors/error-classifier.ts` for implementation.

---

## Performance Considerations

### Planning Phase
- Plan generation is cached when possible
- Context loading is lazy (only load what's needed)
- Long-term memory queries are indexed

### Step Execution
- Parallel tool execution when safe
- Streaming results for long operations
- Step timeouts prevent hanging

### Memory
- Short-term memory flushed after run completes
- Long-term memory pruned based on age/relevance
- Audit logs compressed after 90 days

---

## Debugging & Monitoring

Monitor Agent Runtime via:

1. **Audit Logs**: Complete action history
   - What action was taken
   - Who approved/rejected
   - Timeline of execution

2. **Run Details**: Full run state
   - Current step
   - Plan and reasoning
   - Memory state
   - Error messages

3. **Metrics**: System health
   - Average execution time
   - Success rate
   - Loop detection rate
   - Approval rate

---

## Next Steps

1. **Understanding Tools**: See [`agent-runtime-tools.md`](./agent-runtime-tools.md)
2. **Approval Workflows**: See [`agent-runtime-approval-gates.md`](./agent-runtime-approval-gates.md)
3. **Debugging Issues**: See [`agent-runtime-debugging.md`](./agent-runtime-debugging.md)
4. **Full Execution Flow**: See [`agent-runtime-execution-flow.md`](./agent-runtime-execution-flow.md)

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive architecture overview
**Related Docs:** AI Features README, Agent Creator overview

