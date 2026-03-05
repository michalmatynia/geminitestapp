# Step 30 Execution: Products Trigger-Queue Branch Protection Policy

Date: 2026-03-05

## Objective

Promote the Product Trigger Button -> enqueue -> queue refresh integration regression lane to a branch-protection policy target.

## Required Status Check Targets

Workflow:
- `products-trigger-queue-regression`

Required status checks:
1. `products-trigger-queue-regression / trigger_queue_unit`

Conditionally required (recommended when Playwright secrets are configured):
1. `products-trigger-queue-regression / trigger_queue_e2e`

## Current Platform Constraint

Direct branch-protection API configuration is currently blocked on this repository tier:
- API response: `403 Upgrade to GitHub Pro or make this repository public to enable this feature.`
- Endpoint attempted: `GET /repos/{owner}/{repo}/branches/{branch}/protection`

## Enforcement Command (When Repository Tier Allows Branch Protection)

```bash
gh api \
  --method PUT \
  repos/michalmatynia/geminitestapp/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]="products-trigger-queue-regression / trigger_queue_unit" \
  -f required_status_checks.contexts[]="products-trigger-queue-regression / trigger_queue_e2e" \
  -f enforce_admins=true \
  -F required_pull_request_reviews='{"required_approving_review_count":1}' \
  -F restrictions='null'
```

Mirror the same payload for `master` if that branch is still active.

## In-Repo Coverage State

The following automation is already live:
1. Unit gate script:
   - `npm run test:ai-paths:trigger-queue:unit`
2. E2E gate script:
   - `npm run test:ai-paths:trigger-queue:e2e`
3. Combined gate:
   - `npm run test:ai-paths:trigger-queue:integration`
4. CI workflow:
   - `.github/workflows/products-trigger-queue-regression.yml`
   - Unit job always runs on relevant path changes.
   - E2E job runs when Playwright admin secrets are available.
   - Playwright artifacts upload on every E2E run (`always()`).
