import { asyncHandler } from '../utils/asyncHandler.js';
import * as projectsService from '../services/projects.service.js';

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
