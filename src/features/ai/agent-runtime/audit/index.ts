export type AuditLevel = 'info' | 'warning' | 'error';

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (typeof window !== 'undefined') return;

  const { logAgentAudit: logAgentAuditServer } = await import('./server');
  await logAgentAuditServer(runId, level, message, metadata);
}
