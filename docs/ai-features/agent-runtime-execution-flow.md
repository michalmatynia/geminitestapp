---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'technical-guide'
scope: 'ai-features'
canonical: true
---

# Agent Runtime — Execution Flow Guide

Detailed walkthrough of how the Agent Runtime executes a complete agent run from start to finish.

## Complete Execution Lifecycle

```
User Request
    ↓
[PLANNING PHASE]
    ├─ Initialize Run Record
    ├─ Load Context (system, conversation, long-term memory)
    ├─ Generate Initial Plan
    ├─ Validate Plan Feasibility
    └─ Set status: "pending"
    ↓
[EXECUTION PHASE]
    ├─ Loop: Execute Each Step
    │  ├─ Select step from plan
    │  ├─ Prepare tool inputs
    │  ├─ Execute tool
    │  ├─ Collect results
    │  ├─ Check for loops
    │  ├─ Update plan if needed
    │  └─ Check completion
    └─ Set status: "running"
    ↓
[APPROVAL PHASE] (if configured)
    ├─ Collect pending actions
    ├─ Present to human reviewer
    ├─ Wait for decision
    └─ Set status: "approved" or "rejected"
    ↓
[FINALIZATION PHASE]
    ├─ Generate Summary
    ├─ Save Long-term Memory
    ├─ Log Audit Trail
    ├─ Cleanup Resources
    └─ Set status: "completed" or "failed"
    ↓
Return to User
```

---

## Phase 1: Planning Phase

### 1.1 Initialize Run Record

```typescript
// Create initial run record
const run: AgentRun = {
  id: generateId(),
  agentId: personaId,
  userId: currentUserId,
  status: 'pending',
  shortTermMemory: {},
  longTermMemoryIds: [],
  auditLog: [],
  createdAt: new Date(),
};

// Store in database
await agentRunRepository.create(run);
```

### 1.2 Load Context

Three types of context are loaded and combined:

**System Context**
```typescript
// Load agent's system instructions
const systemContext = await agentRepository.getSystemPrompt(agentId);

// Includes:
// - Agent's personality traits
// - Available tools
// - Constraints and guidelines
// - Safety rules
```

**Conversation Context**
```typescript
// Load previous conversation history
const conversationContext = await chatbotRepository.getRecentMessages({
  sessionId: currentSessionId,
  limit: 20,
});

// Includes:
// - User's previous requests
// - Agent's previous responses
// - Current conversation thread
```

**Long-term Memory Context**
```typescript
// Load learned patterns and preferences
const longTermMemory = await memoryRepository.getRelevantMemories({
  agentId,
  userId,
  maxTokens: 2000,
});

// Includes:
// - Successful past patterns
// - User preferences
// - Known constraints
// - System state snapshots
```

**Combined Context**
```typescript
const planningContext = {
  system: systemContext,
  conversation: conversationContext,
  longTermMemory: longTermMemory,

  // Calculate total tokens
  totalTokens: countTokens(systemContext) +
               countTokens(conversationContext) +
               countTokens(longTermMemory),
};

// Store in run record for later access
run.plan.context = planningContext;
```

### 1.3 Generate Initial Plan

The AI model generates a step-by-step plan:

```typescript
// Call LLM to generate plan
const planningPrompt = `
You are ${agentId}.

SYSTEM CONTEXT:
${planningContext.system}

CONVERSATION HISTORY:
${planningContext.conversation}

YOUR KNOWLEDGE:
${planningContext.longTermMemory}

USER REQUEST: ${userRequest}

Generate a step-by-step plan to accomplish this task.
For each step, specify:
1. What you'll do
2. Which tool to use
3. Expected output
4. How you'll know it succeeded

Plan with 3-7 steps (balance detail with efficiency).
`;

const response = await llm.complete({
  model: agentConfig.model,
  temperature: 0.3,  // Lower = more consistent plans
  messages: [{ role: 'user', content: planningPrompt }],
});

// Parse plan from response
const plan = parsePlan(response);

// Validate plan
if (!isValidPlan(plan)) {
  throw new Error('Generated plan is invalid');
}

run.plan = {
  goal: userRequest,
  steps: plan.steps,
  estimatedStepCount: plan.steps.length,
  reasoning: plan.reasoning,
  context: planningContext,
};
```

