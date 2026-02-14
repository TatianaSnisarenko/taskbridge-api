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
