---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'superseded'
doc_type: 'plan'
scope: 'cross-feature'
superseded_by: 'docs/plans/image-studio-object-layout-improvement-plan.md'
---

# Deprecated Location

The canonical Image Studio object layout improvement plan moved to:

- `docs/plans/image-studio-object-layout-improvement-plan.md`

Please update references to the new path.

### Phase A: Detection Quality Framework

Objectives:

- Build repeatable quality baseline before changing detection behavior.

Tasks:

1. Add fixture set and expected bounds (small curated dataset):
   - `src/features/ai/image-studio/analysis/__fixtures__/object-layout/`
2. Add golden tests for detector output and confidence:
   - `src/features/ai/image-studio/analysis/__tests__/shared.golden.test.ts`
3. Add synthetic edge-case generators:
   - border noise, faint shadows, off-white background drift, alpha artifacts.
4. Add helper assertions for IoU and boundary deltas.

Acceptance:

1. Golden suite stable in CI.
2. Baseline metric report generated for current detector behavior.

### Phase B: Detection Policy v2

Objectives:

- Make detector choice and confidence handling more predictable.

Tasks:

1. Introduce policy module for detector arbitration:
   - `src/features/ai/image-studio/analysis/policy.ts`
2. Add confidence thresholds and tie-break rules:
   - white detector confidence floor
   - alpha detector fallback conditions
3. Persist policy version in metadata:
   - `center.layoutPolicyVersion`
   - `center.detectionPolicyDecision`
4. Extend `ImageStudioDetectionDetails` to include:
   - `policyReason`
   - `fallbackApplied`
   - `candidateDetections` summary

Acceptance:

1. Golden IoU improves without regression on easy fixtures.
2. Route responses include policy metadata for debugging.

### Phase C: Advanced Layout Controls

Objectives:

- Expose enough controls to tune difficult images from the main Object Layout tool.

Tasks:

1. Add optional advanced panel in `GenerationToolbarCenterSection`:
   - white threshold
   - chroma threshold
   - detector override (`auto`, `white`, `alpha`)
2. Keep defaults unchanged to avoid breaking existing usage.
3. Persist per-project or per-session layout presets:
   - default product
   - with shadow
   - hard background
4. Mirror controls in Analysis tab for parity.

Acceptance:

1. User can tune and re-run layout without leaving Object Layout flow.
2. Presets apply consistently in Object Layout and Analysis tab.

### Phase D: Visual Explainability in Workflow

Objectives:

- Reduce blind execution by showing what detector sees before applying.

Tasks:

1. Add "Preview Detection" action in center section.
2. Render overlay for:
   - source detected bounds
   - target bounds preview
   - whitespace guides
3. Add confidence indicator with warning state if confidence is low.
4. Add "Apply anyway" vs "adjust thresholds" prompt on low confidence.

Acceptance:

1. Users can inspect detection before mutation.
2. Low-confidence runs produce explicit UI warnings.

### Phase E: Reliability and Fallback Hardening

Objectives:

- Improve failure handling and make behavior explicit.

Tasks:

1. Add explicit error path tests for center handler:
   - source too large
   - source object not found
   - output invalid
   - client fallback when source unavailable
2. Add integration tests for client->server fallback behavior in toolbar actions.
3. Add structured error mapping in UI with actionable messages.

Acceptance:

1. All critical error codes have direct tests and user-facing messages.
2. No ambiguous "Failed to layout image object." for known cases.

### Phase F: Performance and Caching

Objectives:

- Avoid duplicate analysis work and reduce P95 latency.

Tasks:

1. Add in-request analysis reuse in center handler:
   - avoid duplicate decode/detection in related calls.
2. Add optional short-lived analysis cache keyed by:
   - source signature
   - normalized layout signature
   - pipeline version
3. Add lightweight benchmark tests:
   - under `src/features/ai/image-studio/analysis/__tests__/` (keep benchmark coverage separate from golden-regression assertions)

Acceptance:

1. P95 latency improvement measured against baseline.
2. No correctness regression in golden tests.

