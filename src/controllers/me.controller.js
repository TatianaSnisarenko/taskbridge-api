import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as meService from '../services/me/index.js';

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [dev, company, onboarding] = await Promise.all([
    prisma.developerProfile.findUnique({ where: { userId } }),
    prisma.companyProfile.findUnique({ where: { userId } }),
    meService.getMyOnboardingState({ userId }),
  ]);

  return res.status(200).json({
    user_id: userId,
    email: req.user.email,
    hasDeveloperProfile: !!dev,
    hasCompanyProfile: !!company,
    onboarding,
  });
});

export const updateMyOnboarding = asyncHandler(async (req, res) => {
  const result = await meService.updateMyOnboardingState({
    userId: req.user.id,
    role: req.body.role,
    status: req.body.status,
    version: req.body.version,
  });

  return res.status(200).json(result);
});

export const resetMyOnboarding = asyncHandler(async (req, res) => {
  const result = await meService.resetMyOnboardingState({
    userId: req.user.id,
    role: req.body.role,
  });

  return res.status(200).json(result);
});

export const checkMyOnboarding = asyncHandler(async (req, res) => {
  const result = await meService.checkShouldShowOnboarding({
    userId: req.user.id,
    role: req.query.role,
    version: parseInt(req.query.version),
  });

  return res.status(200).json(result);
});

export const deleteMyAccount = asyncHandler(async (req, res) => {
  const result = await meService.deactivateMyAccount({ userId: req.user.id });

  return res.status(200).json({
    user_id: result.userId,
    deleted_at: result.deletedAt.toISOString(),
  });
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const result = await meService.getMyApplications({
    userId: req.user.id,
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

export const getMyInvites = asyncHandler(async (req, res) => {
  const { getMyInvites: getMyInvitesService } = await import('../services/invites/index.js');
  const result = await getMyInvitesService({
    userId: req.user.id,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    status: req.query.status,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});

export const getMyTasks = asyncHandler(async (req, res) => {
  const result = await meService.getMyTasks({
    userId: req.user.id,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    status: req.query.status,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});

export const getMyProjects = asyncHandler(async (req, res) => {
  const result = await meService.getMyProjects({
    userId: req.user.id,
    persona: req.persona,
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

export const getMyNotifications = asyncHandler(async (req, res) => {
  const result = await meService.getMyNotifications({
    userId: req.user.id,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    unreadOnly: req.query.unread_only === 'true' || req.query.unread_only === true,
    persona: req.persona,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
    unread_total: result.unread_total,
  });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const result = await meService.markNotificationAsRead({
    userId: req.user.id,
    notificationId: req.params.id,
    persona: req.persona,
  });

  return res.status(200).json({
    id: result.id,
    read_at: result.read_at,
  });
});

export const markNotificationAsUnread = asyncHandler(async (req, res) => {
  const result = await meService.markNotificationAsUnread({
    userId: req.user.id,
    notificationId: req.params.id,
    persona: req.persona,
  });

  return res.status(200).json({
    id: result.id,
    read_at: result.read_at,
  });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await meService.markAllNotificationsAsRead({
    userId: req.user.id,
    persona: req.persona,
  });

  return res.status(200).json({
    updated: result.updated,
    read_at: result.read_at,
  });
});
export const getMyThreads = asyncHandler(async (req, res) => {
  const result = await meService.getMyThreads({
    userId: req.user.id,
    persona: req.headers['x-persona'],
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
    search: req.query.search || '',
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});
export const getThreadById = asyncHandler(async (req, res) => {
  const result = await meService.getThreadById({
    userId: req.user.id,
    persona: req.headers['x-persona'],
    threadId: req.params.threadId,
  });

  return res.status(200).json(result);
});
export const getThreadMessages = asyncHandler(async (req, res) => {
  const result = await meService.getThreadMessages({
    userId: req.user.id,
    persona: req.headers['x-persona'],
    threadId: req.params.threadId,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 50,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});

export const createMessage = asyncHandler(async (req, res) => {
  const result = await meService.createMessage({
    userId: req.user.id,
    persona: req.headers['x-persona'],
    threadId: req.params.threadId,
    text: req.body.text,
    files: req.files,
  });

  return res.status(201).json(result);
});

export const markThreadAsRead = asyncHandler(async (req, res) => {
  const result = await meService.markThreadAsRead({
    userId: req.user.id,
    persona: req.headers['x-persona'],
    threadId: req.params.threadId,
  });

  return res.status(200).json(result);
});

export const addFavoriteTask = asyncHandler(async (req, res) => {
  const result = await meService.addFavoriteTask({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(201).json(result);
});

export const removeFavoriteTask = asyncHandler(async (req, res) => {
  const result = await meService.removeFavoriteTask({
    userId: req.user.id,
    taskId: req.params.taskId,
  });

  return res.status(200).json(result);
});

export const getMyFavoriteTasks = asyncHandler(async (req, res) => {
  const result = await meService.getMyFavoriteTasks({
    userId: req.user.id,
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
