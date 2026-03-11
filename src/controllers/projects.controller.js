import { asyncHandler } from '../utils/asyncHandler.js';
import * as projectsService from '../services/projects/index.js';
import * as tasksService from '../services/tasks/index.js';

export const createProject = asyncHandler(async (req, res) => {
  const result = await projectsService.createProject({
    userId: req.user.id,
    project: req.body,
  });

  return res.status(201).json({
    project_id: result.projectId,
    created_at: result.createdAt.toISOString(),
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const result = await projectsService.updateProject({
    userId: req.user.id,
    projectId: req.params.projectId,
    project: req.body,
  });

  return res.status(200).json({
    project_id: result.projectId,
    updated: result.updated,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const result = await projectsService.deleteProject({
    userId: req.user.id,
    projectId: req.params.projectId,
  });

  return res.status(200).json({
    project_id: result.projectId,
    deleted_at: result.deletedAt.toISOString(),
  });
});

export const getProjects = asyncHandler(async (req, res) => {
  const result = await projectsService.getProjects({
    userId: req.user?.id,
    query: req.query,
  });

  return res.status(200).json(result);
});

export const getProjectById = asyncHandler(async (req, res) => {
  const result = await projectsService.getProjectById({
    userId: req.user?.id,
    projectId: req.params.projectId,
    includeDeleted: req.query.include_deleted,
    previewLimit: req.query.preview_limit,
  });

  return res.status(200).json(result);
});

export const reportProject = asyncHandler(async (req, res) => {
  const result = await projectsService.reportProject({
    userId: req.user.id,
    persona: req.persona,
    projectId: req.params.projectId,
    report: req.body,
  });

  return res.status(201).json({
    report_id: result.reportId,
    created_at: result.createdAt.toISOString(),
  });
});

export const getProjectReports = asyncHandler(async (req, res) => {
  const result = await projectsService.getProjectReports({
    page: req.query.page,
    size: req.query.size,
    status: req.query.status,
    reason: req.query.reason,
  });

  return res.status(200).json({
    items: result.items.map((item) => ({
      report_id: item.id,
      target_type: 'project',
      target_id: item.projectId,
      target: {
        id: item.project.id,
        title: item.project.title,
        status: item.project.status,
        deleted_at: item.project.deletedAt ? item.project.deletedAt.toISOString() : null,
        owner_user_id: item.project.ownerUserId,
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

export const resolveProjectReport = asyncHandler(async (req, res) => {
  const result = await projectsService.resolveProjectReport({
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

export const getProjectTasks = asyncHandler(async (req, res) => {
  const result = await tasksService.getProjectTasks({
    projectId: req.params.projectId,
    userId: req.user?.id,
    page: req.query.page,
    size: req.query.size,
    status: req.query.status,
    includeDeleted: req.query.include_deleted,
  });

  return res.status(200).json(result);
});

export const getProjectReviews = asyncHandler(async (req, res) => {
  const result = await projectsService.getProjectReviews({
    projectId: req.params.projectId,
    page: req.query.page,
    size: req.query.size,
    authorPersona: req.query.author_persona,
  });

  return res.status(200).json(result);
});
