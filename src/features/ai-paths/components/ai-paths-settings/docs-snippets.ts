export const DOCS_WIRING_SNIPPET = [
  "Simulation.simulation → Trigger.simulation",
  "Trigger.context → ContextFilter.context",
  "ContextFilter.entityJson → Parser.entityJson",
  "Trigger.context → ResultViewer.context",
  "Trigger.meta → ResultViewer.meta",
  "Trigger.trigger → ResultViewer.trigger",
].join("\n");

export const DOCS_DESCRIPTION_SNIPPET = [
  "ContextFilter.entityJson → Parser.entityJson",
  "Parser.title → AI Description Generator.title",
  "Parser.images → AI Description Generator.images",
  "AI Description Generator.description_en → Description Updater.description_en",
  "Parser.productId → Description Updater.productId",
  "Description Updater.description_en → Result Viewer.description_en",
].join("\n");

export const DOCS_JOBS_SNIPPET = [
  "# Inline (Model waits for result)",
  "Prompt.prompt → Model.prompt",
  "Prompt.images → Model.images",
  "Model.result → Result Viewer.result",
  "Model.result → Database.result",
  "Parser.productId → Database.entityId",
  "",
  "# Async (Model enqueue-only + Poll)",
  "Prompt.prompt → Model.prompt",
  "Prompt.images → Model.images",
  "Model.jobId → Poll.jobId",
  "Poll.result → Result Viewer.result",
  "Poll.result → Database.result",
  "Parser.productId → Database.entityId",
].join("\n");
