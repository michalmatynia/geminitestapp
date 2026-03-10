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
- explicit workflow state: `draft`, `ready`, or `published`

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
- suite-library publish actions that can promote only structurally ready `ready` questions into published content
- explicit suite `draft / live` workflow so a fully published suite still has to be intentionally marked live for learners
- symmetric suite controls to `go live` and `take offline` without changing the underlying published question set
- the current-suite question workspace should also expose `publish ready`, `go live`, and `take offline` actions so authors do not need to bounce back to the suite library for routine workflow changes
- when a suite is fully clean except for ready-to-publish questions, the current-suite workspace should also allow a one-step `publish and go live` action
- live suites that later drift into a partial or unstable state should be flagged as needing attention, and learner runtime should stop resolving them until repaired
- question edits inside a live suite should automatically take that suite offline when the resulting question set is no longer fully published
- duplicated questions should re-enter authoring as `draft` items rather than inheriting `published` state automatically
- learner-facing edits to a `published` question should also move that question back to `draft` automatically, so publishing stays an explicit step after content changes
- local question-draft autosave, recovery, and explicit discard flow so question edits are not silently lost
- workflow visibility for `Draft / Ready to publish / Published` at both question-bank and suite-health level
- preview controls inside the question editor for learner view, correct-answer review, wrong-answer review, and compact framing
- quick repair actions inside the question review panel for common structural issues such as missing explanation, invalid correct-answer mapping, split layout without illustration, and SVG choices missing descriptive notes
- presentation presets inside the question editor for common learner-facing layouts such as classic list, answer-card grid, and split illustration scaffolds

Learner-facing runtime should only consume questions from suites that are explicitly `live`, and only the `published` questions inside those suites. `draft` and `ready` questions remain in the bank for authoring and review, but they are not live learner content.

Suite health should also distinguish editorial cleanliness from live readiness:

- a suite can be structurally clean while still not live
- suite-library surfaces should expose both question publication health and explicit suite live status
- summary cards should make it obvious how many suites are actually learner-live versus only ready to go live

## Documentation requirement

The suite list, suite launch controls, back navigation, and the player surface should all be represented in the central Kangur documentation catalog so tooltip text stays synchronized with the stored documentation.
