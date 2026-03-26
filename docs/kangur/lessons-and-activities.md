---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Lessons And Activities

## Lesson library

The `Lessons` route presents the ordered lesson library. Each lesson has:

- a stable lesson id
- a component id
- display metadata such as title, emoji, description, and color tokens
- a `contentMode`

The lesson library supports both legacy component lessons and document-authored
lessons. The route currently renders either:

- the catalog view
- an active lesson view

and syncs the active lesson context into the AI Tutor session layer when a
lesson is open.

## Content modes

### Component mode

Component mode renders a dedicated React lesson experience. This is used for
legacy lessons and highly interactive teaching flows that are still better
represented as bespoke components than stored documents.

### Document mode

Document mode renders a stored lesson document. Documents can contain:

- text blocks
- SVG blocks
- SVG image references
- activity blocks
- supported grid layouts

Document mode is the preferred authoring path when the admin needs editable,
structured content without shipping new code. The current admin path for this
surface lives under the lessons manager and lesson document editor in
`src/features/kangur/admin/*`.

## Narration

Lesson pages may expose narration controls, but the narrator engine and default
voice are configured globally in Kangur settings. Learner routes consume those
settings and should not duplicate engine selection logic locally.

The current runtime also supports narrator probe and fallback handling through
the centralized settings and observability pipeline rather than route-local
selection.

## Activities

Activity blocks embed reusable instructional experiences such as clock training,
addition minigames, launchable training screens, and future lesson-specific
practice modules. Activity ids should stay stable because lesson documents,
imports, and reusable content references depend on them.

The current Kangur lesson system spans both:

- document-authored instructional content
- reusable activity or game surfaces that can also appear elsewhere in Kangur

That split is intentional. Rich authored explanation belongs in lesson content;
portable practice mechanics should stay reusable.

## Related admin surfaces

- `AdminKangurLessonsManagerPage`
- `KangurLessonDocumentEditor`
- `KangurLessonNarrationPanel`
- lesson tree and section editors under `src/features/kangur/admin/components/*`

## Documentation requirement

Lesson navigation, lesson entry cards, narrator controls, previous/next
navigation, document-mode actions, and activity launches should all map to
central Kangur documentation entries rather than inline tooltip strings.
