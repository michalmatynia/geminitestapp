
Database node

Direct queries to database

Node with user input pop up, like enter prompt to carry on


I need to have logical operators in Database Query as well, for example, find all products created between and between

* When I select a preset, I want it to Automatically to show the query textfield, but not instantly overwrite my custom preset, only when I start writing over the custom preset, it overwrites what is in the custom preset and the preset selector changes again to custom

Mapping object (from Sample for example) should detect the type of object (if it's a string etc. actually it should come from an established DTO)


I need  AIpaths viewing settings , a button to show only possible inputs and output, not all of them
---

continue working on AI Paths a modular node system for data paths and signal paths for a multiapp platform, extend it with new functionalities better validations, better information clusters, more developed nodes, be inventive and creative, there's no limit to how the data can travel or be changed along these paths. The only limitations is that it has to work within the AI Paths Node Modular system.

LATER - Move the whole Agentic AI configuration into AI Paths, there I want to create specific agents (model sets that will carry out different tasks, like planning, validating formatting etc) that can be used all across platform.

 LATER - add a deep research node, which is a refelection of my ChatBot Agent that has a complex reasoning scheme that is handled by multiple AIs carrying out multiple tasks (planning, validations etc.) exactly as it was configured in the Chatbot Agent. This deep research node should be fully configurable like a chatbot agent, and I should also be able to save different presets of this chabot deep research node, or at least create different instances of it.



converter node that converts imageURLs into base64 images

Reformatter node with AI prompt (self prompting node)

Nodes: evaluator

Looper Node ? stop conditions / iteration limits

Infer Categories and size , material, Lore Tag Automatically

node callbacks for when for example the process has finished conditionally and can loop another attampt


## AI PATHS

Signal paths for different ai tasks
# Agentic AI
Enhance functionality of
1. Planner/replanner vs. executor (already split for you) V
2. Self‑questioning/critique (already split for you) V
* Enhance agentic per step * 3. Extraction/validation model (evidence checking, schema validation, de‑duplication) V
4. Memory validation + summarization (fast model to filter, stronger model to write) V
5. Tool selection & fallback strategy (small model for routing)
6. Loop detection + recovery (fast heuristic + LLM guard) V
7. Safety/approval gate checks (separate policy model) V
8. DOM/selector inference (cheap model good at pattern matching) V
9. Result formatting/normalization (small model to clean outputs) V

when planning or replanning of Agent Job was done by a specific model, stamp the model signature and make it visible Job details
ETC.

segment agent engine.ts and make it modular
disassociate types models
increase type safety

Parser node should take data (result of translation node a single string) and parses it into object, then the data is passed into database and updates are made by object keys. 

I need the ability to take control and log in to the website and give back control. I need a mini website viewer


Sending another prompt during an agent work means I am adjusting, so at this point stop running, do a replan taking the last prompt into consideration and adjust behavior

Connect GPT API to my Agentic Framework
---

node-llama-cpp


Draggable buttons that can be "Dropped" into a node system availability
---


Deep Analysis of AI Paths Modular Node Workflow in Next.js
Architecture snapshot and inferred product goals
Your documentation describes a node-and-wire (graph) runtime that converts a saved graph (“path”) into a reproducible workflow run, driven by a Trigger node and evaluated by propagating values through named ports. This aligns closely with dataflow / flow-based programming models, where computation is expressed as a directed graph of operations and edges represent data dependencies; nodes typically run when their inputs are available. 

A few design goals are strongly implied by the feature set you described:

Reproducibility and post-mortem debugging. You track run history with per-node inputs/outputs, timings, and failures. That’s a major differentiator in workflow systems because it enables root-cause analysis, regression checks, and “replay-ish” capabilities if the execution model is deterministic enough. Comparable stateful workflow engines emphasize recording a durable event history to support inspection and recovery. 

Dual execution environments (browser vs. server). Your “Execution Mode” distinguishes Local (browser runtime engine) vs Server (queued and streamed back). For a Next.js deployment, this is a pragmatic split: interactive iteration locally, and reliable execution/side-effects on the server where credentials, durable state, and job queues live. Next.js Route Handlers provide server-side request handlers using Web Request/Response APIs (and can be implemented in the app directory), which is the natural place to host server execution endpoints. 

Strict, name-based wiring contracts. “Ports are strict by name” is intentionally conservative. It likely keeps the runtime simple and predictable, but it also moves a lot of correctness burden to the UX and validation layers (because a single mismatch silently breaks data propagation if not caught early).

Composable primitives rather than monolithic “steps.” The node set includes small, orthogonal transforms (Parser, Mapper, Mutator, Compare, Validator, Gate, Router, Template, Bundle) plus side-effect nodes (Model, Database, HTTP, Delay). This is consistent with flow-based systems where nodes behave like black boxes with input/output ports. 

node-red-dashboard (node) - Node-RED
A longer introduction | n8n Docs
The state of Flow-based Programming - A system brought to life

Correctness and execution semantics
The most important technical question for AI Paths is not “can it run graphs,” but what exact rules make two runs identical (or intentionally different). Your documentation already contains several semantics that should be formalized because they directly affect correctness and user trust.

Dependency order vs. “runs when inputs are available.” You describe evaluation “in dependency order,” but you also support cycles/handshakes (e.g., Trigger ↔ Simulation quick wiring) and iterative behaviors (Iterator with callback), which breaks the assumption of a pure DAG. If your runtime relies on a strict DAG topological order, cycles must either be rejected or handled by a more event-driven scheduler. Topological ordering only exists for acyclic directed graphs, and DAG scheduling is typically derived from topological sorting constraints. 

The architecture pattern you’ve documented is therefore closer to reactive dataflow (execute when inputs are present) than a pure DAG executor, which is consistent with standard descriptions of dataflow programming. 

Multi-wire semantics (“fan-in”). You collect multiple wires into one input as arrays, but “most nodes use the first value unless configured.” The risk is silent data loss: if a user accidentally connects two upstream values into a single-input node, the run still “works” but uses an arbitrary (or first) value. In workflow systems, this typically becomes a source of subtle production bugs because it looks valid in the UI while producing unexpected behavior.

Actions to improve correctness here:

Introduce port cardinality metadata: single vs many. For single, the editor should block multiple incoming edges (or force the user to insert an explicit “Select First / Merge / Reduce” node). This delegates ambiguity to an explicit operator rather than a hidden convention.
Add graph compilation validation that flags: fan-in to single ports, fan-out from “terminal” nodes, unreachable nodes, incompatible node-to-node type constraints, and cycles except where explicitly allowed by recognized loop constructs (Iterator/Poll patterns).
Make “use first value” an explicit, visible node or configuration, not a default behavior.
runtime.waitForInputs and deadlock risk. Waiting for “all connected input ports” is a reasonable primitive, but on graphs with cycles or optional signals it can create deadlocks (e.g., two nodes each waiting on the other’s output). Dataflow runtimes typically require a clear model for optional inputs and triggering conditions, otherwise “availability” is ambiguous. 

A strong upgrade is to shift from “wait for all connected inputs” to:

“wait for required inputs” (node declares required ports),
plus “optional inputs” (node executes when required ports are available, and optional ones are read if present).
Side-effect nodes “run at most once per graph run.” This is one of the most consequential semantics in the entire system. It reduces accidental duplication, but it also implies you have an internal memoization policy for side effects. This is safe only when the runtime can guarantee idempotency or when the semantics are crystal-clear to users (and visible in debug traces). Otherwise, users will run into scenarios like:

a Router creates two branches that both need a Database update (but only one fires),
an Iterator intends to call HTTP for each item (but HTTP runs once),
a Poll wants to recheck a DB condition (but Database is restricted).
If you keep “execute once” semantics, consider making them explicit and scoped:

“at most once per node instance per run” (likely what you mean),
plus a second mode “per activation” for loops / iterators,
plus explicit deduplication keys for idempotent calls (especially Model, HTTP, Database).
This is similar to how durable workflow systems separate deterministic “workflow logic” from non-deterministic “activities,” where repetition and retries are expected and controlled through recorded history and deterministic constraints. 

Async jobs, durability, and scaling under Next.js constraints
Your Model node supports inline responses or enqueue-only returning a jobId, and your Poll node resolves async results. This is a strong foundation, because it separates “trigger now” from “complete later.” The primary improvement opportunity is making that async layer durable, observable, and cancellation-aware, especially in serverless deployments.

Server execution should assume function limits and streaming constraints. In a hosted Next.js environment (especially on Vercel), long-running server handlers can be affected by maximum duration, runtime constraints, and streaming expectations. Vercel documents configurable maximum duration and that functions are terminated if they exceed the set maximum duration. 

For Edge runtime, Vercel notes that streaming has constraints like requiring the function to begin sending a response within a time window in order to maintain streaming beyond that period. 

So the “Server runs are queued/executed on the server and streamed back” design is directionally correct, but the implementation should be robust to:

handler restarts,
timeouts during a run,
partial streaming interruptions.
Vercel also highlights streaming as a technique to improve perceived latency and notes that Vercel Functions support streaming responses. 

Queue + worker model (durable) vs “in-request job execution.” Your Jobs queue concept points to a durable backlog, but durability depends on implementation. If jobs are stored only in-process or in a best-effort DB record without worker guarantees, you’ll see stuck jobIds and Poll timeouts in real use.

Two well-trodden approaches:

Redis-backed job queues such as BullMQ, which supports retries and backoff strategies and includes production guidance like handling stalled jobs via a scheduler component. 
Serverless-friendly background job systems (message queue + webhook execution), e.g., Upstash’s QStash messaging patterns and background jobs documentation, which are designed for offloading long-running work from request/response cycles. 
Your existing Model→Poll pattern maps cleanly onto either approach: “enqueue job” corresponds to “add to queue,” and Poll corresponds to “query state + eventual deliver.”

Retry semantics should move from “node rerun” to explicit policies. You already record failures per node. The next step is giving each side-effect node a consistent retry model (attempts, backoff, retryable error classes) rather than relying on users to manually re-run a whole path. BullMQ’s retry/backoff guidance is a useful reference point for how production systems formalize retries. 

Cancellation and idempotency are not optional once you have async + polling. If a user re-triggers during a long run, or if “Queue Mode” runs are dropped when switching paths, you need to ensure:

dropped queued runs don’t leave orphan jobs,
retries do not duplicate DB writes,
Poll stops cleanly when a run is canceled.
Durable workflow engines treat cancellation and replay as first-class concepts precisely because async steps fail and restart in practice. 

Caching, data management, and persistence strategy
You have two interacting caching systems:

Workflow/runtime caching (runtime.cache.mode: auto|force|disabled per node).
Framework caching (Next.js server fetch caching / revalidation behavior).
These need clear boundaries to prevent “ghost bugs” where data is unexpectedly reused.

Next.js caching defaults and controls are nuanced and have evolved. Next.js extends fetch() with caching and revalidation semantics on the server, and provides segment-level configuration escape hatches. 

Next.js has also changed default caching behaviors across versions (e.g., GET Route Handler caching defaults). 

Given you’re building a workflow engine where reproducibility matters, you should treat framework caching as an infrastructure optimization, not as part of the workflow’s correctness model.

Recommended boundary:

Workflow runtime caching should be explicitly tied to node purity and inputs hash.
Next.js caching should only accelerate “read-only” server endpoints and should be disabled (no-store / dynamic) for run execution and run-stream endpoints to avoid serving stale run state.
Next.js provides both conceptual and API-level guidance for caching and revalidation, including time-based revalidation using fetch options and route segment config. 

Run storage should be event-like, not snapshot-only. You already store node history and events, which suggests an event log. There are strong benefits to append-only run event storage: debugging, auditability, and the ability to reconstruct state transitions (rather than only storing the final node outputs). Microsoft’s guidance on event sourcing highlights the advantages of immutable, append-only events and background processing patterns. 

Similarly, classic event sourcing definitions emphasize recording every state change as a sequence of events. 

In practice, a hybrid model tends to work best for workflow systems:

Append-only event log for: node start/finish, errors, retries, output references.
Periodic snapshots for: current run state, last-known outputs for fast UI hydration.
Large payload strategy. Because you deal with images (URLs converted to base64 for vision calls) and potentially large Model outputs, you’ll likely benefit from storing large artifacts as blobs and keeping run history as references. If you use Vercel-native storage, Vercel Blob supports streaming retrieval patterns that can work well for large artifacts. 

This reduces DB bloat and keeps run history “inspectable” without duplicating large data.

Security and governance risks specific to node workflows
Workflow editors concentrate power: if a user can wire an HTTP node to arbitrary URLs, run a DB node with broad access, and feed results into a Model node, the platform becomes a programmable integration surface. That is powerful—but it also creates predictable security risks.

SSRF risk via HTTP Fetch and image URL ingestion. Any server-side feature that fetches a user-controlled URL (including “convert image URL to base64”) can create Server-Side Request Forgery (SSRF) exposure unless you validate destinations, schemes, DNS resolution, and redirects. OWASP explicitly recommends allowlist-based validation and careful URL enforcement for SSRF prevention. 

This is especially relevant if:

HTTP node accepts templated URLs from upstream user-controlled data,
Model node fetches images from URLs on the server,
Database Schema node exposes internal structure for AI prompting.
Practical mitigations that fit your architecture:

Implement a central URL policy engine used by HTTP Fetch and any server-side image fetching:
allow only https://,
block private IP ranges and metadata endpoints,
resolve DNS and validate resolved IP, defend against DNS rebinding,
disable redirects or re-validate after redirect. 
Add per-workspace “Connections” and require credentials to be stored server-side; API Advanced already suggests authMode patterns—make that the standard, and disallow secrets in Local execution.
Introduce role-based access controls for “dangerous nodes” (Database, HTTP, Model, DB Schema), so not every user/workspace can run arbitrary integrations.
CSRF and trigger endpoints. If triggers can be invoked from the browser and cause server execution with side effects, you should ensure standard CSRF protections (or robust same-site / token-based protections) for authenticated actions. OWASP’s CSRF guidance provides concrete defensive controls. 

Next.js also notes that API Routes are same-origin by default unless you add CORS headers, but you still need to validate request bodies and authorization server-side. 

LLM governance. Because Model/Agent nodes can call LLMs with structured context and DB schema, consider:

redacting PII fields from Context Filter or DB Schema outputs,
restricting which collections/fields can be exposed to LLM prompts,
storing prompt + model config + model version in run history for compliance and reproducibility.
Observability, debugging UX, and operational excellence
You already store run/node history. The highest leverage next move is to connect that history to standard observability tooling and to improve the debugging experience inside the editor.

Distributed tracing for runs and nodes. Next.js recommends OpenTelemetry for instrumentation, and provides guidance for setting up tracing. 

Vercel’s tracing docs describe how instrumented applications appear with spans across infrastructure, fetch, and framework operations, and note context propagation support in Next.js. 

OpenTelemetry’s tracing concepts emphasize context propagation as core to correlating spans into traces. 

What “good” looks like for AI Paths:

One trace per runId.
One span per node execution (with attributes: nodeId, nodeType, cacheMode, waitForInputs, attempt, status).
Links across async boundaries:
Trigger span → enqueue job span → Poll span → resume downstream span.
Logs correlated by runId + nodeId, with structured fields rather than unstructured console output.
This turns “run history” into something you can query: slowest nodes by percentile, most common failure types, retry hot spots, etc.

Debugging UX inspired by established workflow consoles. AWS Step Functions highlights browsing execution details with state-by-state inputs/outputs and execution status, which is the mental model users expect when workflows get complex. 

Your Result Viewer node is a good primitive, but you will likely want a dedicated “Run Explorer” UI that:

shows a timeline (node start/end),
highlights the active path taken through Router/Gate,
allows diffing retries (attempt 1 vs attempt 2),
supports “rerun from node” where safe (with idempotency controls).
Reproducibility mechanics. If you want “retry / rerun / requeue” to behave predictably, you need to capture:

node config snapshot at run start,
resolved templates/prompts,
resolved connection IDs (not secrets),
runtime version / node definition version.
Temporal’s documentation on event history and replay illustrates why deterministic constraints and recorded history enable reliable continuation. 

You don’t need to become a full Temporal-like engine to benefit from these ideas; selective adoption (versioned run snapshots + deterministic node contracts) will already reduce “works on my machine” incidents.

Improvement roadmap with priorities and measurable outcomes
This roadmap assumes you want to preserve your current product shape (node editor + local/server execution + async jobs) while improving correctness, reliability, and maintainability. The phases are ordered by risk reduction and ROI.

Near-term foundation

Formalize a Graph Contract (compile step).
Define a versioned graph schema that includes port types, cardinality, required vs optional inputs, and node “purity” classification (pure vs side-effect). This enables static validation and unlocks editor guidance. Use topological/DAG checks where applicable, and explicit loop constructs for cycles. 

Eliminate silent fan-in behavior.
Replace “most nodes use first value” with explicit selection/merge primitives, editor warnings, and port cardinality enforcement. This will reduce the hardest class of bugs: workflows that “run” but do the wrong thing.

Refactor waitForInputs into required/optional semantics.
Make deadlocks less likely by executing nodes when required inputs are available, reading optional inputs opportunistically. This is consistent with dataflow models and avoids brittle “all inputs must be present” gating. 

Reliability and scaling 4) Harden async job execution with a durable queue.
Choose one:

