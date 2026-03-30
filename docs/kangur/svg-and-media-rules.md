---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
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

This policy is intentionally narrow. It does not automatically apply to:

- Kangur social-post media
- admin chrome or marketing assets
- unrelated non-lesson uploads elsewhere in the repo

## Rationale

- SVG scales cleanly across learner devices
- SVG is easier to sanitize and validate in the existing content model
- Kangur illustrations rely on simple, high-clarity educational shapes that map well to vector content

## Authoring impact

Admins should author or upload SVG-based educational illustrations. Raster image extensions should not be treated as valid Kangur lesson media.

If a workflow needs non-lesson media, document it in its own owning doc instead of
silently weakening the lesson SVG rule.

## Documentation impact

Any admin-facing copy or tooltip that references Kangur lesson images should describe them as SVG image references or lesson illustrations, not generic uploaded images.
