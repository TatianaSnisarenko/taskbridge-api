import { Buffer } from 'node:buffer';
import { jest } from '@jest/globals';

const makeCloudinaryMock = () => {
  const uploadStream = jest.fn();
  const destroy = jest.fn();
  const config = jest.fn();

  return {
    mock: {
      v2: {
        config,
        uploader: {
          upload_stream: uploadStream,
          destroy,
        },
      },
    },
    uploadStream,
    destroy,
    config,
  };
};

async function loadCloudinaryUtils({ cloudName = null, apiKey = null, apiSecret = null } = {}) {
  jest.resetModules();

  const cloudinary = makeCloudinaryMock();

  jest.unstable_mockModule('cloudinary', () => ({
    default: cloudinary.mock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      cloudinaryCloudName: cloudName,
      cloudinaryApiKey: apiKey,
      cloudinaryApiSecret: apiSecret,
    },
  }));

  const mod = await import('../../src/utils/cloudinary.js');
  return { mod, cloudinary };
}

describe('cloudinary utils', () => {
  test('uploadImage throws when cloudinary is not configured', async () => {
    const { mod } = await loadCloudinaryUtils();

    await expect(mod.uploadImage(Buffer.from('img'))).rejects.toMatchObject({
      status: 500,
      code: 'UPLOAD_FAILED',
    });
  });

  test('uploadImage resolves uploaded result and uses default folder', async () => {
    const { mod, cloudinary } = await loadCloudinaryUtils({
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
    });

    cloudinary.uploadStream.mockImplementation((opts, cb) => {
      return {
        end: () => cb(null, { public_id: 'id1', secure_url: 'https://cdn.example.com/id1' }),
      };
    });

    const result = await mod.uploadImage(Buffer.from('img'));

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'key',
      api_secret: 'secret',
    });
    expect(cloudinary.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'teamup',
        resource_type: 'auto',
      }),
      expect.any(Function)
    );
    expect(result).toEqual({ public_id: 'id1', secure_url: 'https://cdn.example.com/id1' });
  });

  test('uploadImage rejects with ApiError when uploader returns error', async () => {
    const { mod, cloudinary } = await loadCloudinaryUtils({
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
    });

    cloudinary.uploadStream.mockImplementation((opts, cb) => {
      return {
        end: () => cb(new Error('upload failed'), null),
      };
    });

    await expect(mod.uploadImage(Buffer.from('img'))).rejects.toMatchObject({
      status: 500,
      code: 'UPLOAD_FAILED',
      message: expect.stringContaining('upload failed'),
    });
  });

  test('deleteImage returns silently when cloudinary is not configured', async () => {
    const { mod, cloudinary } = await loadCloudinaryUtils();

    await expect(mod.deleteImage('pid')).resolves.toBeUndefined();
    expect(cloudinary.destroy).not.toHaveBeenCalled();
  });

  test('deleteImage calls destroy when configured', async () => {
    const { mod, cloudinary } = await loadCloudinaryUtils({
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
    });

    cloudinary.destroy.mockResolvedValue({ result: 'ok' });

    await mod.deleteImage('pid');

    expect(cloudinary.destroy).toHaveBeenCalledWith('pid');
  });

  test('deleteImage swallows destroy errors', async () => {
    const { mod, cloudinary } = await loadCloudinaryUtils({
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
    });

    cloudinary.destroy.mockRejectedValue(new Error('destroy failed'));

    await expect(mod.deleteImage('pid')).resolves.toBeUndefined();
  });
});
