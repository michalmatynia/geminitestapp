---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'guide'
scope: 'platform'
standards: 'WCAG 2.1 Level AA'
---

# Accessibility Implementation Guide

This guide documents platform-wide accessibility patterns and standards for building inclusive, accessible features.

## Standards & Compliance

The platform targets **WCAG 2.1 Level AA** compliance across all user-facing components.

### Covered Success Criteria

| Criterion | Implementation | Pattern |
|-----------|-----------------|---------|
| **1.1.1 Non-text Content (A)** | All images have alt attributes | Alt text guidelines (below) |
| **1.4.11 Non-text Contrast (AA)** | Focus rings have sufficient contrast | `focus-visible:ring-*` with high contrast colors |
| **2.1.1 Keyboard (A)** | All interactive elements keyboard accessible | Radix UI primitives + button semantics |
| **2.1.2 No Keyboard Trap (A)** | Focus flow unrestricted | Modal focus management |
| **2.4.3 Focus Order (A)** | DOM order matches visual order | Semantic HTML structure |
| **2.4.7 Focus Visible (AA)** | All focused elements have visible indicator | Tailwind `focus-visible:ring-*` |
| **4.1.2 Name, Role, Value (A)** | Proper ARIA roles and labels | ARIA patterns (below) |
| **4.1.3 Status Messages (AA)** | Live regions announce feedback | `aria-live` patterns (below) |

## Core Patterns

### 1. Focus Indicators (focus-visible)

All interactive elements must have visible focus indicators. Use Tailwind's `focus-visible:ring-*` utilities:

```tsx
// Button with focus ring
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 ring-offset-white">
  Click me
</button>

// Color variants for different contexts
focus-visible:ring-indigo-400/70    // Agentic games
focus-visible:ring-teal-400/70      // Reasoning components
focus-visible:ring-emerald-400/70   // Surface matching
focus-visible:ring-amber-300/70     // Language games
focus-visible:ring-white/40         // Dark/admin UI
```

**Accessibility benefit:** Keyboard users can clearly see which element has focus.

---

### 2. Button Groups with ARIA Grouping

When buttons represent choices within a question or context, use `role="group"` + `aria-labelledby`:

```tsx
// Pattern 1: aria-labelledby linking (for existing question text)
<div id="question-prompt">Select the correct option</div>
<div role="group" aria-labelledby="question-prompt" className="flex gap-2">
  <button>Option A</button>
  <button>Option B</button>
  <button>Option C</button>
</div>

// Pattern 2: aria-label (for new context)
<div role="group" aria-label="Select an action to perform">
  <button>Approve</button>
  <button>Reject</button>
  <button>Review</button>
</div>
```

**Accessibility benefit:** Screen reader users hear the group context ("Select the correct option") before navigating individual buttons.

---

### 3. Live Regions for Dynamic Feedback

Announce real-time feedback (validation, game results, operation status) using `aria-live`:

```tsx
// Status announcement (polite = waits for pause, doesn't interrupt)
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {feedback ? "Correct! Well done." : "Try again."}
</div>

// Alert announcement (assertive = interrupts immediately)
<div role="alert" aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```

**Accessibility benefit:** Screen reader users get immediate feedback without needing to explore the DOM.

---

### 4. Form Error Linking

Link error messages to form inputs using `aria-describedby`:

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby={error ? 'email-error' : undefined}
  className="focus-visible:ring-2"
/>
{error && (
  <div id="email-error" role="alert">
    {error}
  </div>
)}
```

**Accessibility benefit:** Screen reader users understand what validation failed and which field caused the error.

---

### 5. Data Table Sorting (aria-sort)

Announce column sort state to screen readers:

```tsx
<button
  onClick={() => setSortOrder(column)}
  aria-sort={
    column.getIsSorted() === 'asc'
      ? 'ascending'
      : column.getIsSorted() === 'desc'
      ? 'descending'
      : 'none'
  }
  className="focus-visible:ring-2"
>
  Name
  <ArrowUpDown className="ml-2" aria-hidden="true" />
</button>
```

**Accessibility benefit:** Screen reader users know which column is sorted and in which direction.

---

### 6. Expand/Collapse State (aria-expanded)

Announce collapsible section state:

```tsx
const [isOpen, setIsOpen] = useState(false);

<button
  onClick={() => setIsOpen(!isOpen)}
  aria-expanded={isOpen}
  className="focus-visible:ring-2"
>
  Settings
  <ChevronRight aria-hidden="true" />
</button>

{isOpen && <SettingsPanel />}
```

**Accessibility benefit:** Screen reader users know whether a section is expanded or collapsed.

---

### 7. Image Alt Text Patterns

#### Content Images (Descriptive Alt Text)

```tsx
// Game diagrams
<img
  src="/diagram.png"
  alt="Diagram: coordinate plane with point at (2,3)"
/>

// User-provided images
<img
  src={userUploadedImage}
  alt={user.description || "User uploaded image"}
