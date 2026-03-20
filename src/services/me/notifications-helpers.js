/**
 * Check if a notification is relevant for a given persona
 */
export function isNotificationRelevantForPersona(notif, userId, persona) {
  switch (notif.type) {
    case 'APPLICATION_CREATED':
      // Sent to task owner (company) when developer applies
      return persona === 'company' && notif.task?.ownerUserId === userId;
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
      // Sent to developer after company responds to their application
      return persona === 'developer';
    case 'COMPLETION_REQUESTED':
      // Sent to task owner (company) when developer requests completion,
      // OR sent to developer when company rejects completion (non-final bounce-back)
      if (notif.task?.ownerUserId === userId) return persona === 'company';
      return persona === 'developer';
    case 'TASK_DISPUTE_OPENED':
      // Sent to developer when company opens dispute,
      // OR sent to company when developer escalates completion dispute
      if (notif.task?.ownerUserId === userId) return persona === 'company';
      return persona === 'developer';
    case 'TASK_COMPLETED':
      // Sent to developer when company confirms or final-rejects task
      return persona === 'developer';
    case 'TASK_DELETED':
    case 'PROJECT_DELETED':
      // Sent to developers who applied to the deleted task/project tasks
      return persona === 'developer';
    case 'TASK_INVITE_CREATED':
    case 'TASK_INVITE_CANCELLED':
      // Sent to developer
      return persona === 'developer';
    case 'TASK_INVITE_ACCEPTED':
    case 'TASK_INVITE_DECLINED':
      // Sent to task owner (company) when developer responds to invite
      return persona === 'company' && notif.task?.ownerUserId === userId;
    case 'REVIEW_CREATED':
      if (notif.actor?.developerProfile) {
        // Developer left a review, so the task owner should see it.
        return persona === 'company' && notif.task?.ownerUserId === userId;
      }
      // Company left a review, so the developer should see it.
      return persona === 'developer';
    case 'CHAT_MESSAGE':
      return true;
    default:
      return true;
  }
}
