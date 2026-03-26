---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Number Balance Rush UI Reference

This is the retained per-game UI reference for the Number Balance Rush surface.
The live implementation is centered in:

- `src/features/kangur/ui/components/NumberBalanceRushGame.tsx`
- `/api/kangur/number-balance/create`
- `/api/kangur/number-balance/join`
- `/api/kangur/number-balance/state`
- `/api/kangur/number-balance/solve`

Use this doc for layout and interaction intent, not as a substitute for the
runtime component contract.

## Overview
Number Balance Rush is a 15-second, drag-and-drop, two-player simultaneous game. Each player sees an identical board. The UI must emphasize speed, clarity, and large hit targets.

## Layout (Mobile 360-430px)
1. Top bar (height 64-72px)
1. Timer ring centered, 56-64px diameter
1. Score chip on the right, min width 72px
1. Center scale area (min height 260px)
1. Target labels above each pan, 18-20px font
1. Scale pans as two drop zones, each 120x120px
1. Tile tray at bottom (height 120-140px)
1. Tiles 64x64px, 12-16px gap, wrap to 2 rows if needed

## Layout (Desktop >= 1024px)
1. Top bar (height 72-84px)
1. Timer ring 72-80px diameter
1. Score chip min width 96px
1. Center scale area (min height 360px)
1. Target labels 22-26px font
1. Scale pans 160x160px
1. Tile tray height 160-180px
1. Tiles 80x80px, 16-20px gap, single row

## Component Details
1. Target labels show left and right sums, centered above each pan
1. Pan slots show 2-3 snap positions with subtle outlines
1. Dragged tile elevates with shadow and slight scale (1.02-1.05)
1. Correct solve triggers a short success flash (<= 400ms)
1. Timer hits zero, board locks and dims by 30-40%

## Drag-and-Drop Rules
1. Snap to nearest slot when released within 28-36px of a slot center
1. Drag back to tray to remove
1. Optional: a short "snap" sound or haptic on successful placement

## Typography
1. Targets and tile numbers use a rounded, bold face already used in Kangur
1. Tile numbers are at least 24px on mobile, 32px on desktop
1. Avoid dense text; use labels only where necessary

## Accessibility
1. Minimum hit target 44x44px for all interactive elements
1. High-contrast number text against tile backgrounds
1. ARIA labels for timer, targets, and drag targets
1. Provide a non-color cue for correct solve (icon or short text)
1. Respect reduced motion preference by disabling scale flashes

## Responsive Behavior
1. Tile tray wraps on small widths rather than shrinking tiles below 64px
1. Scale pans stay centered and never overlap the tray
1. Timer and score remain pinned in the top bar
