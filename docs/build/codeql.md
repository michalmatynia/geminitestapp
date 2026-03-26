---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'runbook'
scope: 'repository'
canonical: true
---
# CodeQL

## Coverage

- Workflow: `.github/workflows/codeql.yml`
- Config: `.github/codeql/codeql-config.yml`
- Language: `javascript-typescript`
- Query pack: `security-extended`
- Triggers: `pull_request`, `push` to `main` and `master`, weekly Monday scan, manual dispatch
- Node setup: `actions/setup-node@v4` with `node-version-file: '.nvmrc'`
- Workflow concurrency: cancels older in-flight runs for the same ref
- Job timeout: `45` minutes

## Scope

CodeQL currently scans first-party runtime code under `src`, `scripts`, and `server.cjs`.
It ignores generated output, docs, end-to-end tests, and unit/spec test files so the initial alert set stays focused on real runtime behavior.

## Local CLI

The local CodeQL CLI is installed under:

- Bundle root: `~/.local/share/codeql/current/codeql`
- User wrapper: `~/.local/bin/codeql`

The wrapper delegates to the currently active bundle symlink, so future upgrades only need to replace the versioned directory and repoint `~/.local/share/codeql/current`.

Common checks:

```bash
codeql version
codeql resolve languages
codeql resolve packs
```

## Triage

- Review alerts in GitHub Security > Code scanning.
- Fix real defects in code before dismissing anything.
- If an alert is dismissed, leave a rationale in GitHub so the decision is auditable.
- Treat new `pull_request` findings as blocking until triaged.

## Local Guard

The repo keeps a static contract test at `scripts/quality/codeql-workflow-contract.test.ts`.
Run it with:

```bash
npx vitest run scripts/quality/codeql-workflow-contract.test.ts
```

Use this contract test when the workflow, CodeQL config, triggers, or query
pack settings change so the written doc and CI workflow stay aligned.
