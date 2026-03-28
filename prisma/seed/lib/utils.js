export function generateEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
}

export function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeTechList(list) {
  const map = new Map();

  for (const item of list) {
    const slug = item.slug ? item.slug : slugify(item.name);
    const existing = map.get(slug);

    if (!existing) {
      map.set(slug, { ...item, slug });
      continue;
    }

    map.set(slug, {
      ...existing,
      popularityScore: Math.max(existing.popularityScore ?? 0, item.popularityScore ?? 0),
      type: existing.type !== 'OTHER' ? existing.type : item.type,
      name: existing.name.length >= item.name.length ? existing.name : item.name,
    });
  }

  return Array.from(map.values());
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom(list, count) {
  if (count <= 0) return [];
  return shuffle(list).slice(0, Math.min(count, list.length));
}

export function buildNotificationPayload({
  taskId,
  applicationId = null,
  reviewId = null,
  rating = null,
  completedAt = null,
  threadId = null,
}) {
  const payload = {};
  if (taskId) payload.task_id = taskId;
  if (applicationId) payload.application_id = applicationId;
  if (reviewId) payload.review_id = reviewId;
  if (rating !== null) payload.rating = rating;
  if (completedAt) payload.completed_at = completedAt;
  if (threadId) payload.thread_id = threadId;
  return payload;
}

export async function createNotificationIfMissing(
  prisma,
  { userId, actorUserId, taskId, type, payload, threadId = null, projectId = null }
) {
  if (type === 'CHAT_MESSAGE') {
    return prisma.notification.create({
      data: {
        userId,
        actorUserId,
        taskId,
        threadId,
        projectId,
        type,
        payload,
      },
    });
  }

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      actorUserId,
      taskId,
      threadId,
      projectId,
      type,
    },
  });

  if (existing) return existing;

  return prisma.notification.create({
    data: {
      userId,
      actorUserId,
      taskId,
      threadId,
      projectId,
      type,
      payload,
    },
  });
}