### 1.4 Validate Plan Feasibility

Check that the plan is achievable:

```typescript
function validatePlan(plan: AgentPlan, availableTools: Tool[]): boolean {
  // Check all requested tools are available
  for (const step of plan.steps) {
    const tool = availableTools.find(t => t.name === step.tool.name);
    if (!tool) {
      console.error(`Tool not found: ${step.tool.name}`);
      return false;
    }
  }

  // Check plan isn't too long
  if (plan.steps.length > MAX_STEPS) {
    console.error(`Plan too long: ${plan.steps.length} steps`);
    return false;
  }

  // Check context didn't exceed token limits
  if (plan.context.totalTokens > MAX_CONTEXT_TOKENS) {
    console.error(`Context too large: ${plan.context.totalTokens} tokens`);
    return false;
  }

  return true;
}

if (!validatePlan(run.plan, availableTools)) {
  run.status = 'failed';
  run.errorMessage = 'Plan validation failed';
  await agentRunRepository.update(run);
  throw new Error('Plan validation failed');
}
```

---

## Phase 2: Execution Phase

### 2.1 Step Execution Loop

For each step in the plan:

```typescript
async function executeStep(
  run: AgentRun,
  step: ExecutionStep,
  stepIndex: number
): Promise<void> {
  step.index = stepIndex;
  step.status = 'pending';
  step.timestamp = new Date();

  try {
    // 2.1.1: Prepare tool inputs
    const inputs = await prepareInputs(step, run);

    // 2.1.2: Execute tool
    const result = await executeTool(step.tool.name, inputs);

    // 2.1.3: Collect results
    step.outputs = result;
    step.status = 'executed';

    // 2.1.4: Check for loops
    await checkForLoops(run, step);

    // 2.1.5: Optionally update plan
    if (shouldReplan(run, step)) {
      await replannRemainingSteps(run, step);
    }

  } catch (error) {
    // Handle step failure
    step.status = 'failed';
    step.error = error.message;

    // Decide whether to retry, replan, or fail
    if (shouldRetry(error, stepIndex)) {
      await executeStep(run, step, stepIndex);
    } else if (shouldReplan(run, step)) {
      await replannRemainingSteps(run, step);
    } else {
      throw error;
    }
  }
}

// Run the loop
run.status = 'running';
for (let i = 0; i < run.plan.steps.length; i++) {
  const step = run.plan.steps[i];
  run.currentStepIndex = i;
  await executeStep(run, step, i);

  // Periodically save run state
  if (i % 5 === 0) {
    await agentRunRepository.update(run);
  }
}
```

### 2.2 Prepare Tool Inputs

Each step specifies inputs. These need to be prepared:

```typescript
async function prepareInputs(
  step: ExecutionStep,
  run: AgentRun
): Promise<Record<string, unknown>> {
  const inputs: Record<string, unknown> = {};

  // For each expected input
  for (const [key, spec] of Object.entries(step.tool.inputSchema)) {
    let value: unknown;

    // Input can come from:
    // 1. Literal values
    if (step.inputs[key] !== undefined) {
      value = step.inputs[key];
    }
    // 2. Previous step outputs
    else if (spec.source === 'previous_step') {
      const prevStep = run.plan.steps[spec.stepIndex];
      value = prevStep.outputs?.[spec.outputKey];
    }
    // 3. Conversation context
    else if (spec.source === 'context') {
      value = extractFromContext(run.plan.context, spec.path);
    }
    // 4. Long-term memory
    else if (spec.source === 'memory') {
      value = extractFromMemory(run, spec.path);
    }

    // Validate input type
    if (!validateType(value, spec.type)) {
      throw new Error(
        `Invalid input for ${key}: expected ${spec.type}, got ${typeof value}`
      );
    }

    inputs[key] = value;
  }

  return inputs;
}
```

### 2.3 Execute Tool

