export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    const { registerEdgeInstrumentation } =
      require('./instrumentation.edge') as typeof import('./instrumentation.edge');
    await registerEdgeInstrumentation();
    return;
  }

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { registerNodeInstrumentation } =
      require('./instrumentation.node') as typeof import('./instrumentation.node');
    await registerNodeInstrumentation();
  }
}
