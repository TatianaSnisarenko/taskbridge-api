import cloudinary from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.v2.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

function ensureCloudinaryConfigured() {
  if (!env.cloudinaryCloudName) {
    throw new ApiError(500, 'UPLOAD_FAILED', 'Cloudinary is not configured');
  }
}

async function uploadAsset(buffer, options = {}, uploadLabel = 'file') {
  ensureCloudinaryConfigured();

  const uploadOptions = {
    resource_type: options.resource_type || 'auto',
    public_id: options.public_id,
    filename_override: options.filename_override,
    discard_original_filename: options.discard_original_filename,
    use_filename: options.use_filename,
    unique_filename: options.unique_filename,
    width: options.width,
    height: options.height,
    crop: options.crop,
    gravity: options.gravity,
    quality: options.quality,
    fetch_format: options.fetch_format,
  };

  if (!options.public_id) {
    uploadOptions.folder = options.folder || 'teamup';
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        reject(
          new ApiError(500, 'UPLOAD_FAILED', `Failed to upload ${uploadLabel}: ${error.message}`)
        );
      } else {
        resolve(result);
      }
    });

    stream.end(buffer);
  });
}

export async function uploadImage(buffer, options = {}) {
  return uploadAsset(buffer, options, 'image');
}

export async function uploadFile(buffer, options = {}) {
  return uploadAsset(buffer, options, 'file');
}

export async function deleteFile(publicId, resourceType = 'auto') {
  if (!env.cloudinaryCloudName) {
    return;
  }

  try {
    const resolvedResourceType = resourceType === 'auto' ? 'raw' : resourceType;
    await cloudinary.v2.uploader.destroy(publicId, { resource_type: resolvedResourceType });
  } catch (error) {
    console.error(`Failed to delete file ${publicId}:`, error);
  }
}

export async function deleteImage(publicId) {
  if (!env.cloudinaryCloudName) {
    return;
  }

  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete image ${publicId}:`, error);
  }
}
