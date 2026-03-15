import { TIMEZONES } from '../data/timezones.js';

/**
 * Parses timezone offset from label, e.g. "(UTC+02:00) Europe/Kyiv" -> 120.
 */
function parseOffsetMinutes(label) {
  const match = label.match(/^\(UTC([+-])(\d{2}):(\d{2})\)/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '+' ? 1 : -1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

/**
 * Sorts by UTC offset first, then by value for stable and readable ordering.
 */
function sortByOffsetThenName(a, b) {
  const offsetDiff = parseOffsetMinutes(a.label) - parseOffsetMinutes(b.label);
  if (offsetDiff !== 0) {
    return offsetDiff;
  }
  return a.value.localeCompare(b.value);
}

/**
 * Parses numeric query formats for offset search:
 * "2", "+2", "-5", "02:00", "utc+02:00".
 */
function parseOffsetQuery(query) {
  const normalized = query.toLowerCase().replace(/\s+/g, '').replace(/^utc/, '');
  const match = normalized.match(/^([+-])?(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  return {
    sign: match[1] ?? null,
    hours: Number.parseInt(match[2], 10),
    minutes: match[3] == null ? null : Number.parseInt(match[3], 10),
  };
}

function matchesOffsetQuery(offsetQuery, offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  if (offsetQuery.sign && offsetQuery.sign !== sign) {
    return false;
  }

  if (offsetQuery.hours !== hours) {
    return false;
  }

  if (offsetQuery.minutes != null && offsetQuery.minutes !== minutes) {
    return false;
  }

  return true;
}

function matchesTimezoneQuery(timezone, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const offsetQuery = parseOffsetQuery(normalized);
  if (offsetQuery) {
    return matchesOffsetQuery(offsetQuery, parseOffsetMinutes(timezone.label));
  }

  return (
    timezone.value.toLowerCase().includes(normalized) ||
    timezone.label.toLowerCase().includes(normalized)
  );
}

function uniqueByOffset(items) {
  const byOffset = new Map();
  for (const item of items) {
    const offset = parseOffsetMinutes(item.label);
    if (!byOffset.has(offset)) {
      byOffset.set(offset, item);
    }
  }
  return Array.from(byOffset.values());
}

/**
 * Returns supported IANA timezones with optional autocomplete.
 * No DB access needed - the list is static and maintained in src/data/timezones.js.
 */
export function getTimezones({ q, limit, groupByOffset = false } = {}) {
  const resolvedLimit = limit ?? (q ? 50 : TIMEZONES.length);
  const sorted = [...TIMEZONES].sort(sortByOffsetThenName);
  const filtered = sorted.filter((timezone) => matchesTimezoneQuery(timezone, q ?? ''));
  const grouped = groupByOffset ? uniqueByOffset(filtered) : filtered;
  const items = grouped.slice(0, resolvedLimit);

  return { items };
}
