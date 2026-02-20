# Image Studio Object Layout Improvement Plan

Date: 2026-02-20  
Status: In Progress (Phase A complete, Phase B foundation complete, Phase C complete, Integration Phase H complete, Phase I complete, Phase J complete, Phase K complete)

## 1. Scope

This plan covers the Object Layout tool in Image Studio, including shared image analysis used by Object Layout and Auto Scaler.

Primary code surfaces:
- `src/features/ai/image-studio/analysis/shared.ts`
- `src/features/ai/image-studio/server/center-utils.ts`
- `src/app/api/image-studio/slots/[slotId]/center/handler.ts`
- `src/features/ai/image-studio/components/GenerationToolbar.tsx`
- `src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarCenterSection.tsx`
- `src/features/ai/image-studio/components/ImageStudioAnalysisTab.tsx`

Related contracts and tests:
- `src/shared/contracts/image-studio.ts`
- `src/features/ai/image-studio/contracts/center.ts`
- `src/features/ai/image-studio/server/__tests__/center-utils.test.ts`
- `src/app/api/image-studio/slots/[slotId]/center/handler.test.ts`

## 2. Goals

1. Improve object boundary detection robustness for product images on white or near-white backgrounds.
2. Keep server and client behavior consistent for the same image and layout configuration.
3. Make Object Layout easier to tune and validate in UI without trial-and-error.
4. Increase reliability with stronger route-level and algorithmic test coverage.
5. Graduate Object Layout modes from "Experimental" once quality thresholds are met.

## 3. Non-Goals

1. Full semantic segmentation or model-based background removal.
2. New external ML dependencies.
3. Changes to non-image-studio pipelines unrelated to layout/analysis.

## 4. Current Strengths (Already Done)

1. Shared analysis logic is reused across Object Layout and Auto Scaler.
2. Detection telemetry is available (`detectionUsed`, `confidenceBefore`, `detectionDetails`, `scale`).
3. Analysis tab exists and surfaces bounds/whitespace/plan.
4. Route-level tests exist for center/autoscale/analysis/crop/upscale handlers.

## 5. Known Gaps

1. No persisted "confidence threshold" policy for deciding when to trust a detector result vs fallback detector.
2. Limited operator controls for detection sensitivity in Object Layout UI (threshold sliders are not exposed there).
3. No visual overlay preview of detected bounds directly in the Object Layout action flow.
4. No golden-image regression suite with real product fixtures and expected bounds.
5. No staged rollout gate for replacing "Experimental" labels.

## 6. Target KPIs

1. Detection agreement with golden labels:
   - IoU >= 0.90 on clean white backgrounds.
   - IoU >= 0.80 on difficult backgrounds/shadows.
2. Center layout reproducibility:
   - Server/client output bounds delta <= 2 px for 95% of fixture set.
3. Error rate:
   - `SOURCE_OBJECT_NOT_FOUND` under 1% of eligible product images.
4. Latency:
   - P95 server object-layout processing <= 450 ms for <= 4K source images.

## 7. Phased Improvement Plan

### Progress Snapshot (2026-02-20)

Completed:
1. Phase A fixture framework:
   - `analysis/__fixtures__/object-layout/` synthetic fixture pack added.
   - IoU + bounds delta helpers added.
   - Golden regression suite (`shared.golden.test.ts`) added with KPI floor assertions.
2. Phase B policy foundation:
   - Detector arbitration extracted to `analysis/policy.ts`.
   - Policy metadata (`policyVersion`, `policyReason`, `fallbackApplied`, candidate summary) carried through analysis result.
   - Contract schema extended for policy metadata and persisted layout policy metadata.
   - Center/Auto Scaler handlers updated to persist/read policy metadata in layout + detection details.
   - Confidence floor and arbitration tuning are now configurable via env:
     - `IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_AUTO_CONFIDENCE_DELTA`
     - `IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_AUTO_AREA_RATIO_BIAS`
     - `IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_CONFIDENCE_FLOOR`
     - `IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_ALPHA_CONFIDENCE_FLOOR`
     - client-side equivalents with `NEXT_PUBLIC_` prefix.
3. Phase C complete (advanced controls + explainability + presets):
   - Object Layout toolbar now supports advanced detector override and white/chroma thresholds.
   - Analysis tab mirrors advanced detector + threshold controls.
   - Analysis tab now surfaces policy metadata and candidate detector comparison summary.
   - Advanced controls now support shared presets (`default product`, `with shadow`, `hard background`, `transparent PNG`).
   - Advanced defaults are persisted per project/session and reused across Object Layout + Analysis tab.
   - User-defined custom presets (create/update/delete) are now available and shared across Object Layout + Analysis tab.
4. Integration Phase H complete:
   - Auto Scaler now consumes shared detection mode and white/chroma thresholds used by Object Layout + Analysis.
   - Auto Scaler UI now explicitly indicates it follows shared Object Layout detection settings.
5. Phase I complete (analysis-to-action bridge):
   - Analysis tab now persists latest analysis snapshot (layout + policy/confidence metadata) as shared bridge state.
   - Analysis tab can queue apply intents for Object Layout or Auto Scaler.
   - Generation toolbar consumes queued intents for matching slot and auto-applies analysis plan to target tool controls.
   - Manual `Use Analysis Plan` controls added in Object Layout and Auto Scaler panels.
   - Analysis snapshot/apply intent now include source image signature metadata.
   - Stale-plan guard now validates source signature (slot image revision), not only slot id.
   - Optional one-click apply-and-run flow is available from Analysis tab for Object Layout and Auto Scaler.
6. Phase J complete (visual coherence and diagnostics):
   - Shared analysis summary chip now shows detection used, confidence, fallback flag, policy version, and policy reason.
   - Analysis summary chip is rendered in Analysis tab, Object Layout panel, and Auto Scaler panel.
   - Runtime-vs-analysis config mismatch warning now appears when detection/threshold/shadow settings diverge.
7. Phase K complete (end-to-end integration testing):
   - Added deterministic analysis handler assertions for shared preset propagation and low-confidence fallback policy metadata.
   - Added deterministic object-layout handler assertions for analysis-derived layout propagation and persisted/response fallback policy metadata.
   - Added deterministic autoscaler handler assertions for analysis-derived layout propagation and persisted/response fallback policy metadata.
   - Verified all three handler suites together in one Phase K run.

Remaining:
1. Phase B rollout hardening:
   - policy decision metadata surfaced in all UI diagnostics where useful.
2. Phase L onward unchanged.

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
   - `src/features/ai/image-studio/analysis/__tests__/shared.perf.test.ts`

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
