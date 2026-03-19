import { ApiError } from '../../utils/ApiError.js';
import {
  findTaskForThreadResolution,
  findThreadIdByTaskId,
  upsertThreadByTaskId,
} from '../../db/queries/chat.queries.js';
import { getThreadById } from './threads-read.js';

/**
 * Resolves chat thread by task ID for the current participant.
 * If thread does not exist yet and task is already IN_PROGRESS, creates it and returns thread details.
 */
export async function getThreadByTaskId({ userId, persona, taskId }) {
  const thread = await findThreadIdByTaskId(taskId);

  if (thread) {
    return getThreadById({ userId, persona, threadId: thread.id });
  }

  const task = await findTaskForThreadResolution(taskId);

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Chat thread not found');
  }

  const acceptedDeveloperUserId = task.acceptedApplication?.developerUserId;
  if (!acceptedDeveloperUserId) {
    throw new ApiError(404, 'NOT_FOUND', 'Chat thread not found');
  }

  if (persona === 'developer') {
    if (acceptedDeveloperUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
  }

  if (task.status !== 'IN_PROGRESS') {
    throw new ApiError(404, 'NOT_FOUND', 'Chat thread not found');
  }

  const createdThread = await upsertThreadByTaskId({
    taskId,
    companyUserId: task.ownerUserId,
    developerUserId: acceptedDeveloperUserId,
  });

  return getThreadById({ userId, persona, threadId: createdThread.id });
}