Call the actual tool implementation:

```typescript
async function executeTool(
  toolName: string,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tool = TOOLS[toolName];

  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  // Timeout protection
  const timeout = setTimeout(() => {
    throw new Error(`Tool execution timeout: ${toolName}`);
  }, tool.timeoutMs || 30000);

  try {
    // Execute tool with proper error handling
    const result = await tool.execute(inputs);
    clearTimeout(timeout);

    // Validate output
    if (!validateOutput(result, tool.outputSchema)) {
      throw new Error(`Invalid tool output for ${toolName}`);
    }

    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
```

### 2.4 Check for Loops

Detect if the agent is repeating failed attempts:

```typescript
async function checkForLoops(run: AgentRun, currentStep: ExecutionStep): Promise<void> {
  // Look for repeated failed patterns
  const recentSteps = run.plan.steps.slice(
    Math.max(0, run.currentStepIndex - 5),
    run.currentStepIndex + 1
  );

  const failedTools = recentSteps
    .filter(s => s.status === 'failed')
    .map(s => s.tool.name);

  // Check if same tool failed multiple times
  const failureCount = failedTools.filter(t => t === currentStep.tool.name).length;

  if (failureCount >= 3) {
    // Loop detected!
    const loopError = new LoopDetectedError(
      `Tool '${currentStep.tool.name}' failed ${failureCount} times`
    );

    // Decide action
    if (shouldRequestIntervention(run)) {
      run.status = 'pending_human_intervention';
      run.auditLog.push({
        action: 'LOOP_DETECTED_WAITING_INTERVENTION',
        timestamp: new Date(),
        details: loopError,
      });
      await agentRunRepository.update(run);

      // Notify human and wait
      await notifyHuman(run, loopError);
      return;
    } else {
      // Apply backoff strategy
      await applyBackoffStrategy(run, currentStep, loopError);
    }
  }
}

function shouldRequestIntervention(run: AgentRun): boolean {
  // Request intervention if:
  // - Agent is configured for approval gates
  // - Loop has occurred multiple times
  // - High-risk operation failed
  return (
    run.approvalsRequired ||
    run.plan.steps.filter(s => s.status === 'failed').length > 5
  );
}

async function applyBackoffStrategy(
  run: AgentRun,
  step: ExecutionStep,
  error: Error
): Promise<void> {
  // Try different approach
  const replanPrompt = `
Previous attempt failed: ${error.message}

${JSON.stringify(step, null, 2)}

What alternative approach should we try?
`;

  const alternatives = await llm.complete({
    model: run.agentConfig.model,
    prompt: replanPrompt,
  });

  // Replan with alternatives
  const newPlan = parsePlan(alternatives);

  // Update current step with new approach
  step.tool = newPlan.steps[0].tool;
  step.inputs = newPlan.steps[0].inputs;
  step.status = 'pending';
  step.timestamp = new Date();
}
```

---

## Phase 3: Approval Phase

If approval is required:

### 3.1 Collect Pending Actions

```typescript
async function collectPendingApprovals(run: AgentRun): Promise<ApprovalRequest[]> {
  const approvals: ApprovalRequest[] = [];

  for (const step of run.plan.steps) {
    if (step.status === 'executed' && step.tool.requiresApproval) {
      approvals.push({
        stepIndex: step.index,
        tool: step.tool.name,
        inputs: step.inputs,
        outputs: step.outputs,
        reason: step.tool.approvalReason,
        riskLevel: assessRiskLevel(step),
      });
    }
  }

  return approvals;
}
```

### 3.2 Present to Human

