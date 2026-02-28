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

4. Error handling consistency

Right now you try/catch and rethrow the same error:

Copy
catch (error) {
logger.error("Error creating product:", error);
throw error;
}
That’s fine for logging, but it’s not giving you typed, mappable errors (400/404/409/etc.).

Upgrade:

Introduce AppError types and throw those from service/repo.

Route wrapper maps errors → HTTP status + safe payload.

Your service should not throw plain Error("SKU is required") (that becomes 500 unless mapped).