BullMQ-style queue + worker with retries/backoff and stalled-job handling, 

or
serverless background job delivery (enqueue + callback execution). 

Whichever you choose, implement: idempotency keys, cancellation propagation, retry policies per node, and explicit job/run state transitions.
Make server execution endpoints stream-safe and timeout-safe.
Treat server execution as “start run → stream progress → finish,” but ensure the system still works when streaming breaks mid-flight. Respect function duration constraints and avoid running long workflows solely inside a request handler. 
Security and governance 6) Centralize outbound request controls.
Add an SSRF defense layer for HTTP Fetch and server-side image fetching (allowlists, scheme restrictions, DNS/IP validation, redirect handling). 

Then add node-level permissions and workspace policies so only trusted users can run sensitive nodes.

Lock down secrets and Local mode.
Ensure Local execution cannot access DB credentials or API keys. If Local mode orchestrates but calls server for side-effect nodes, make that explicit and enforce it in code and UI.
Observability and developer experience 8) Adopt OpenTelemetry for run/node tracing.
Implement runId/nodeId spans via Next.js instrumentation guidance, and export traces to your backend. 

Build a Run Explorer UI (beyond per-node Viewer).
Model it after mature workflow consoles: timeline, per-node inputs/outputs, retries, branch visualization, and safe “rerun from here.” 
Success metrics to confirm improvements

Reduction in “no output in Viewer” / wiring mismatch incidents via compile-time validation (track editor error rates).
Reduced mean-time-to-debug (MTTD) using run explorer + tracing (time from failure to root cause).
Lower job failure and stuck-job rates after durable queue adoption (jobs completed / jobs enqueued).
Fewer security exceptions: blocked SSRF attempts, validated domains, and reduced scope of data exposed to prompts. 