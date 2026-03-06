export function buildResetPasswordTemplate({ link, ttlMinutes, contactEmail }) {
  const subject = 'Reset your password for TeamUp IT';
  const text = `Hi,

You requested a password reset for your TeamUp IT account.

Please reset your password by clicking the link below:
${link}

This link expires in ${ttlMinutes} minutes.

If you did not request a password reset, please ignore this email and your password will remain unchanged.

Thanks,
TeamUp IT
Contact: ${contactEmail}
`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <p>Hi,</p>
      <p>You requested a password reset for your <strong>TeamUp IT</strong> account.</p>
      <p>Please reset your password by clicking the button below:</p>
      <p>
        <a
          href="${link}"
          style="display: inline-block; padding: 12px 18px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px;"
        >
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; color: #4b5563;">This link expires in ${ttlMinutes} minutes.</p>
      <p>If you did not request a password reset, you can ignore this email and your password will remain unchanged.</p>
      <p>Thanks,<br />TeamUp IT</p>
      <p style="font-size: 12px; color: #6b7280;">Contact: ${contactEmail}</p>
    </div>
  `.trim();

  return { subject, text, html };
}