### Phase G: Rollout and De-Experimentalization

Objectives:

- Move Object Layout from experimental to standard mode safely.

Tasks:

1. Add rollout flags:
   - `IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_V2_ENABLED`
   - `IMAGE_STUDIO_OBJECT_LAYOUT_ADVANCED_UI_ENABLED`
2. Run shadow mode logging in production-like environment:
   - compare old/new detector choices and confidence outcomes.
3. Remove "(Experimental)" label in center mode options once KPIs are met.
4. Publish operator runbook for troubleshooting and recommended presets.

Acceptance:

1. KPI targets met for two consecutive validation runs.
2. Experimental label removed with no major incidents.

## 11. Integration Improvement Plan (Analysis + Object Layout + Auto Scaler)

### Phase H: Shared Configuration Integration (In Progress)

Objectives:

- Make all three tools execute with the same detection policy defaults and user presets.

Tasks:

1. Share advanced detection config storage across Analysis and Object Layout:
   - detector mode
   - white threshold
   - chroma threshold
   - shadow policy
2. Add built-in + custom preset management as a shared utility.
3. Ensure Auto Scaler request payload uses shared detection + threshold config.
4. Show integration hint in Auto Scaler UI to reduce ambiguity.

Acceptance:

1. Updating advanced settings in Analysis or Object Layout affects both tools.
2. Auto Scaler uses the same detector policy settings in its server/client runs.
3. Custom presets are available in both Analysis and Object Layout panels.

### Phase I: Analysis-to-Action Bridging

Objectives:

- Reduce manual copy/re-entry between analysis and execution tools.

Tasks:

1. Add action buttons in Analysis tab:
   - `Apply To Object Layout`
   - `Apply To Auto Scaler`
2. Persist last analysis plan signature per slot:
   - source slot id
   - layout signature
   - detector policy metadata
3. Add stale-plan guard:
   - detect if source image changed since analysis
   - prompt user to rerun analysis before apply

Acceptance:

1. User can run analysis and launch layout/autoscale with one click.
2. stale-plan warning blocks accidental apply of obsolete analysis results.

### Phase J: Visual Coherence and Diagnostics

Objectives:

- Make detector decisions and planned transforms visible in every tool entry point.

Tasks:

1. Add shared "analysis summary chip" component:
   - detection used
   - confidence
   - fallback applied
   - policy reason
2. Show the chip in:
   - Analysis tab result header
   - Object Layout panel
   - Auto Scaler panel
3. Add threshold mismatch warnings if runtime payload differs from saved preset.

Acceptance:

1. All tools present consistent policy/confidence diagnostics.
2. Operators can identify why outputs differ without reading raw JSON payloads.

### Phase K: End-to-End Integration Testing

Objectives:

- Lock integration behavior with deterministic tests.

Tasks:

1. Add integration-focused tests for shared preset propagation.
2. Add action-chain tests:
   - analysis -> object layout
   - analysis -> autoscale
3. Add fallback policy assertion tests for low-confidence scenarios across all three tools.

Acceptance:

1. Integration tests fail on any regression in shared settings propagation.
2. Analysis/center/autoscale alignment remains stable after refactors.

## 8. Testing Strategy Expansion

1. Unit:
   - detector policy, bounds math, normalization, confidence scoring.
2. Contract:
   - extended response metadata and backward compatibility.
3. Route:
   - center handler positive and negative paths.
4. UI:
   - control state persistence, low-confidence warning behavior.
5. Regression:
   - golden fixture snapshots.

## 9. Execution Order Recommendation

1. Phase A first.
2. Phase B next.
3. Phase C and D in parallel once B stabilizes.
4. Phase E immediately after C/D.
5. Phase F after reliability is stable.
6. Phase G last.

## 10. Definition of Done

1. Object Layout and Analysis tool share the same configurable detection policy.
2. Users can tune detection and preview layout results before applying.
3. Robust error handling and deterministic dedupe/idempotency behavior are fully tested.
4. KPI targets are met and experimental status is removed.
