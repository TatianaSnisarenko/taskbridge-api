const NOTIFICATION_TYPES = {
  APPLICATION_ACCEPTED: {
    subject: 'You were accepted for a task',
  },
  COMPLETION_REQUESTED: {
    subject: 'Completion requested',
  },
  TASK_COMPLETED: {
    subject: 'Task completed',
  },
  TASK_INVITE_CREATED: {
    subject: 'You have a new task invitation',
  },
  TASK_INVITE_ACCEPTED: {
    subject: 'Developer accepted your invitation',
  },
  TASK_INVITE_DECLINED: {
    subject: 'Developer declined your invitation',
  },
  TASK_INVITE_CANCELLED: {
    subject: 'Task invitation cancelled',
  },
};

export function buildNotificationEmailTemplate({ type, taskTitle, ctaUrl, recipientName }) {
  const config = NOTIFICATION_TYPES[type];
  if (!config) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const subject = config.subject;
  const ctaText = 'Open TeamUp IT';

  const messages = {
    APPLICATION_ACCEPTED: `Congratulations! You were accepted for the task "${taskTitle}".`,
    COMPLETION_REQUESTED: `The company has requested completion for the task "${taskTitle}".`,
    TASK_COMPLETED: `The task "${taskTitle}" has been completed.`,
    TASK_INVITE_CREATED: `You have been invited to work on the task "${taskTitle}".`,
    TASK_INVITE_ACCEPTED: `Great news! A developer has accepted your invitation for the task "${taskTitle}".`,
    TASK_INVITE_DECLINED: `A developer has declined your invitation for the task "${taskTitle}".`,
    TASK_INVITE_CANCELLED: `The invitation for the task "${taskTitle}" has been cancelled by the company.`,
  };

  const message = messages[type];

  const text = `Hi ${recipientName},

${message}

Click the link below to view more details:
${ctaUrl}

Thanks,
TeamUp IT
`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <p>Hi ${recipientName},</p>
      <p>${message}</p>
      <p>
        <a
          href="${ctaUrl}"
          style="display: inline-block; padding: 12px 18px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px;"
        >
          ${ctaText}
        </a>
      </p>
      <p>Thanks,<br />TeamUp IT</p>
    </div>
  `.trim();

  return { subject, text, html };
}
