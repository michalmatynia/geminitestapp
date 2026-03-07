# Kangur Tests And Exams

## Test suites

The `Tests` route lists enabled Kangur test suites. Each suite is metadata-driven and assembled from the shared question store.

## Playback

The suite player is responsible for:

- presenting questions in sequence
- rendering optional SVG illustrations
- collecting answers
- reporting completion back to the hosting page

## Admin responsibilities

Admins manage suites, question banks, and enablement centrally. Learner routes should only display enabled suites and valid associated questions.

## Documentation requirement

The suite list, suite launch controls, back navigation, and the player surface should all be represented in the central Kangur documentation catalog so tooltip text stays synchronized with the stored documentation.
