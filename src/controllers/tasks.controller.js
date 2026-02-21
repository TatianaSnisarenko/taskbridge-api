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

export const applyToTask = asyncHandler(async (req, res) => {
  const result = await tasksService.applyToTask({
    userId: req.user.id,
    taskId: req.params.taskId,
    application: req.body,
  });

  return res.status(201).json({
    application_id: result.applicationId,
    task_id: result.taskId,
    developer_user_id: result.developerUserId,
    status: result.status,
    created_at: result.createdAt.toISOString(),
  });
});

export const closeTask = asyncHandler(async (req, res) => {
  const result = await tasksService.closeTask({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    closed_at: result.closedAt.toISOString(),
  });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const result = await tasksService.deleteTask({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    deleted_at: result.deletedAt.toISOString(),
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskById({
    userId: req.user?.id,
    taskId: req.params.taskId,
    persona: req.headers['x-persona'],
  });

  return res.status(200).json(result);
});

export const getTasksCatalog = asyncHandler(async (req, res) => {
  const result = await tasksService.getTasksCatalog({
    userId: req.user?.id,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    search: req.query.search,
    category: req.query.category,
    difficulty: req.query.difficulty,
    type: req.query.type,
    skills: Array.isArray(req.query.skill)
      ? req.query.skill
      : req.query.skill
        ? [req.query.skill]
        : [],
    projectId: req.query.project_id,
    owner: req.query.owner === 'true',
    includeDeleted: req.query.include_deleted === 'true',
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});

export const getTaskApplications = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskApplications({
    userId: req.user.id,
    taskId: req.params.taskId,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});
