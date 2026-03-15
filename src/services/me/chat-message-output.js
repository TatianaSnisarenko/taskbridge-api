function toIsoString(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function mapChatAttachmentOutput(attachment) {
  return {
    url: attachment.url,
    name: attachment.name,
    type: attachment.type,
  };
}

export function mapChatMessageOutput(message, options = {}) {
  return {
    id: message.id,
    ...(message.threadId ? { thread_id: message.threadId } : {}),
    sender_user_id: message.senderUserId,
    sender_persona: message.senderPersona,
    text: message.text,
    sent_at: toIsoString(message.sentAt),
    read_at: toIsoString(options.readAt ?? null),
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map(mapChatAttachmentOutput)
      : [],
  };
}
