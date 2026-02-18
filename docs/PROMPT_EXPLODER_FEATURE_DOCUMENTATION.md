# Prompt Exploder Feature Documentation

## 1. Overview
Prompt Exploder is an admin workflow for turning large prompt text into structured, editable segments, validating and improving runtime parsing quality, then reassembling and sending the updated prompt back to upstream tools.

Primary routes:
- `/admin/prompt-exploder`
- `/admin/prompt-exploder/projects`
- `/admin/prompt-exploder/settings`

Primary in-app tabs (Prompt Exploder main page):
- `Workspace`
- `Docs`

## 2. Core Workflow
1. Paste or load source prompt in **Source Prompt**.
2. Run **Explode Prompt** to parse into typed segments.
3. Refine segment structure, list items, subsections, parameter controls, and inclusion.
4. Review **Explosion Metrics** and **Warnings**.
5. Review or edit **Bindings** (auto + manual references).
6. Validate output in **Reassembled Prompt**.
7. Save/organize in **Prompt Exploder Projects**.
8. Tune runtime behavior in **Pattern Runtime**, **Parser Tuning**, and **Benchmark Report**.
9. Apply final prompt back to Image Studio or Case Resolver.

## 3. Feature Inventory

### Main Page (`/admin/prompt-exploder`)
- **Header Actions**
  - Reload incoming draft payload from bridge context.
  - Open settings.
  - Return to source tool (Image Studio/Case Resolver).
  - Toggle docs-driven tooltips (`Docs Tooltips`).
- **Source Prompt Panel**
  - Prompt text editor.
  - Explode action.
  - Apply action to return target.
- **Explosion Metrics Panel**
  - Segment count, confidence, typed coverage, type distribution.
- **Warnings Panel**
  - Runtime quality warnings from parser/exploder.
- **Segments Panel**
  - Select segment and reorder segments.
  - Edit type, title, include/omit behavior.
  - Edit parameter blocks (control type, value, comments, descriptions).
  - Edit complex list structures and logical conditions.
  - Edit subsection-level structures and list semantics.
  - Approve learned patterns/templates from selected segment.
- **Bindings Panel**
  - Inspect auto-detected bindings.
  - Create/remove manual bindings with source/target segment + subsection references.
- **Reassembled Prompt Panel**
  - Read-only final output preview.
  - Apply output to return target.
- **Prompt Projects Panel**
  - Save current state to library.
  - Create new project draft.
  - Delete selected project.
  - Load saved project state.
- **Pattern Runtime Panel**
  - Select validation stack.
  - Select runtime rule profile.
  - Control learning thresholds and template limits.
  - Manage learned template states and deletions.
  - Capture, restore, delete pattern snapshots.
  - Save learning/runtime drafts.
  - Observe runtime health and cache indicators.
- **Parser Tuning Section**
  - Expand/collapse parser tuning controls.
  - Edit parser boundary/subsection tuning rules.
  - Save/reset parser tuning.
  - Open global Validation Patterns page.
- **Benchmark Report Panel**
  - Run benchmark suite.
  - Configure suite, low-confidence threshold, suggestion cap.
  - Manage custom benchmark JSON and templates.
  - Review per-case precision/recall/f1 and gate status.
  - Apply/dismiss low-confidence suggestions.

### Projects Page (`/admin/prompt-exploder/projects`)
- Create/edit/delete projects.
- Open project directly in Prompt Exploder.
- Table view for prompt preview, segment counts, timestamps.

### Settings Page (`/admin/prompt-exploder/settings`)
- AI operation mode/provider/model settings.
- Runtime defaults (rule stack/profile + benchmark defaults).
- Learning defaults and auto-learning controls.
- Save and reload behavior for persisted Prompt Exploder settings key.

## 4. Integrations
- **Image Studio bridge**
  - Incoming draft prompt handoff.
  - Apply-to-studio handoff for reassembled prompt.
- **Case Resolver bridge**
  - Incoming extracted content and context.
  - Apply reassembled output back into Case Resolver flow.
- **Prompt Validator pattern scopes**
  - Supports Prompt Exploder-specific and Case Resolver Prompt Exploder stacks.

## 5. Data and Settings Keys
- Prompt Exploder settings: `prompt_exploder_settings`
- Prompt Exploder project library: `image_studio_prompt_exploder_library`
- Bridge keys:
  - `prompt_exploder:draft_prompt`
  - `prompt_exploder:apply_to_studio_prompt`

## 6. APIs and Observability
- Runtime health endpoint:
  - `GET /api/prompt-runtime/health`
  - Optional reset: `?reset=true`
  - Returns observability, parser cache, selection cache, and runtime load snapshot.
- Image Studio prompt extraction endpoint:
  - `/api/image-studio/prompt-extract`

## 7. Docs-Fed Tooltip System
- Feature switch: **Docs Tooltips**.
- Available on:
  - `/admin/prompt-exploder`
  - `/admin/prompt-exploder/projects`
  - `/admin/prompt-exploder/settings`
- Canonical source of tooltip docs:
  - `docs/prompt-exploder/tooltip-catalog.ts`
- In-app docs tab renders the same catalog.
- When enabled, every interactive control receives a tooltip generated from the shared docs catalog.
- Runtime docs catalog bridge:
  - `src/features/prompt-exploder/docs/catalog.ts`
- Tooltip resolver source file:
  - `src/features/prompt-exploder/docs/tooltip-registry.ts`
- Runtime enhancer component:
  - `src/features/prompt-exploder/components/DocsTooltipEnhancer.tsx`
- Docs tab component:
  - `src/features/prompt-exploder/components/PromptExploderDocsTab.tsx`

## 8. Troubleshooting
- No segments after explode:
  - Confirm source prompt is non-empty and runtime stack has active rules.
- Unexpected segmentation:
  - Check runtime profile, parser tuning, and recently applied benchmark suggestions.
- Apply action disabled:
  - Ensure document state exists (run explosion first).
- Learning not reflected:
  - Save learning settings, then re-run explosion/benchmark.
- Runtime health degraded/critical:
  - Inspect `/api/prompt-runtime/health`, then reset caches if necessary (`reset=true`).

## 9. Maintenance Rules
- Any new Prompt Exploder action/control must:
  - Be documented in this file and in tooltip registry.
  - Have a tooltip alias or `data-doc-id` mapping.
  - Include tests for behavior-critical changes.
