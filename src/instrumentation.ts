export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    const { registerEdgeInstrumentation } = await import('./instrumentation.edge');
    await registerEdgeInstrumentation();
    return;
  }

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { registerNodeInstrumentation } = await import('./instrumentation.node');
    await registerNodeInstrumentation();
  }
}
