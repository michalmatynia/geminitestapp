---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'generated'
canonical: true
---

# Validator Semantic Grammar

This folder centralizes machine-readable documentation for validator pattern import and sequencing.

## Artifacts

- `schema/validator-import.v1.json`: canonical JSON schema for copy-paste validator import payloads.
- `types/validator-import-types.v1.json`: semantic type catalog for pattern, sequence, and step entities.
- `options/validator-import-options.v1.json`: enum/value catalog for modes, scopes, and behavior options.
- `manifest.json`: versioned index and hashes for tooling and CI checks.

## Scope

Version `1` currently documents product validator import payloads (`scope = products`).
Additional validator scopes can extend this grammar with backward-compatible versions.
