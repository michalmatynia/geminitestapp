# AI Paths Service Layer

This directory contains the modularized service layer for AI Path orchestration, management, and runtime execution.

## Architecture

The service layer has been refactored from monolithic service files (e.g., `path-run-management-service.ts`) into a modular structure. 

- `methods/`: Houses individual, standalone implementations of service logic.
- `callbacks/`: Contains extracted handler logic for the runtime executor (e.g., `onNodeStart`, `onNodeFinish`).
- `index.ts` (proxies): Serves as an aggregator for modularized methods, providing a stable public API while keeping internals isolated.

## Core Patterns

### 1. Repository Modularization
Core CRUD methods for `path-run-repository` are extracted into individual files in `methods/`. These are exported via the repository proxy to ensure consumer code remains unchanged.

### 2. Dependency Injection
Callback handlers (e.g., in `callbacks/`) utilize a shared `CallbackCtx` type to receive required dependencies, facilitating independent testing without the need for complex, deep dependency mocking.

### 3. Linting and Type Safety
Modules are designed to be lint-compliant with strict `strict-boolean-expressions` and `complexity` rules. Where dynamic MongoDB interactions are necessary, explicit type casting is used to ensure stability while maintaining the required flexibility.

## Key Modules
- `path-run-management/`: Contains high-level run lifecycle operations (`resume`, `retry`, `cancel`, `cleanup`).
- `path-run-executor/callbacks/`: Contains fine-grained event handlers for node execution lifecycle.
- `runtime-analytics/methods/`: Contains modularized analytics recording logic.
