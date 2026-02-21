export function buildVerifyEmailSuccessPage({ email, frontendUrl = 'https://teamup-it.com' }) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verified - TeamUp IT</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #12141A;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          background: #9747FF;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(151, 71, 255, 0.3);
          max-width: 500px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 30px;
          font-size: 40px;
          color: #12141A;
        }

        h1 {
          color: white;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.95);
          font-size: 16px;
          margin-bottom: 30px;
          line-height: 1.6;
          font-weight: 500;
        }

        .email-info {
          background: rgba(255, 255, 255, 0.2);
          border-left: 4px solid rgba(255, 255, 255, 0.3);
          padding: 16px;
          margin: 30px 0;
          border-radius: 6px;
          text-align: left;
        }

        .email-info p {
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .email-info strong {
          color: white;
          font-size: 14px;
          word-break: break-all;
          font-weight: 600;
        }

        .buttons {
          display: flex;
          gap: 12px;
          margin-top: 40px;
          flex-direction: column;
        }

        .btn {
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: inline-block;
          font-family: 'Inter', sans-serif;
        }

        .btn-primary {
          background: #12141A;
          color: white;
        }

        .btn-primary:hover {
          background: #1a1d27;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(18, 20, 26, 0.6);
        }

        @media (max-width: 480px) {
          .container {
            padding: 40px 20px;
          }

          h1 {
            font-size: 28px;
          }

          .subtitle {
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>

        <h1>Email Verified!</h1>
        <p class="subtitle">Your email has been verified. You're all set to start using TeamUp IT.</p>

        <div class="email-info">
          <p>Verified Email Address</p>
          <strong>${escapeHtml(email)}</strong>
        </div>

        <div class="buttons">
          <a href="${escapeHtml(frontendUrl)}" class="btn btn-primary">Go to TeamUp IT</a>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