/>
```

#### Decorative Images (Empty Alt + aria-hidden)

```tsx
// Background images, decorative icons
<img
  src="/decorative-background.png"
  alt=""
  aria-hidden="true"
/>
```

#### Labeled Images

```tsx
<img
  src="/logo.png"
  alt="Company logo"
/>
```

**Accessibility benefit:** Screen reader users can understand image content without sighted navigation.

---

### 8. Semantic Icon Labeling

Hide purely decorative icons from screen readers, label functional ones:

```tsx
// Decorative icon in a labeled button
<button>
  <Icon aria-hidden="true" />
  Save Changes
</button>

// Icon that needs a label
<button aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>

// Icon in a form
<select>
  <option>Choose...</option>
  {options.map(opt => (
    <option key={opt.id}>{opt.label}</option>
  ))}
</select>
{/* Hide the select's dropdown icon if custom-styled */}
<ChevronDown aria-hidden="true" />
```

**Accessibility benefit:** Screen readers announce button purpose clearly without redundant icon descriptions.

---

## Implementation Checklist

When adding a new interactive component, verify:

- [ ] **Keyboard accessible** — All functionality available via Tab, Enter, Space, Arrows
- [ ] **Focus visible** — `focus-visible:ring-2` on all focusable elements
- [ ] **Screen reader safe** — Proper ARIA labels, roles, and live regions
- [ ] **Image alt text** — All images have meaningful alt text or `alt=""` + `aria-hidden`
- [ ] **Color not alone** — Don't use color alone to convey information (focus rings help)
- [ ] **Contrast sufficient** — Focus indicators and other non-text UI affordances meet WCAG AA non-text contrast expectations (typically 3:1)
- [ ] **No keyboard trap** — Users can tab away from any focus state

---

## Testing Accessibility

### Automated Testing

Use the current repo-owned accessibility entrypoints:

```bash
npm run check:accessibility:component-policies
npm run check:accessibility:component-policies:strict
npm run test:accessibility-smoke
npm run test:accessibility-smoke:strict
npm run test:accessibility:route-crawl
npm run test:accessibility:route-crawl:strict
npm run test:accessibility:gate
```

For CI-parity execution through the Bazel lane:

```bash
npm run bazel -- run //:accessibility_smoke
```

### Manual Testing

1. **Keyboard navigation:** Tab through entire page. Verify focus visible on all buttons.
2. **Screen reader:** Enable VoiceOver (macOS), NVDA (Windows), or JAWS. Navigate with screen reader and verify announcements.
3. **Focus order:** Confirm Tab order matches logical reading order.
4. **Color contrast:** Use browser DevTools or [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) on focus rings and text.

---

## Common Patterns Reference

### Button Groups (Games, Options)

See:
- `src/features/kangur/ui/components/EnglishPronounsGame.tsx` (aria-labelledby)
- `src/features/kangur/ui/components/AgenticApprovalGateGame.tsx` (role="group")

### Feedback Announcements (Math Games)

See:
- `src/features/kangur/ui/components/DivisionGame.tsx` (aria-live status)
- `src/features/kangur/ui/components/MultiplicationGame.tsx`

### Form Errors

See:
- `src/features/auth/pages/public/SignInPageView.tsx` (aria-describedby linking)

### Data Table Sort

See:
- `src/features/products/components/list/ProductColumns.tsx` (aria-sort on headers)

### Image Alt Text

See:
- CMS components: `src/features/cms/components/` (100% audit completed)
- Game diagrams: `src/features/kangur/ui/components/GeometryBasicsWorkshopGame.tsx`

---

## Maintenance

### Accessibility Review Cadence

- **Per PR:** Code reviewers verify focus indicators and ARIA usage
- **Per Feature:** New features must pass automated accessibility tests before merge
- **Quarterly:** Full accessibility audit of high-traffic pages
- **Post-Deployment:** Monitor for accessibility-related user reports

### Pattern Updates

When adding a new accessibility pattern:

1. Verify it meets WCAG 2.1 Level AA criteria
2. Document it in this guide with code example
3. Add or extend the relevant component-policy, smoke, or route-crawl test coverage
4. Update relevant feature documentation
5. Share with the team in standup/docs review

---

## Standards References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN: Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

## Further Resources

- **Testing Framework:** `docs/platform/accessibility-infrastructure.md`
- **Feature Implementation:** See specific feature docs (AI Paths, Kangur, Products)
- **Components:** Review base Radix UI integration in `src/shared/ui/`
- **Memory:** Persistent accessibility patterns in `.claude/projects/.../memory/`

---

## Last Updated

- **2026-03-26** — testing entrypoints aligned to the current accessibility gate and WCAG status-message level corrected
- **2026-03-21** — WCAG 2.1 Level AA implementation complete across core features
- Documentation aligned to 18 accessibility improvements across 19 component files
- 100% image alt text compliance verified
- All patterns tested and production-ready
