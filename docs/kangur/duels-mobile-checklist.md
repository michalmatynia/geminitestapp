---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Duels Mobile UX Checklist

Scope: Kangur Duels lobby, waiting room, and active duel flows on small screens.

This is a regression QA checklist for the current duels experience, not a full
product overview. Use it with the broader route/runtime docs in
[`learner-navigation.md`](./learner-navigation.md) and the continuous duels plan
under `docs/kangur/plans/`.

## Setup
1. Run the app with the Duels page available.
2. Test on at least two widths: 375px (phone) and 768px (small tablet).
3. Use both guest and authenticated states if possible.
4. If possible, test one duel in each state: waiting and active.

## Lobby Header
1. The header stacks vertically on small screens without overlaps.
2. Status chips wrap cleanly; no horizontal overflow.
3. The refresh button is full width on mobile and easy to tap.
4. The "Auto refresh" chip is still visible without truncation.

## Lobby Filters
1. Filter and sort selects are full width on mobile.
2. The "Visible" count text is still visible and not pushed off-screen.
3. Changes to filter/sort do not cause layout jumps.

## Invite Cards (Private)
1. Card header stacks: host info on top, CTA button below.
2. CTA button is full width on mobile.
3. Meta line (questions, time per question, duration) wraps to multiple lines if needed.
4. Chips do not overlap and remain readable.

## Public Cards
1. Card header stacks: host info on top, CTA button below.
2. CTA button is full width on mobile.
3. Meta line wraps cleanly and remains readable.
4. Chips do not overflow the card.

## Empty and Error States
1. Login CTA in the lobby banner is full width on mobile.
2. Error state retry button is full width on mobile.
3. Empty state create button is full width on mobile.

## Play Panel
1. Primary actions (Quick Match / Public Challenge) are stacked and full width.
2. No CTA text is truncated on mobile.

## Recent Opponents
1. Section header and refresh button stack vertically.
2. Opponent invite buttons are full width on mobile.

## Search
1. Search header stacks with chip below on small screens.
2. Search result cards stack content vertically on mobile.
3. Invite buttons are full width on mobile.

## Waiting Session
1. Status chips wrap without overlap.
2. Time and created/updated metadata wraps to multiple lines cleanly.
3. Cancel button is full width on mobile.

## Active Session
1. Timeline block wraps without clipping.
2. Progress bar remains visible and does not overflow.
3. Scoreboard cards stack properly on mobile.
4. Each player card metadata wraps cleanly with no collisions.
5. End-of-match buttons stack and are full width on mobile.

## Motion and Interaction
1. Hover effects do not cause content jumps on touch devices.
2. Staggered entry animations do not delay rendering on mobile.
3. Reduced motion mode disables transitions without breaking layout.

## Notes
- If any item fails, capture a screenshot and note the viewport size and state.
