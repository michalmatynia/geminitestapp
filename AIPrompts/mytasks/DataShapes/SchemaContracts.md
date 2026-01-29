Validation & schema contracts (Mongo is schemaless; you must enforce this)

Validate every external input

Query params, route params, request bodies, cookies, headers.

Use runtime validators (e.g., Zod) and infer TS types from them.

Validate environment variables

Parse process.env at boot; fail fast with clear error messages.

Normalize/sanitize

Trim strings, normalize emails, validate ObjectId strings, enforce allowed enums.

Explicit “API contracts”

If you have multiple consumers, consider OpenAPI (or typed RPC) so request/response drift can’t happen silently.

