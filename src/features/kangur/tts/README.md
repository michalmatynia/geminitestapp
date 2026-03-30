# Kangur TTS

This folder owns Kangur lesson narration contracts, script generation, server
audio generation, and TTS-specific context-registry support.

## Layout

- `contracts.ts`: TTS-facing contracts and setting keys
- `script.ts`: lesson narration script generation and normalization
- `server.ts`: audio generation, caching, and backend probing
- `captions.ts`: caption helpers
- `context-registry/`: TTS-specific context-registry integration
- `__tests__/`: TTS tests that are not owned by a narrower nested folder
