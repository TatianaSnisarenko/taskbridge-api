import { asyncHandler } from '../utils/asyncHandler.js';
import * as tasksService from '../services/tasks.service.js';

export const createTaskDraft = asyncHandler(async (req, res) => {
  const result = await tasksService.createTaskDraft({
    userId: req.user.id,
    task: req.body,
  });

  return res.status(201).json({
    task_id: result.taskId,
    status: result.status,
    created_at: result.createdAt.toISOString(),
  });
});
