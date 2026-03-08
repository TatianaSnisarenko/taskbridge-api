import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as profilesService from '../services/profiles/index.js';

export const createDeveloperProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.createDeveloperProfile({
    userId: req.user.id,
    profile: req.body,
  });

  return res.status(201).json({
    user_id: result.userId,
    created: result.created,
  });
});

export const updateDeveloperProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.updateDeveloperProfile({
    userId: req.user.id,
    profile: req.body,
  });

  return res.status(200).json(result);
});

export const getDeveloperProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.getDeveloperProfileByUserId({
    userId: req.params.userId,
  });

  return res.status(200).json(result);
});

export const createCompanyProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.createCompanyProfile({
    userId: req.user.id,
    profile: req.body,
  });

  return res.status(201).json({
    user_id: result.userId,
    created: result.created,
  });
});

export const updateCompanyProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.updateCompanyProfile({
    userId: req.user.id,
    profile: req.body,
  });

  return res.status(200).json({
    user_id: result.userId,
    updated: result.updated,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const getCompanyProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.getCompanyProfileByUserId({
    userId: req.params.userId,
  });

  return res.status(200).json(result);
});

export const getUserReviews = asyncHandler(async (req, res) => {
  const result = await profilesService.getUserReviews({
    userId: req.params.userId,
    page: req.query.page,
    size: req.query.size,
  });

  return res.status(200).json(result);
});

export const uploadDeveloperAvatar = asyncHandler(async (req, res) => {
  // Validate file exists
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'file', issue: 'File is required' },
    ]);
  }

  // Validate file type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      {
        field: 'file',
        issue: 'File type must be one of: image/jpeg, image/png, image/webp',
      },
    ]);
  }

  // Validate file size (5MB = 5242880 bytes)
  if (req.file.size > 5242880) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'file', issue: 'File size must not exceed 5MB' },
    ]);
  }

  const result = await profilesService.uploadDeveloperAvatar({
    userId: req.user.id,
    file: req.file,
  });

  return res.status(200).json({
    user_id: result.userId,
    avatar_url: result.avatarUrl,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const deleteDeveloperAvatar = asyncHandler(async (req, res) => {
  const result = await profilesService.deleteDeveloperAvatar({
    userId: req.user.id,
  });

  return res.status(200).json({
    user_id: result.userId,
    avatar_url: result.avatarUrl,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const uploadCompanyLogo = asyncHandler(async (req, res) => {
  // Validate file exists
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'file', issue: 'File is required' },
    ]);
  }

  // Validate file type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      {
        field: 'file',
        issue: 'File type must be one of: image/jpeg, image/png, image/webp',
      },
    ]);
  }

  // Validate file size (5MB = 5242880 bytes)
  if (req.file.size > 5242880) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'file', issue: 'File size must not exceed 5MB' },
    ]);
  }

  const result = await profilesService.uploadCompanyLogo({
    userId: req.user.id,
    file: req.file,
  });

  return res.status(200).json({
    user_id: result.userId,
    logo_url: result.logoUrl,
    updated_at: result.updatedAt.toISOString(),
  });
});

export const deleteCompanyLogo = asyncHandler(async (req, res) => {
  const result = await profilesService.deleteCompanyLogo({
    userId: req.user.id,
  });

  return res.status(200).json({
    user_id: result.userId,
    logo_url: result.logoUrl,
    updated_at: result.updatedAt.toISOString(),
  });
});
