Logging & observability (debugging becomes 10× easier)

Structured logging

Log JSON with a consistent schema (level, requestId, userId, route, duration, error stack).

Correlation IDs

Generate a request ID per request; attach it to every log line + error report.

Error reporting

Add Sentry (or equivalent) for stack traces + breadcrumbs.

Performance monitoring

Track slow route handlers, slow DB queries, and timeouts.

Audit logs

For sensitive actions (role changes, deletes, price changes): log who/when/what.