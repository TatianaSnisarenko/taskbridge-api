export function buildVerifyEmailTemplate({ link, ttlHours }) {
  const subject = 'Verify your email for TeamUp IT';
  const text = `Hi,

Thank you for signing up for TeamUp IT.

Please verify your email address by clicking the link below:
${link}

This link expires in ${ttlHours} hours.

If you did not create an account, please, ignore this email.

Thanks,
TeamUp IT
`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <p>Hi,</p>
      <p>Thank you for signing up for <strong>TeamUp IT</strong>.</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p>
        <a
          href="${link}"
          style="display: inline-block; padding: 12px 18px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px;"
        >
          Verify email
        </a>
      </p>
      <p style="font-size: 13px; color: #4b5563;">This link expires in ${ttlHours} hours.</p>
      <p>If you did not create an account, you can ignore this email.</p>
      <p>Thanks,<br />TeamUp IT</p>
    </div>
  `.trim();

  return { subject, text, html };
}
