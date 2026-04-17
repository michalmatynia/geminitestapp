---
owner: 'Products / Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'generated'
canonical: true
---

# Validator Semantic Grammar

This folder centralizes machine-readable documentation for validator pattern import and sequencing.

This is the maintained generated-contract hub for validator import grammar. Use
the broader validator docs for product/runtime context and operator guidance:

- [`../README.md`](../README.md)
- [`../architecture.md`](../architecture.md)
- [`../function-reference.md`](../function-reference.md)

## Open This Hub When

- you need the machine-readable validator import contract rather than UI/runtime overview docs
- you are validating import payloads, sequencing, or manifest/hash artifacts
- you are changing validator import grammar generators or contract checks

## Artifacts

- `schema/validator-import.v1.json`: canonical JSON schema for copy-paste validator import payloads.
- `types/validator-import-types.v1.json`: semantic type catalog for pattern, sequence, and step entities.
- `options/validator-import-options.v1.json`: enum/value catalog for modes, scopes, and behavior options.
- `manifest.json`: versioned index and hashes for tooling and CI checks.

## Which Artifact To Use

| Question | Canonical artifact |
| --- | --- |
| What JSON schema validates validator import payloads? | `schema/validator-import.v1.json` |
| What type catalog describes pattern and sequence entities? | `types/validator-import-types.v1.json` |
| What option enums and mode catalogs exist? | `options/validator-import-options.v1.json` |
| What manifest do tooling and checks use? | `manifest.json` |

## Scope

Version `1` currently documents product validator import payloads (`scope = products`).
Additional validator scopes can extend this grammar with backward-compatible versions.
