import { env } from '../config/env.js';
import { sendEmail } from './email.service.js';
import { buildNotificationEmailTemplate } from '../templates/email/notification.js';

/**
 * Send an important notification email
 *
 * @param {Object} params
 * @param {string} params.type - Notification type (APPLICATION_ACCEPTED, COMPLETION_REQUESTED, TASK_COMPLETED)
 * @param {Object} params.recipient - Recipient object with email, name, email_verified
 * @param {Object} params.task - Task object with id, title
 * @param {string} [params.ctaUrl] - Optional custom CTA URL (defaults to FRONTEND_BASE_URL)
 */
export async function sendImportantNotificationEmail({ type, recipient, task, ctaUrl }) {
  // Check if email notifications are enabled
  if (!env.emailNotificationsEnabled) {
    return;
  }

  // Only send if recipient email is verified
  if (!recipient.email_verified) {
    return;
  }

  // Use provided CTA URL or default to frontend base URL
  const finalCtaUrl = ctaUrl || env.frontendBaseUrl;

  try {
    const { subject, text, html } = buildNotificationEmailTemplate({
      type,
      taskTitle: task.title,
      ctaUrl: finalCtaUrl,
      recipientName: recipient.name,
    });

    await sendEmail({
      to: recipient.email,
      subject,
      text,
      html,
    });
  } catch (error) {
    // Log error but don't throw - email failure shouldn't break main flow
    console.error('[Email Service] Failed to send notification email', {
      type,
      recipientEmail: recipient.email,
      taskId: task.id,
      error: error.message,
    });
  }
}
