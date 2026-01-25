/**
 * Zod validation schemas for Stripe webhook events
 *
 * These schemas validate only the fields actually accessed in webhook handlers,
 * using .passthrough() to allow additional Stripe fields without breaking validation.
 *
 * This provides runtime type safety before casting to Stripe types.
 */

import { z } from "zod";

/**
 * Schema for checkout.session.completed events
 * Validates: metadata.user_id, metadata.plan, customer, subscription
 */
const CheckoutSessionEventSchema = z.object({
  type: z.literal("checkout.session.completed"),
  data: z.object({
    object: z.object({
      metadata: z.object({
        user_id: z.string().optional(),
        plan: z.enum(["pro", "family"]).optional(),
      }).passthrough(),
      customer: z.string().nullable(),
      subscription: z.string().nullable(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

/**
 * Schema for subscription events (created, updated, deleted, paused, resumed, trial_will_end)
 * Validates: customer, status, cancel_at_period_end, created, trial_end, items.data[0].price.id, items.data[0].current_period_end
 */
const SubscriptionEventSchema = z.object({
  type: z.enum([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "customer.subscription.trial_will_end",
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string(),
      status: z.enum([
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ]),
      cancel_at_period_end: z.boolean().optional(),
      created: z.number(),
      trial_end: z.number().nullable().optional(),
      ended_at: z.number().nullable().optional(),
      items: z.object({
        data: z.array(
          z.object({
            price: z.object({
              id: z.string(),
            }).passthrough(),
            current_period_end: z.number().optional(),
          }).passthrough()
        ),
      }).passthrough(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

/**
 * Schema for invoice events (payment_succeeded, payment_failed, upcoming)
 * Validates: customer, amount_paid, amount_due, currency, lines.data[0].description,
 * hosted_invoice_url, invoice_pdf, period_start, period_end, last_finalization_error,
 * payments.data[0].payment.payment_intent, subscription
 */
const InvoiceEventSchema = z.object({
  type: z.enum([
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "invoice.upcoming",
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string(),
      amount_paid: z.number().optional(),
      amount_due: z.number(),
      currency: z.string().nullable().optional(),
      hosted_invoice_url: z.string().nullable().optional(),
      invoice_pdf: z.string().nullable().optional(),
      period_start: z.number().nullable().optional(),
      period_end: z.number().nullable().optional(),
      subscription: z.union([z.string(), z.object({ id: z.string() }).passthrough()]).nullable().optional(),
      lines: z.object({
        data: z.array(
          z.object({
            description: z.string().nullable().optional(),
          }).passthrough()
        ),
      }).passthrough(),
      last_finalization_error: z.object({
        message: z.string().optional(),
        code: z.string().optional(),
      }).passthrough().nullable().optional(),
      payments: z.object({
        data: z.array(
          z.object({
            payment: z.union([
              z.string(),
              z.object({
                payment_intent: z.string().optional(),
              }).passthrough()
            ]).optional(),
          }).passthrough()
        ).optional(),
      }).passthrough().optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

/**
 * Schema for payment_intent.payment_failed events
 * Validates: customer, last_payment_error
 */
const PaymentIntentEventSchema = z.object({
  type: z.literal("payment_intent.payment_failed"),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string().nullable().optional(),
      last_payment_error: z.object({
        message: z.string().optional(),
      }).passthrough().nullable().optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

/**
 * Discriminated union schema for all Stripe webhook events
 * Routes validation to the correct schema based on event.type
 */
export const StripeWebhookEventSchema = z.discriminatedUnion("type", [
  CheckoutSessionEventSchema,
  SubscriptionEventSchema,
  InvoiceEventSchema,
  PaymentIntentEventSchema,
]);

/**
 * Type-inferred types for use in handlers
 */
export type CheckoutSessionEvent = z.infer<typeof CheckoutSessionEventSchema>;
export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>;
export type InvoiceEvent = z.infer<typeof InvoiceEventSchema>;
export type PaymentIntentEvent = z.infer<typeof PaymentIntentEventSchema>;
export type StripeWebhookEvent = z.infer<typeof StripeWebhookEventSchema>;

/**
 * Export individual schemas for targeted validation
 */
export {
  CheckoutSessionEventSchema,
  SubscriptionEventSchema,
  InvoiceEventSchema,
  PaymentIntentEventSchema,
};
