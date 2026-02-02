export const fetchOllamaModels = async (baseUrl: string): Promise<string[]> => {
  const res = await fetch(`${baseUrl}/api/tags`);
  if (!res.ok) {
    throw new Error("Failed to fetch Ollama models");
  }
  const data = (await res.json()) as { models?: { name: string }[] };
  return data.models?.map((model: { name: string }) => model.name) ?? [];
};
