export function buildVerifyEmailExpiredPage({
  resendEndpoint = '/api/v1/auth/resend-verification',
  prefilledEmail = '',
  title = 'Link Expired',
  subtitle = 'Your verification link has expired. Enter your email below and we will send you a new one.',
}) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Link Expired - TeamUp IT</title>
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
          max-width: 520px;
          width: 100%;
          padding: 48px 36px;
        }

        h1 {
          color: white;
          font-size: 30px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: -0.4px;
          text-align: center;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.95);
          font-size: 15px;
          margin-bottom: 28px;
          line-height: 1.6;
          font-weight: 500;
          text-align: center;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        label {
          color: rgba(255, 255, 255, 0.95);
          font-size: 14px;
          font-weight: 600;
        }

        input[type="email"] {
          width: 100%;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 15px;
          outline: none;
        }

        input[type="email"]::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }

        input[type="email"]:focus {
          border-color: rgba(255, 255, 255, 0.8);
        }

        .btn {
          margin-top: 4px;
          padding: 13px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: #12141A;
          color: white;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn:hover {
          background: #1a1d27;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .status {
          margin-top: 14px;
          min-height: 22px;
          color: rgba(255, 255, 255, 0.95);
          font-size: 15px;
          line-height: 1.5;
          font-weight: 600;
          text-align: center;
        }

        .status.error {
          color: #ffe3e3;
        }

        .status.success {
          color: #d6ffdf;
        }

        @media (max-width: 480px) {
          .container {
            padding: 36px 20px;
          }

          h1 {
            font-size: 26px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>

        <form id="resend-form" class="form">
          <label for="email">Email</label>
          <input id="email" type="email" name="email" placeholder="you@example.com" required value="${escapeHtml(prefilledEmail)}" />
          <button id="submit" class="btn" type="submit">Send new verification email</button>
        </form>

        <p id="status" class="status" aria-live="polite"></p>
      </div>

      <script>
        (function () {
          const form = document.getElementById('resend-form');
          const emailInput = document.getElementById('email');
          const submitButton = document.getElementById('submit');
          const statusNode = document.getElementById('status');

          function setStatus(message, type) {
            statusNode.textContent = message || '';
            statusNode.className = 'status' + (type ? ' ' + type : '');
          }

          form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = emailInput.value.trim().toLowerCase();
            if (!email) {
              setStatus('Please enter your email.', 'error');
              return;
            }

            submitButton.disabled = true;
            setStatus('Sending verification email...', '');

            try {
              const response = await fetch('${escapeJsString(resendEndpoint)}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
              });

              const payload = await response.json().catch(() => null);

              if (response.ok) {
                setStatus('Done! Please check your inbox for a new verification link.', 'success');
                return;
              }

              const message = payload?.error?.message || 'Failed to send verification email. Please try again.';
              setStatus(message, 'error');
            } catch (error) {
              setStatus('Network error. Please try again.', 'error');
            } finally {
              submitButton.disabled = false;
            }
          });
        })();
      </script>
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
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function escapeJsString(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}
