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
    technology_ids: Array.isArray(req.query.technology_ids)
      ? req.query.technology_ids
      : req.query.technology_ids
        ? [req.query.technology_ids]
        : [],
    tech_match: req.query.tech_match || 'ANY',
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
export const acceptApplication = asyncHandler(async (req, res) => {
  const result = await tasksService.acceptApplication({
    userId: req.user.id,
    applicationId: req.params.applicationId,
  });

  return res.status(200).json({
    task_id: result.task_id,
    accepted_application_id: result.accepted_application_id,
    task_status: result.task_status,
    accepted_developer_user_id: result.accepted_developer_user_id,
    thread_id: result.thread_id,
  });
});

export const rejectApplication = asyncHandler(async (req, res) => {
  const result = await tasksService.rejectApplication({
    userId: req.user.id,
    applicationId: req.params.applicationId,
  });

  return res.status(200).json({
    application_id: result.application_id,
    status: result.status,
    updated_at: result.updated_at,
  });
});

export const requestTaskCompletion = asyncHandler(async (req, res) => {
  const result = await tasksService.requestTaskCompletion({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
  });
});

export const confirmTaskCompletion = asyncHandler(async (req, res) => {
  const result = await tasksService.confirmTaskCompletion({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    completed_at: result.completedAt.toISOString(),
  });
});

export const rejectTaskCompletion = asyncHandler(async (req, res) => {
  const result = await tasksService.rejectTaskCompletion({
    userId: req.user.id,
    taskId: req.params.taskId,
    feedback: req.body.feedback,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    rejection_count: result.rejectionCount,
    is_final_rejection: result.isFinalRejection,
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const result = await tasksService.createReview({
    userId: req.user.id,
    taskId: req.params.taskId,
    review: req.body,
  });

  return res.status(201).json({
    review_id: result.reviewId,
    task_id: result.taskId,
    author_user_id: result.authorUserId,
    target_user_id: result.targetUserId,
    rating: result.rating,
    text: result.text,
    created_at: result.createdAt.toISOString(),
  });
});
