import * as Sentry from "@sentry/react";

/**
 * Initializes Sentry observability if the VITE_SENTRY_DSN environment variable is active.
 * Defaults to clean client console logging otherwise.
 */
export function initObservability() {
  const dsn = ((import.meta as any).env?.VITE_SENTRY_DSN as string) || "";
  if (dsn) {
    try {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: (import.meta as any).env?.PROD ? "production" : "development"
      });
      console.log("[Observability] Production Sentry tracking initialized successfully.");
    } catch (err) {
      console.error("[Observability] Sentry failed to initialize:", err);
    }
  } else {
    console.log("[Observability] Sentry DSN not specified. Error telemetry operates in sandbox mode.");
  }
}

/**
 * Capture custom error context or caught exceptions in the applet
 * @param error The Error object to log
 * @param context Additional description/origin tags
 */
export function logError(error: Error | any, context?: string) {
  const parsedError = error instanceof Error ? error : new Error(String(error));
  console.error(`[Telemetry Captured Exception] (${context || "Global"}):`, parsedError);
  
  if (((import.meta as any).env?.VITE_SENTRY_DSN as string)) {
    try {
      Sentry.captureException(parsedError, {
        tags: { context: context || "Global" }
      });
    } catch (err) {
      console.error("[Observability] Failed to forward error to Sentry:", err);
    }
  }
}

