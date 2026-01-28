// Public API for observability feature.
export { default } from "./components/ClientErrorReporter";
export { default as ClientErrorReporter } from "./components/ClientErrorReporter";
export * from "./constants/client-logging";
export { default as SystemLogsPage } from "./pages/SystemLogsPage";
export * from "./services/error-system";
export * from "@/shared/lib/observability/system-log-repository";
export * from "@/shared/lib/observability/system-logger";
export * from "./utils/client-error-logger";
