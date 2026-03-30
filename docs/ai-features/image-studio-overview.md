---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'feature-guide'
scope: 'ai-features'
canonical: true
feature: 'image-studio'
---

# Image Studio Overview

Image Studio is the admin visual-generation workspace in `src/features/ai/image-studio`. It owns project-based image generation, sequence execution, prompt extraction, slot analysis, masking, and prompt-tool integrations such as Prompt Exploder.

## Verified routes

- `/admin/image-studio`
- `/admin/image-studio/settings`
- `/admin/image-studio/ui-presets`
- `/admin/image-studio/validation-patterns`

`/admin/image-studio` lazy-loads the main workspace UI, while the settings and preset routes expose narrower operator surfaces.

## Verified API surface

Image Studio uses the routed `src/app/api/image-studio/*` family. The active surface includes:

- `/api/image-studio/projects/*`
- `/api/image-studio/run`
- `/api/image-studio/runs/*`
- `/api/image-studio/sequences/*`
- `/api/image-studio/sequences/run`
- `/api/image-studio/slots/*`
- `/api/image-studio/models`
- `/api/image-studio/mask/ai`
- `/api/image-studio/composite`
- `/api/image-studio/prompt-extract`
- `/api/image-studio/ui-extractor`
- `/api/image-studio/validation-patterns/learn`
- `/api/image-studio/cards/backfill`

This is broader than a simple “generate image” tool. The feature owns long-lived project state, slot history, sequence orchestration, and helper extraction endpoints used by the workspace UI.

## Operational model

- **Projects** hold the persistent workspace and assets.
- **Runs** and **sequences** provide execution history and longer-running generation flows.
- **Slots** hold individual image states, variants, and analysis outputs.
- **Prompt extraction** and **UI extraction** help turn workspace or imported content into structured generation inputs.
- **Validation patterns** and learning endpoints support prompt/runtime quality workflows.

## Key integrations

- **Prompt Exploder**: the Image Studio right sidebar can launch `/admin/prompt-exploder?source=image-studio&returnTo=%2Fadmin%2Fimage-studio`, and Prompt Exploder can apply prompt output back into the studio.
- **AI Context Registry**: Image Studio components consume and publish context-registry page context where needed.
- **AI Paths and analysis helpers**: the workspace includes analysis and object-layout hooks that depend on shared AI infrastructure, but the feature remains owned by the Image Studio route and API family.

## What changed from older docs

- The maintained contract is the `image-studio` route family under `src/app/api`, not an older simplified “prompt page plus generator” model.
- The verified admin routes are the workspace, settings, UI presets, and validation-pattern redirects listed above.
- Prompt-library references that are not wired as app routes should not be treated as standalone operator entrypoints.

## Related docs

- [`../prompt-exploder/README.md`](../prompt-exploder/README.md)
- [`./integrations.md`](./integrations.md)
