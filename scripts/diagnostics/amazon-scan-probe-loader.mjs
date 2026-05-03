const emptyModuleUrl = new URL('./server-only-empty.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return {
      url: emptyModuleUrl,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
