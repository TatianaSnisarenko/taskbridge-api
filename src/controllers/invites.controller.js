import { asyncHandler } from '../utils/asyncHandler.js';
import * as invitesService from '../services/invites.service.js';

export const createTaskInvite = asyncHandler(async (req, res) => {
  const result = await invitesService.createTaskInvite({
    userId: req.user.id,
    taskId: req.params.taskId,
    developerId: req.body.developer_id,
    message: req.body.message,
  });

  return res.status(201).json(result);
});

export const getTaskInvites = asyncHandler(async (req, res) => {
  const result = await invitesService.getTaskInvites({
    userId: req.user.id,
    taskId: req.params.taskId,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    status: req.query.status,
  });

  return res.status(200).json(result);
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const result = await invitesService.acceptInvite({
    userId: req.user.id,
    inviteId: req.params.inviteId,
  });

  return res.status(200).json(result);
});

export const declineInvite = asyncHandler(async (req, res) => {
  const result = await invitesService.declineInvite({
    userId: req.user.id,
    inviteId: req.params.inviteId,
  });

  return res.status(200).json(result);
});

export const cancelInvite = asyncHandler(async (req, res) => {
  const result = await invitesService.cancelInvite({
    userId: req.user.id,
    inviteId: req.params.inviteId,
  });

  return res.status(200).json(result);
});
