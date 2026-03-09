---
owner: 'Kangur Team'
last_reviewed: '2026-03-09'
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

The lesson library supports both legacy component lessons and document-authored lessons.

## Content modes

### Component mode

Component mode renders a dedicated React lesson experience. This is used for legacy lessons and highly interactive teaching flows.

### Document mode

Document mode renders a stored lesson document. Documents can contain:

- text blocks
- SVG blocks
- SVG image references
- activity blocks
- supported grid layouts

Document mode is the preferred authoring path when the admin needs editable structured content without shipping new code.

## Narration

Lesson pages may expose narration controls, but the narrator engine and default voice are configured globally in Kangur settings. Learner routes consume those settings and should not duplicate engine selection logic locally.

## Activities

Activity blocks embed reusable instructional experiences such as clock training, addition minigames, and future lesson-specific practice modules. Activity ids should stay stable because lesson documents and imports depend on them.

## Documentation requirement

Lesson navigation, lesson entry cards, narrator controls, previous/next navigation, and document-mode actions should all map to central Kangur documentation entries rather than inline tooltip strings.
