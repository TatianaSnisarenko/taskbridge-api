import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as meService from '../services/me.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [dev, company] = await Promise.all([
    prisma.developerProfile.findUnique({ where: { userId } }),
    prisma.companyProfile.findUnique({ where: { userId } }),
  ]);

  return res.status(200).json({
    user_id: userId,
    email: req.user.email,
    hasDeveloperProfile: !!dev,
    hasCompanyProfile: !!company,
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