```typescript
async function presentForApproval(run: AgentRun, approvals: ApprovalRequest[]): Promise<void> {
  // Create approval request UI
  const approvalUI = {
    agentName: run.agentConfig.name,
    goal: run.plan.goal,
    completedSteps: run.currentStepIndex,
    totalSteps: run.plan.steps.length,
    approvals: approvals.map(a => ({
      step: a.stepIndex,
      action: a.tool,
      inputs: a.inputs,
      outputs: a.outputs,
      reason: a.reason,
      risk: a.riskLevel,
    })),
  };

  // Notify human
  run.status = 'pending_approval';
  run.auditLog.push({
    action: 'PENDING_HUMAN_APPROVAL',
    timestamp: new Date(),
    approvals: approvalUI,
  });

  await agentRunRepository.update(run);
  await notificationService.sendApprovalRequest(run.userId, approvalUI);

  // Wait for response (with timeout)
  const response = await waitForApprovalResponse(run.id, APPROVAL_TIMEOUT);

  if (response.approved) {
    run.status = 'approved';
    run.auditLog.push({
      action: 'APPROVALS_GRANTED',
      timestamp: new Date(),
      approvals: response.approvedActions,
      approver: response.approvedBy,
    });
  } else {
    run.status = 'rejected';
    run.errorMessage = response.rejectionReason;
    run.auditLog.push({
      action: 'APPROVALS_REJECTED',
      timestamp: new Date(),
      reason: response.rejectionReason,
      rejectedBy: response.rejectedBy,
    });
    throw new Error('Human rejected approval');
  }
}
```

---

## Phase 4: Finalization Phase

### 4.1 Generate Summary

```typescript
async function generateSummary(run: AgentRun): Promise<string> {
  const summaryPrompt = `
You executed the following plan to achieve: "${run.plan.goal}"

Steps executed:
${run.plan.steps
  .map((s, i) => `
${i + 1}. ${s.action}
   Tool: ${s.tool.name}
   Status: ${s.status}
   ${s.outputs ? `Result: ${JSON.stringify(s.outputs)}` : ''}
`)
  .join('\n')}

Generate a concise summary (2-3 sentences) of what was accomplished.
`;

  const summary = await llm.complete({
    model: run.agentConfig.model,
    prompt: summaryPrompt,
  });

  return summary;
}
```

### 4.2 Save Long-term Memory

```typescript
async function saveLongTermMemory(run: AgentRun): Promise<void> {
  // Extract learnings from this run
  const learnings: Memory[] = [];

  // Pattern: successful sequence
  const successfulSteps = run.plan.steps.filter(s => s.status === 'executed');
  if (successfulSteps.length > 0) {
    learnings.push({
      type: 'successful_pattern',
      pattern: successfulSteps.map(s => ({
        tool: s.tool.name,
        inputs: s.inputs,
      })),
      context: run.plan.context.conversation,
      timestamp: new Date(),
      relevance: 0.8,
    });
  }

  // Pattern: failure and recovery
  const failedSteps = run.plan.steps.filter(s => s.status === 'failed');
  if (failedSteps.length > 0) {
    learnings.push({
      type: 'failure_mode',
      failedTool: failedSteps[0].tool.name,
      error: failedSteps[0].error,
      recovery: failedSteps[0].status === 'recovered' ? 'successful' : 'unsuccessful',
      timestamp: new Date(),
      relevance: 0.6,
    });
  }

  // User preference: detected interaction pattern
  learnings.push({
    type: 'user_preference',
    preference: extractPreferences(run),
    timestamp: new Date(),
    relevance: 0.7,
  });

  // Save all learnings
  for (const learning of learnings) {
    await memoryRepository.save({
      agentId: run.agentId,
      userId: run.userId,
      memory: learning,
      ttl: calculateTTL(learning.type),
    });
  }
}
```

### 4.3 Log Audit Trail

```typescript
async function finalizeAuditLog(run: AgentRun): Promise<void> {
  run.auditLog.push({
    action: 'EXECUTION_COMPLETED',
    timestamp: new Date(),
    summary: {
      status: run.status,
      stepsExecuted: run.currentStepIndex + 1,
      totalSteps: run.plan.steps.length,
      successRate: calculateSuccessRate(run),
      totalTime: Date.now() - run.createdAt.getTime(),
    },
  });

  // Archive old audit entries (keep last 100)
  const entriesToKeep = 100;
  if (run.auditLog.length > entriesToKeep) {
    const archived = run.auditLog.splice(0, run.auditLog.length - entriesToKeep);
    await auditRepository.archive(run.id, archived);
  }

  await agentRunRepository.update(run);
}
```

