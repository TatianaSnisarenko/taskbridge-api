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

export async function uploadImage(buffer, options = {}) {
  if (!env.cloudinaryCloudName) {
    throw new ApiError(500, 'UPLOAD_FAILED', 'Cloudinary is not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: options.folder || 'teamup',
        resource_type: 'auto',
        width: options.width,
        height: options.height,
        crop: options.crop,
        gravity: options.gravity,
        quality: options.quality,
        fetch_format: options.fetch_format,
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(500, 'UPLOAD_FAILED', `Failed to upload image: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!env.cloudinaryCloudName) {
    return; // Skip if not configured
  }

  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete image ${publicId}:`, error);
    // Don't throw, just log
  }
}
