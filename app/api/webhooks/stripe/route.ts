import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logPaymentEvent } from "@/lib/audit";
import { sendPaymentFailedNotification, sendTrialEndingNotification } from "@/lib/email";

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;
let supabaseAdmin: SupabaseClient | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events to update subscription status
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPaused(subscription);
        break;
      }

      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionResumed(subscription);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePayment(invoice, "succeeded");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePayment(invoice, "failed");
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleUpcomingInvoice(invoice);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Called when a customer completes checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string | null;

  if (!userId) {
    console.error("No user_id in checkout session metadata");
    return;
  }

  // Determine tier from metadata
  const plan = session.metadata?.plan as "pro" | "family" | undefined;
  const tier = plan || "pro";

  // Update profile with customer ID and subscription info
  const updateData: Record<string, unknown> = {
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  };

  // If we have a subscription, update subscription fields immediately
  // This ensures user sees the correct tier even before subscription webhook fires
  if (subscriptionId) {
    updateData.stripe_subscription_id = subscriptionId;
    updateData.subscription_tier = tier;
    updateData.subscription_status = "active";
    updateData.is_pro = true;
    updateData.subscription_started_at = new Date().toISOString();
  }

  await getSupabaseAdmin()
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  console.log(`Checkout completed for user ${userId}, customer ${customerId}, tier: ${tier}`);
}

/**
 * Handle subscription created/updated
 * Updates user's subscription tier based on their plan
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Get the subscription item (current_period_end is now on items in newer Stripe API)
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const tier = mapPriceIdToTier(priceId);

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "paused",
  };

  // Check if subscription is scheduled for cancellation
  let status = statusMap[subscription.status] || "active";
  if (subscription.cancel_at_period_end && subscription.status === "active") {
    status = "canceling";
  }

  // Update subscription in database
  const { error } = await getSupabaseAdmin()
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      subscription_started_at: new Date(subscription.created * 1000).toISOString(),
      subscription_ends_at: subscriptionItem?.current_period_end
        ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      is_pro: tier !== "free", // Backwards compatibility
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to update subscription:", error);
    throw error;
  }

  // Log audit event for subscription update
  await logPaymentEvent(
    profile.id,
    "subscription_updated",
    subscription.id,
    { tier, status, price_id: priceId }
  );

  console.log(`Updated user ${profile.id} to tier: ${tier}, status: ${status}`);
}

/**
 * Handle subscription canceled
 * Downgrades user back to free tier
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Downgrade to free tier
  await getSupabaseAdmin()
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
      subscription_ends_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
      is_pro: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  // Log audit event
  await logPaymentEvent(
    profile.id,
    "subscription_canceled",
    subscription.id,
    { ended_at: subscription.ended_at }
  );

  console.log(`Subscription canceled for user ${profile.id}`);
}

/**
 * Handle invoice payment (succeeded or failed)
 * Records billing history and audit log
 */
async function handleInvoicePayment(
  invoice: Stripe.Invoice,
  status: "succeeded" | "failed"
) {
  const customerId = invoice.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, full_name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Get payment intent ID from invoice
  const paymentIntentId = invoice.payments?.data?.[0]?.payment?.payment_intent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceSubscription = (invoice as any).subscription;
  const subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;

  // Record in billing history (using new schema)
  const { data: billingRecord } = await getSupabaseAdmin().from("billing_history").insert({
    user_id: profile.id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: typeof paymentIntentId === "string" ? paymentIntentId : null,
    stripe_subscription_id: subscriptionId || null,
    amount: invoice.amount_paid || invoice.amount_due, // Keep in smallest unit (fils/cents)
    currency: invoice.currency?.toLowerCase() || "bhd",
    status,
    description: invoice.lines.data[0]?.description || "Subscription payment",
    invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    failure_reason: status === "failed" ? (invoice.last_finalization_error?.message || "Payment failed") : null,
    failure_code: status === "failed" ? invoice.last_finalization_error?.code : null,
  }).select("id").single();

  // Log audit event
  await logPaymentEvent(
    profile.id,
    status === "succeeded" ? "payment_succeeded" : "payment_failed",
    billingRecord?.id || invoice.id,
    {
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      invoice_id: invoice.id,
    }
  );

  // If payment failed, update subscription status and send notification
  if (status === "failed") {
    await getSupabaseAdmin()
      .from("profiles")
      .update({
        subscription_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // Send failed payment email notification
    if (profile.email) {
      await sendPaymentFailedNotification(
        profile.email,
        profile.full_name || "",
        invoice.amount_due,
        invoice.currency || "bhd",
        invoice.last_finalization_error?.message
      );
    }
  }

  console.log(`Invoice ${status} for user ${profile.id}: ${(invoice.amount_paid || 0) / 100} ${invoice.currency}`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  await getSupabaseAdmin()
    .from("profiles")
    .update({
      subscription_status: "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  console.log(`Subscription paused for user ${profile.id}`);
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const tier = mapPriceIdToTier(priceId);

  await getSupabaseAdmin()
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_status: "active",
      is_pro: tier !== "free",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  console.log(`Subscription resumed for user ${profile.id}`);
}

/**
 * Handle trial ending soon (3 days before)
 * Sends reminder email to user
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, email, full_name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Send trial ending notification email
  if (profile.email && subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000).toISOString();
    await sendTrialEndingNotification(
      profile.email,
      profile.full_name || "",
      trialEndDate
    );
  }

  console.log(`Trial ending soon for user ${profile.id}, trial_end: ${subscription.trial_end}`);
}

/**
 * Handle upcoming invoice (sent ~1 hour before invoice is created)
 * Useful for sending payment reminders
 */
async function handleUpcomingInvoice(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  console.log(`Upcoming invoice for user ${profile.id}: ${invoice.amount_due / 100} ${invoice.currency}`);

  // TODO: Send email notification about upcoming payment
}

/**
 * Handle payment intent failed
 * For more granular payment failure handling
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;

  if (!customerId) {
    console.error("No customer ID in payment intent");
    return;
  }

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Record the failed payment attempt
  const lastError = paymentIntent.last_payment_error;
  console.error(
    `Payment failed for user ${profile.id}: ${lastError?.message || "Unknown error"}`
  );

  // TODO: Send email notification about failed payment
}

/**
 * Map Stripe price ID to subscription tier
 * Configure your price IDs in environment variables
 */
function mapPriceIdToTier(priceId: string): "free" | "pro" | "family" {
  const proPriceIds = [
    process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
    process.env.STRIPE_PRO_PRICE_ID_YEARLY,
  ].filter(Boolean);

  const familyPriceIds = [
    process.env.STRIPE_FAMILY_PRICE_ID_MONTHLY,
    process.env.STRIPE_FAMILY_PRICE_ID_YEARLY,
  ].filter(Boolean);

  if (proPriceIds.includes(priceId)) {
    return "pro";
  }
  if (familyPriceIds.includes(priceId)) {
    return "family";
  }

  // Default to pro if we can't determine (fallback)
  console.warn(`Unknown price ID: ${priceId}, defaulting to pro`);
  return "pro";
}
