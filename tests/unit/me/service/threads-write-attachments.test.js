import { jest } from '@jest/globals';
import { Buffer } from 'node:buffer';

const createNotificationMock = jest.fn();
const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
};

const prismaMock = {
  $transaction: jest.fn(),
  chatThread: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/notifications/index.js', () => ({
  createNotification: createNotificationMock,
}));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);

const meService = await import('../../../../src/services/me/index.js');

describe('me.service threads attachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploads attachments and returns their metadata', async () => {
    const sentAt = new Date('2026-03-02T10:00:00Z');
    const realDate = Date;
    globalThis.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return sentAt;
        }
        return new realDate(...args);
      }
      static now() {
        return sentAt.getTime();
      }
    };

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th4',
      taskId: 't4',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't4', status: 'IN_PROGRESS', deletedAt: null },
    });
    cloudinaryMock.uploadFile.mockResolvedValue({
      secure_url: 'https://cdn.example.com/spec.pdf',
      public_id: 'teamup/chat-attachments/spec',
      resource_type: 'raw',
    });

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'm4',
            threadId: 'th4',
            senderUserId: 'd1',
            senderPersona: 'developer',
            text: '',
            sentAt,
            attachments: [
              {
                url: 'https://cdn.example.com/spec.pdf',
                name: 'spec.pdf',
                type: 'application/pdf',
              },
            ],
          }),
        },
        chatThread: {
          update: jest.fn().mockResolvedValue({ id: 'th4' }),
        },
      };

      return callback(tx);
    });

    const result = await meService.createMessage({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th4',
      text: ' ',
      files: [
        {
          buffer: Buffer.from('pdf'),
          originalname: 'spec.pdf',
          mimetype: 'application/pdf',
        },
      ],
    });

    expect(cloudinaryMock.uploadFile).toHaveBeenCalledWith(
      Buffer.from('pdf'),
      expect.objectContaining({
        resource_type: 'raw',
        filename_override: 'spec.pdf',
        discard_original_filename: false,
      })
    );
    expect(result.attachments).toEqual([
      {
        url: 'https://cdn.example.com/spec.pdf',
        name: 'spec.pdf',
        type: 'application/pdf',
      },
    ]);

    globalThis.Date = realDate;
  });

  test('decodes mojibake filename for stored attachment name and filename_override', async () => {
    const sentAt = new Date('2026-03-02T10:00:00Z');

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th6',
      taskId: 't6',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't6', status: 'IN_PROGRESS', deletedAt: null },
    });

    cloudinaryMock.uploadFile.mockResolvedValue({
      secure_url: 'https://cdn.example.com/architecture.jpg',
      public_id: 'teamup/chat-attachments/public-id.jpg',
      resource_type: 'raw',
    });

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'm6',
            threadId: 'th6',
            senderUserId: 'd1',
            senderPersona: 'developer',
            text: '',
            sentAt,
            attachments: [
              {
                url: 'https://cdn.example.com/architecture.jpg',
                name: 'Архітектура MVP TeamUp IT.jpg',
                type: 'image/jpeg',
              },
            ],
          }),
        },
        chatThread: {
          update: jest.fn().mockResolvedValue({ id: 'th6' }),
        },
      };

      return callback(tx);
    });

    await meService.createMessage({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th6',
      text: '',
      files: [
        {
          buffer: Buffer.from('image'),
          originalname: 'ÐÑÑÑÑÐµÐºÑÑÑÐ° MVP TeamUp IT.jpg',
          mimetype: 'image/jpeg',
        },
      ],
    });

    const uploadOptions = cloudinaryMock.uploadFile.mock.calls[0][1];

    expect(uploadOptions.filename_override).toBe('Архітектура MVP TeamUp IT.jpg');
  });

  test('keeps extension in generated public_id even when non-ascii base name is sanitized', async () => {
    const sentAt = new Date('2026-03-02T10:00:00Z');

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th7',
      taskId: 't7',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't7', status: 'IN_PROGRESS', deletedAt: null },
    });

    cloudinaryMock.uploadFile.mockResolvedValue({
      secure_url: 'https://cdn.example.com/file.jpg',
      public_id: 'teamup/chat-attachments/public-id.jpg',
      resource_type: 'raw',
    });

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'm7',
            threadId: 'th7',
            senderUserId: 'd1',
            senderPersona: 'developer',
            text: '',
            sentAt,
            attachments: [
              {
                url: 'https://cdn.example.com/file.jpg',
                name: 'Тест.jpg',
                type: 'image/jpeg',
              },
            ],
          }),
        },
        chatThread: {
          update: jest.fn().mockResolvedValue({ id: 'th7' }),
        },
      };

      return callback(tx);
    });

    await meService.createMessage({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th7',
      text: '',
      files: [
        {
          buffer: Buffer.from('image'),
          originalname: 'Тест.jpg',
          mimetype: 'image/jpeg',
        },
      ],
    });

    const uploadOptions = cloudinaryMock.uploadFile.mock.calls[0][1];

    expect(uploadOptions.public_id).toMatch(/^teamup\/chat-attachments\/[0-9a-f-]+-file\.jpg$/);
  });

  test('cleans up already uploaded attachments when a later upload fails', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th5',
      taskId: 't5',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't5', status: 'IN_PROGRESS', deletedAt: null },
    });

    cloudinaryMock.uploadFile
      .mockResolvedValueOnce({
        secure_url: 'https://cdn.example.com/spec-1.pdf',
        public_id: 'teamup/chat-attachments/spec-1',
        resource_type: 'raw',
      })
      .mockRejectedValueOnce({
        status: 500,
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload file',
      });

    await expect(
      meService.createMessage({
        userId: 'd1',
        persona: 'developer',
        threadId: 'th5',
        text: 'files',
        files: [
          {
            buffer: Buffer.from('one'),
            originalname: 'spec-1.pdf',
            mimetype: 'application/pdf',
          },
          {
            buffer: Buffer.from('two'),
            originalname: 'spec-2.pdf',
            mimetype: 'application/pdf',
          },
        ],
      })
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });

    expect(cloudinaryMock.deleteFile).toHaveBeenCalledWith('teamup/chat-attachments/spec-1', 'raw');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
