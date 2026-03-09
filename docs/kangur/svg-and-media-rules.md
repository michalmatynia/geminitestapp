---
owner: 'Kangur Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'feature:kangur'
canonical: true
---

# Kangur SVG And Media Rules

## SVG-only rule

Kangur lesson image references are SVG-only. This applies to:

- lesson documents
- admin previews
- question illustrations
- imported or authored educational visuals that are rendered through Kangur lesson content

## Rationale

- SVG scales cleanly across learner devices
- SVG is easier to sanitize and validate in the existing content model
- Kangur illustrations rely on simple, high-clarity educational shapes that map well to vector content

## Authoring impact

Admins should author or upload SVG-based educational illustrations. Raster image extensions should not be treated as valid Kangur lesson media.

## Documentation impact

Any admin-facing copy or tooltip that references Kangur lesson images should describe them as SVG image references or lesson illustrations, not generic uploaded images.
