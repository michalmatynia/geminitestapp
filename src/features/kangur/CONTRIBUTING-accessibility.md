# Kangur Accessibility Guidelines (CONTRIBUTING)

Purpose
- Short, actionable accessibility patterns for the Kangur (StudiQ) feature.
- Use this as the first stop for contributors and reviewers.

Core patterns
- Landmarks: Every page shell must expose one <main> landmark with a stable id. Use KangurStandardPageLayout or equivalent.
- Skip links: Wire global skip-to-content to the shell via skipLinkTargetId and a clear label.
- Headings: Ensure a single meaningful H1 per page; use H2+ for structure.
- Forms: All inputs must have associated <label> or aria-label; use aria-describedby for helper/validation text.
- Interactive controls: Provide accessible names, visible focus styles (focus-visible), and keyboard operability.
- Live regions: Use aria-live (polite/assertive) for async status and alerts; prefer off-screen text for non-visual summaries.
- Images/media: Provide descriptive alt text; for decorative images use empty alt="".
- Scrollable regions: Make intentionally scrollable containers keyboard-focusable (tabindex=0) and provide role/aria-label if they represent a region.
- Contrast: Follow WCAG AA contrast for text; add high-contrast preview in the Appearance admin where possible.

Testing & CI
- Run local audit: npm run a11y:playwright (use production build for authoritative checks).
- Use eslint-plugin-jsx-a11y and run lint: npm run lint -- --fix, then manually review suggestions.
- Add Playwright+axe checks to CI for PRs against production build artifacts.

PR checklist for accessibility
- [ ] Landmark and H1 present
- [ ] Form labels and validation messaging present
- [ ] Keyboard navigation tested (tab order, focus targets)
- [ ] Axe/Playwright run passes (or documented exception)
- [ ] Visual contrast checked

Notes
- Avoid broad DOM mutations for accessibility at runtime; prefer component-level fixes so semantics remain explicit.
- For complex interactive widgets (games, editors), include an accessibility note in the component file and a short test plan.

Maintainers
- Kangur UX & Accessibility: @kangur-team
- For questions, open an issue: /issues with label "accessibility".
