# Kangur Admin Content Authoring

## Admin surfaces

Kangur admin tooling includes:

- lesson management
- lesson document editing
- activity configuration
- question authoring
- test-suite composition
- narration support
- settings management

## Authoring principles

- authored lesson content should prefer document mode when possible
- reusable activities should be registered centrally
- question illustrations should stay SVG-based
- shared lesson metadata should remain consistent with the learner-facing lesson library

## Documentation principle

Kangur admin documentation should explain the product model, not just button labels. The admin needs enough context to understand which settings are global, which values affect learner routes, and which authoring paths are content-only versus code-backed.

## Tooltip principle

Admin tooltip content is still documentation-driven. The tooltip system must not introduce a second source of truth inside admin React components.
