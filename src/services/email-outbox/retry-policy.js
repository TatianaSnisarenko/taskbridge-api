const RECOVERABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ESOCKET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

const THROTTLE_SMTP_CODES = new Set([421, 450, 451, 452, 454]);

function toLowerMessage(error) {
  return String(error?.message ?? '').toLowerCase();
}

export function parseRetryAfterMs(error) {
  const retryAfterSeconds = Number(error?.retryAfter ?? error?.retryAfterSeconds);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.ceil(retryAfterSeconds * 1000);
  }

  const message = toLowerMessage(error);
  const match = message.match(/retry[- ]?after\s*[:=]?\s*(\d+)/i);
  if (!match) {
    return null;
  }

  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.ceil(seconds * 1000);
}

export function isThrottleEmailError(error) {
  const statusCode = Number(error?.statusCode ?? error?.status ?? error?.responseCode);
  if (statusCode === 429 || THROTTLE_SMTP_CODES.has(statusCode)) {
    return true;
  }

  const message = toLowerMessage(error);
  return (
    message.includes('throttle') || message.includes('rate limit') || message.includes('too many')
  );
}

export function isRecoverableEmailError(error) {
  if (isThrottleEmailError(error)) {
    return true;
  }

  const code = String(error?.code ?? '').toUpperCase();
  if (RECOVERABLE_NETWORK_CODES.has(code)) {
    return true;
  }

  const responseCode = Number(error?.responseCode);
  if (Number.isFinite(responseCode) && responseCode >= 400 && responseCode < 500) {
    return true;
  }

  return false;
}

export function calculateBackoffDelayMs({
  attempt,
  baseDelayMs,
  maxDelayMs,
  retryAfterMs,
  jitterRatio,
}) {
  const safeAttempt = Math.max(1, Number(attempt) || 1);
  const safeBaseDelayMs = Math.max(1, Number(baseDelayMs) || 1000);
  const safeMaxDelayMs = Math.max(safeBaseDelayMs, Number(maxDelayMs) || 900000);
  const safeRetryAfterMs = Math.max(0, Number(retryAfterMs) || 0);
  const safeJitterRatio = Math.min(1, Math.max(0, Number(jitterRatio) || 0));

  const exponentialDelay = Math.min(safeMaxDelayMs, safeBaseDelayMs * 2 ** (safeAttempt - 1));
  const jitterMax = Math.floor(exponentialDelay * safeJitterRatio);
  const jitter = jitterMax > 0 ? Math.floor(Math.random() * (jitterMax + 1)) : 0;
  const withJitter = Math.min(safeMaxDelayMs, exponentialDelay + jitter);

  return Math.min(safeMaxDelayMs, Math.max(withJitter, safeRetryAfterMs));
}

export function toErrorSummary(error) {
  const statusCode = error?.statusCode ?? error?.status ?? error?.responseCode;
  const code = error?.code ? ` code=${error.code}` : '';
  const status = statusCode ? ` status=${statusCode}` : '';
  const message = String(error?.message ?? 'Unknown email error').slice(0, 500);
  return `${message}${code}${status}`;
}