### 4.4 Cleanup Resources

```typescript
async function cleanupResources(run: AgentRun): Promise<void> {
  // Close any open connections
  if (run.browserSession) {
    await run.browserSession.close();
  }

  // Flush temporary memory
  run.shortTermMemory = null;

  // Release locks/semaphores
  await releaseExecutionLock(run.id);

  // Compress old runs
  if (shouldCompress(run)) {
    await compressRunData(run);
  }
}
```

### 4.5 Mark Complete

```typescript
async function markComplete(run: AgentRun): Promise<void> {
  run.status = 'completed';
  run.completedAt = new Date();

  await agentRunRepository.update(run);

  // Notify user
  await notificationService.sendRunComplete({
    userId: run.userId,
    runId: run.id,
    summary: run.output,
    duration: run.completedAt.getTime() - run.createdAt.getTime(),
  });
}
```

---

## Error Handling Throughout Flow

```typescript
// At each phase, errors are caught and handled:

try {
  // PLANNING PHASE
  const plan = await generatePlan();

  // EXECUTION PHASE
  for (const step of plan.steps) {
    await executeStep(step);
  }

  // APPROVAL PHASE
  if (needsApproval) {
    await getApprovalForActions();
  }

  // FINALIZATION PHASE
  await finalize();

} catch (error) {
  // Error classification
  const errorType = classifyError(error);

  // Log error with context
  run.auditLog.push({
    action: 'ERROR',
    timestamp: new Date(),
    errorType: errorType.category,
    errorMessage: error.message,
    context: {
      phase: currentPhase,
      step: run.currentStepIndex,
      plan: run.plan,
    },
  });

  // Determine recovery strategy
  if (isRecoverable(error)) {
    // Retry or replan
    await recoverFromError(run, error);
  } else {
    // Mark as failed and cleanup
    run.status = 'failed';
    run.errorMessage = error.message;
    await finalizeAuditLog(run);
    await cleanupResources(run);
  }
}
```

---

## Monitoring & Observability

Track execution progress:

```typescript
// Emit progress events
eventBus.emit('run:started', { runId: run.id });

for (let i = 0; i < run.plan.steps.length; i++) {
  eventBus.emit('step:started', {
    runId: run.id,
    stepIndex: i,
    tool: run.plan.steps[i].tool.name,
  });

  await executeStep(run.plan.steps[i], i);

  eventBus.emit('step:completed', {
    runId: run.id,
    stepIndex: i,
    duration: stepEndTime - stepStartTime,
    status: run.plan.steps[i].status,
  });
}

// Log metrics
metrics.record('agent_run', {
  totalDuration: Date.now() - run.createdAt.getTime(),
  stepCount: run.plan.steps.length,
  successRate: calculateSuccessRate(run),
  approvalCount: countApprovals(run),
  loopsDetected: countLoopDetections(run),
});
```

---

## Common Execution Patterns

### Pattern 1: Sequential Steps (Simple)
```
Step 1: Gather data
  ↓
Step 2: Process data
  ↓
Step 3: Generate output
```

### Pattern 2: Conditional Steps (Branching)
```
Step 1: Check condition
  ├─ If true → Step 2a
  └─ If false → Step 2b
  ↓
Step 3: Merge results
```

### Pattern 3: Loop with Retry
```
Step 1: Try action
  ├─ Success → Continue
  └─ Failure → Retry (up to 3 times)
    └─ Still failing → Request intervention
```

### Pattern 4: Parallel Steps (When Safe)
```
Step 1a: Fetch from API A
Step 1b: Fetch from API B (parallel)
  ↓
Step 2: Combine results
```

---

## Next Steps

1. **Tool Definitions**: See `agent-runtime-tools.md`
2. **Approval Workflows**: See `agent-runtime-approval-gates.md`
3. **Debugging**: See `agent-runtime-debugging.md`

---

**Last Updated:** 2026-03-21
**Status:** Complete execution flow guide
**Related Docs:** Agent Runtime overview, Tools guide, Approval gates guide
