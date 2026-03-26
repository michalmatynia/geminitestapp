---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:validator'
canonical: true
---

# Case Resolver Plain Text Patterns

This pack is the maintained validator/runtime reference for converting HTML-rich
Case Resolver connector output into normalized plain text through Validation
Pattern autofix operations rather than ad hoc node-level stripping rules.

## Canonical identifiers

- Validator list scope: `case-resolver-plain-text`
- Prompt validation scope: `case_resolver_plain_text`

## Owning surfaces

- Validator admin surface:
  - `src/features/admin/pages/AdminGlobalValidatorPage.tsx`
- Runtime application helper:
  - `src/features/case-resolver/plain-text-validation.ts`
- Case Resolver node configuration surface:
  - `src/features/case-resolver/components/CaseResolverNodeInspectorModal.tsx`
- Prompt-engine catalog source:
  - `src/shared/lib/prompt-engine/settings.ts`

## Supporting artifacts

- Import-ready rules JSON:
  - [`docs/validator/case-resolver-plain-text-rules.import.json`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/docs/validator/case-resolver-plain-text-rules.import.json)
- Machine-readable pattern documentation:
  - [`docs/validator/case-resolver-plain-text-pattern-documentation.json`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/docs/validator/case-resolver-plain-text-pattern-documentation.json)

## What the pack does

The current rule set covers three main transformations:

1. Strip HTML tags while preserving basic line-break semantics.
2. Decode common HTML entities into plain-text characters.
3. Normalize whitespace for downstream plain-text consumption.

The intent is to keep Case Resolver explanatory and connector text readable in
plain-text flows without baking one-off cleanup behavior into individual nodes.

## Runtime behavior

- Case Resolver filters prompt-validation rules down to the `case_resolver_plain_text`
  scope before building the runtime.
- Validation can be enabled or disabled per node via the Case Resolver node meta.
- Formatter application is also separately toggled per node.
- If no scoped rules are configured, the input text is left unchanged.
- If a configured stack id is invalid, Case Resolver falls back to the first available
  plain-text stack when one exists.

## Operator workflow

1. Manage the stack from the validator admin using the `Case Resolver Plain Text` scope.
2. Keep the rule pack aligned with the import JSON and machine-readable pattern docs.
3. Select the desired stack in the Case Resolver node inspector when a node uses
   plain-text validation.
4. Use runtime validation/formatting toggles only when a node truly needs to opt out.

## Change rule

- Update this doc when the scope id, rule family, or Case Resolver runtime wiring changes.
- Regenerate or refresh the JSON companion artifacts when the maintained pattern pack changes.
- Prefer changing the shared validation/runtime path over adding node-specific plain-text cleanup hacks.
