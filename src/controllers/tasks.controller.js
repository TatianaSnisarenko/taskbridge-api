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

export const updateTaskDraft = asyncHandler(async (req, res) => {
  const result = await tasksService.updateTaskDraft({
    userId: req.user.id,
    taskId: req.params.taskId,
    task: req.body,
  });

  return res.status(200).json({
    task_id: result.taskId,
    updated: result.updated,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const publishTask = asyncHandler(async (req, res) => {
  const result = await tasksService.publishTask({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    published_at: result.publishedAt.toISOString(),
  });
});
