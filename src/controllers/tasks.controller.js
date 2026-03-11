import { asyncHandler } from '../utils/asyncHandler.js';
import * as tasksService from '../services/tasks/index.js';

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

export const getRecommendedDevelopers = asyncHandler(async (req, res) => {
  const result = await tasksService.getRecommendedDevelopers({
    userId: req.user.id,
    taskId: req.params.taskId,
    limit: parseInt(req.query.limit) || 3,
  });

  return res.status(200).json({
    items: result.items,
    total: result.total,
  });
});

export const getTaskCandidates = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskCandidates({
    userId: req.user.id,
    taskId: req.params.taskId,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    search: req.query.search,
    availability: req.query.availability,
    experienceLevel: req.query.experience_level,
    minRating: req.query.min_rating !== undefined ? Number(req.query.min_rating) : undefined,
    excludeInvited:
      req.query.exclude_invited === true ||
      req.query.exclude_invited === 'true' ||
      req.query.exclude_invited === '1',
    excludeApplied:
      req.query.exclude_applied === true ||
      req.query.exclude_applied === 'true' ||
      req.query.exclude_applied === '1',
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
    response_deadline_at: result.responseDeadlineAt.toISOString(),
  });
});

export const openTaskDispute = asyncHandler(async (req, res) => {
  const result = await tasksService.openTaskDispute({
    userId: req.user.id,
    taskId: req.params.taskId,
    reason: req.body.reason,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    dispute_id: result.disputeId,
  });
});

export const escalateTaskCompletionDispute = asyncHandler(async (req, res) => {
  const result = await tasksService.escalateTaskCompletionDispute({
    userId: req.user.id,
    taskId: req.params.taskId,
    reason: req.body.reason,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    dispute_id: result.disputeId,
  });
});

export const resolveTaskDispute = asyncHandler(async (req, res) => {
  const result = await tasksService.resolveTaskDispute({
    userId: req.user.id,
    taskId: req.params.taskId,
    action: req.body.action,
    reason: req.body.reason,
  });

  return res.status(200).json({
    task_id: result.taskId,
    status: result.status,
    action: result.action,
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

export const getTaskReviews = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskReviews({
    taskId: req.params.taskId,
    page: req.query.page,
    size: req.query.size,
  });

  return res.status(200).json(result);
});

export const getTaskDisputes = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskDisputes({
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    status: req.query.status,
    reasonType: req.query.reason_type,
  });

  return res.status(200).json(result);
});

export const reportTask = asyncHandler(async (req, res) => {
  const result = await tasksService.reportTask({
    userId: req.user.id,
    persona: req.persona,
    taskId: req.params.taskId,
    report: req.body,
  });

  return res.status(201).json({
    report_id: result.reportId,
    created_at: result.createdAt.toISOString(),
  });
});

export const getTaskReports = asyncHandler(async (req, res) => {
  const result = await tasksService.getTaskReports({
    page: req.query.page,
    size: req.query.size,
    status: req.query.status,
    reason: req.query.reason,
  });

  return res.status(200).json({
    items: result.items.map((item) => ({
      report_id: item.id,
      target_type: 'task',
      target_id: item.taskId,
      target: {
        id: item.task.id,
        title: item.task.title,
        status: item.task.status,
        deleted_at: item.task.deletedAt ? item.task.deletedAt.toISOString() : null,
        owner_user_id: item.task.ownerUserId,
      },
      reporter: {
        user_id: item.reporter.id,
        email: item.reporter.email,
        persona: item.reporterPersona,
      },
      reason: item.reason,
      comment: item.comment || '',
      status: item.status,
      resolution_action: item.resolutionAction || null,
      resolution_note: item.resolutionNote || '',
      resolved_by_user_id: item.resolvedByUserId || null,
      resolved_by_email: item.resolvedBy?.email || null,
      resolved_at: item.resolvedAt ? item.resolvedAt.toISOString() : null,
      created_at: item.createdAt.toISOString(),
    })),
    page: result.page,
    size: result.size,
    total: result.total,
  });
});

export const resolveTaskReport = asyncHandler(async (req, res) => {
  const result = await tasksService.resolveTaskReport({
    userId: req.user.id,
    reportId: req.params.reportId,
    action: req.body.action,
    note: req.body.note,
  });

  return res.status(200).json({
    report_id: result.reportId,
    status: result.status,
    action: result.action,
    resolved_at: result.resolvedAt.toISOString(),
  });
});
