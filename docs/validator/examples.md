---
owner: 'Products / Platform Team'
last_reviewed: '2026-04-11'
status: 'active'
doc_type: 'reference'
scope: 'feature:validator'
canonical: true
---
# Validator Examples

## Example: Static Regex Pattern
Pattern: target=`name`, regex=`\s{2,}`, replacement=` `.
Result: `buildFieldIssues` returns warning issue with replacement preview collapsing duplicate spaces.

## Example: Sequence Group
Group contains mirror pattern followed by category-specific replacements.
Result: sequence emits one aggregated replacement issue when final output differs from original value.

## Example: Runtime DB Pattern
Runtime config queries latest product and checks `count > 0`.
Result: runtime evaluator adds issue with optional replacement value resolved from `replacementPath`.

## Example: Launch Gate
Launch source mode uses `latest_product_field` and regex operator.
Result: pattern executes only when launch condition is true.
