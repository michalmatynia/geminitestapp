const normalizeConcurrency = (value: number): number =>
  Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;

export const mapWithConcurrency = async <Input, Output>(
  items: readonly Input[],
  mapper: (item: Input) => Promise<Output>,
  maxConcurrency: number
): Promise<Output[]> => {
  const concurrency = normalizeConcurrency(maxConcurrency);
  const batches = Array.from({ length: Math.ceil(items.length / concurrency) }, (_, index) =>
    items.slice(index * concurrency, index * concurrency + concurrency)
  );
  return batches.reduce<Promise<Output[]>>(async (previousResults, batch) => {
    const results = await previousResults;
    results.push(...(await Promise.all(batch.map(mapper))));
    return results;
  }, Promise.resolve([]));
};
