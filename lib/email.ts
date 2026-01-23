/**
 * Email Notification Service
 * Uses Resend for transactional emails
 */

import { Resend } from "resend";

// Lazy-initialized Resend client to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Email sender configuration
const FROM_EMAIL = process.env.EMAIL_FROM || "Finauraa <notifications@send.finauraa.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.finauraa.com";

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send consent expiry warning email
 * Sent 7 days before consent expires
 */
export async function sendConsentExpiryWarning(
  email: string,
  userName: string,
  consentType: string,
  providerName: string | null,
  expiresAt: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = providerName
    ? `Your ${providerName} connection expires soon`
    : "Your bank data consent expires soon";

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${userName || "there"},</p>

    <p style="font-size: 16px;">Your ${providerName ? `<strong>${providerName}</strong>` : "bank data"} consent is expiring on <strong>${expiryDate}</strong>.</p>

    <p style="font-size: 16px;">To continue using Finauraa's financial insights and tracking features, please renew your consent before it expires.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/settings/privacy" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Manage Consents</a>
    </div>

    <p style="font-size: 14px; color: #666;">If you don't renew your consent:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>Your bank account data will no longer be accessible</li>
      <li>AI insights will be limited</li>
      <li>Your existing data will be retained according to our data retention policy</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      You received this email because you have a Finauraa account.<br>
      <a href="${APP_URL}/dashboard/settings/notifications" style="color: #667eea;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send consent expiry email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send payment failed notification email
 */
export async function sendPaymentFailedNotification(
  email: string,
  userName: string,
  amount: number,
  currency: string,
  failureReason?: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  const formattedAmount = new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in smallest unit

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Payment Failed - Action Required",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${userName || "there"},</p>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 16px; color: #991b1b;">
        <strong>Payment of ${formattedAmount} failed</strong>
      </p>
      ${failureReason ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #7f1d1d;">Reason: ${failureReason}</p>` : ""}
    </div>

    <p style="font-size: 16px;">Please update your payment method to continue enjoying your Finauraa subscription benefits.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/settings/subscription" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Update Payment Method</a>
    </div>

    <p style="font-size: 14px; color: #666;">If your subscription is not renewed within 7 days, your account will be downgraded to the free plan and you'll lose access to:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>Unlimited transaction history</li>
      <li>Advanced AI insights</li>
      <li>Priority support</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      Need help? <a href="mailto:support@finauraa.com" style="color: #667eea;">Contact support</a><br>
      <a href="${APP_URL}/dashboard/settings/notifications" style="color: #667eea;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send payment failed email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send trial ending soon notification
 */
export async function sendTrialEndingNotification(
  email: string,
  userName: string,
  trialEndDate: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  const endDate = new Date(trialEndDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your trial ends soon - Keep your Pro features",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Ending Soon</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${userName || "there"},</p>

    <p style="font-size: 16px;">Your free trial ends on <strong>${endDate}</strong>.</p>

    <p style="font-size: 16px;">We hope you've enjoyed exploring Finauraa's Pro features! To keep access to unlimited insights and premium features, upgrade your plan before your trial expires.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/settings/subscription" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Upgrade Now</a>
    </div>

    <p style="font-size: 14px; color: #666;">Pro features you'll keep:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>Unlimited transaction history</li>
      <li>Advanced AI-powered insights</li>
      <li>Unlimited savings goals</li>
      <li>Priority support</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      <a href="${APP_URL}/dashboard/settings/notifications" style="color: #667eea;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send trial ending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send data export ready notification
 */
export async function sendDataExportReadyNotification(
  email: string,
  userName: string,
  downloadUrl: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your data export is ready",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Export Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${userName || "there"},</p>

    <p style="font-size: 16px;">Your data export is ready for download. This export includes all your personal data as required by PDPL (Personal Data Protection Law).</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Download Your Data</a>
    </div>

    <p style="font-size: 14px; color: #666;">This download link will expire in 24 hours for security reasons.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      If you didn't request this export, please <a href="mailto:support@finauraa.com" style="color: #667eea;">contact support</a> immediately.
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send data export email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send family group invitation email
 */
export async function sendFamilyInvitationEmail(
  email: string,
  inviterName: string,
  groupName: string,
  acceptUrl: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to join ${groupName} on Finauraa`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Group Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi there,</p>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 16px; color: #166534;">
        <strong>${inviterName}</strong> has invited you to join <strong>${groupName}</strong> on Finauraa!
      </p>
    </div>

    <p style="font-size: 16px;">As part of this family group, you'll get access to:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>Your own private financial dashboard</li>
      <li>AI-powered spending insights</li>
      <li>Savings goals tracking</li>
      <li>Bank account connections via Open Banking</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Accept Invitation</a>
    </div>

    <p style="font-size: 14px; color: #666; text-align: center;">This invitation expires in 7 days.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      If you don't want to join this family group, you can simply ignore this email.<br>
      Questions? <a href="mailto:support@finauraa.com" style="color: #667eea;">Contact support</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send family invitation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send notification when a member joins the family group
 */
export async function sendMemberJoinedNotification(
  ownerEmail: string,
  ownerName: string,
  memberName: string,
  groupName: string
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `${memberName} joined ${groupName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Family Member</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${ownerName || "there"},</p>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 16px; color: #166534;">
        <strong>${memberName}</strong> has accepted your invitation and joined <strong>${groupName}</strong>!
      </p>
    </div>

    <p style="font-size: 16px;">They now have access to their own personal financial dashboard within your family group.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/settings/family" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Manage Family Group</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      <a href="${APP_URL}/dashboard/settings/notifications" style="color: #667eea;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send member joined email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send notification when a member is removed from the family group
 */
export async function sendMemberRemovedNotification(
  memberEmail: string,
  memberName: string,
  groupName: string,
  wasRemoved: boolean = true
): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  const subject = wasRemoved
    ? `You've been removed from ${groupName}`
    : `You've left ${groupName}`;

  const message = wasRemoved
    ? `The group owner has removed you from <strong>${groupName}</strong>.`
    : `You have successfully left <strong>${groupName}</strong>.`;

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: memberEmail,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Group Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Finauraa</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${memberName || "there"},</p>

    <p style="font-size: 16px;">${message}</p>

    <p style="font-size: 16px;">What this means:</p>
    <ul style="font-size: 14px; color: #666;">
      <li>You no longer have access to the family group benefits</li>
      <li>Your personal data and transaction history remain intact</li>
      <li>You can still use Finauraa with a free account</li>
    </ul>

    <p style="font-size: 16px;">Want to continue with premium features? You can upgrade to your own Pro plan.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/settings/subscription" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Plans</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      Questions? <a href="mailto:support@finauraa.com" style="color: #667eea;">Contact support</a>
    </p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Failed to send member removed email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}
