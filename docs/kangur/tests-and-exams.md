---
owner: 'Kangur Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Tests And Exams

## Test suites

The `Tests` route lists enabled Kangur test suites. Each suite is metadata-driven and assembled from the shared question store.

## Question model

Questions are no longer treated as only `prompt + choices + explanation`.

The canonical question contract now supports:

- presentation layout for prompt / illustration composition
- list or grid answer-card presentation
- optional structured `stemDocument`, `explanationDocument`, and `hintDocument` slots that reuse the Kangur lesson content engine
- optional per-choice SVG and descriptive note content
- editorial review metadata for imported legacy questions

Flat `prompt` and `explanation` fields still exist as compatibility and summary fields, but future authoring work should extend the structured slots first.

## Playback

The suite player is responsible for:

- presenting questions in sequence
- rendering prompt / illustration layouts
- rendering optional question-level SVG illustrations
- rendering optional per-choice SVG content and descriptive notes
- collecting answers
- reporting completion back to the hosting page

## Legacy import and review

The current Kangur legacy bank is imported with structural review metadata.

Imported questions may be marked as:

- `ready`
- `needs-review`
- `needs-fix`

Legacy review flags capture issues such as:

- prompt text that depends on visuals
- choice descriptions that need richer UI treatment
- answer / explanation mismatches
- inconsistent legacy reasoning that should be repaired before publishing

Future AI updates should preserve and extend this review model instead of flattening imported questions back into plain text-only forms.

## Admin responsibilities

Admins manage suites, question banks, review status, and enablement centrally. Learner routes should only display enabled suites and valid associated questions.

The question-bank workspace is also expected to support triage directly:

- search across prompts, answers, and legacy audit flags
- a manual order view for author-controlled sequencing
- a review queue view that surfaces `needs-fix` items before `needs-review`
- visible health counts so the current suite can be repaired systematically
- suite-library launch actions that jump directly into the review queue or the first fix-needed question

## Documentation requirement

The suite list, suite launch controls, back navigation, and the player surface should all be represented in the central Kangur documentation catalog so tooltip text stays synchronized with the stored documentation.
