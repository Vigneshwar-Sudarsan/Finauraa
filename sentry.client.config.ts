import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Client Configuration
 */

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Don't filter infrastructure errors - they should reach server Sentry
  beforeSend(event) {
    return event;
  },

  // Sample rate for errors
  sampleRate: 1.0,

  // Enable performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,
});
