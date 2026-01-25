import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Server Configuration
 *
 * Infrastructure Alert Rules (configure in Sentry Dashboard):
 *
 * 1. Rate Limiter Fallback Alert:
 *    - Filter: tags.component = 'rate_limiter' AND tags.failure_mode = 'database_unavailable'
 *    - Threshold: 1 event in 1 minute
 *    - Action: Slack/email notification
 *
 * 2. Consent Middleware Database Error:
 *    - Filter: tags.component = 'consent_middleware' AND tags.failure_mode = 'database_error'
 *    - Threshold: 5 events in 5 minutes
 *    - Action: Slack/email notification
 */

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tag infrastructure failures for alerting
  beforeSend(event, hint) {
    // Check if this is an infrastructure error we've already tagged
    const component = event.tags?.component;
    if (component === "rate_limiter" || component === "consent_middleware") {
      // Ensure high priority for infrastructure issues
      event.level = "error";

      // Add fingerprint for grouping
      const failureMode = event.tags?.failure_mode;
      event.fingerprint = [
        String(component),
        String(failureMode || "unknown"),
      ];
    }
    return event;
  },

  // Sample rate for errors (100% for infrastructure issues)
  sampleRate: 1.0,

  // Enable performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Integrations
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Environment
  environment: process.env.NODE_ENV,
});
