import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/utils/cloudinary.js', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(async () => undefined),
  uploadFile: jest.fn(async () => ({
    secure_url:
      'https://res.cloudinary.com/example/raw/upload/v123/teamup/chat-attachments/spec.pdf',
    public_id: 'teamup/chat-attachments/spec',
    resource_type: 'raw',
  })),
  deleteFile: jest.fn(async () => undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('me routes - chat', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
  });

  describe('POST /me/chat/threads/{threadId}/messages', () => {
    test('creates message successfully for developer', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello from developer!' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        thread_id: thread.id,
        sender_user_id: developer.id,
        sender_persona: 'developer',
        text: 'Hello from developer!',
        sent_at: expect.any(String),
        read_at: null,
      });

      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
      });
      expect(message).toBeTruthy();
      expect(message.text).toBe('Hello from developer!');
      expect(message.senderUserId).toBe(developer.id);
      expect(message.senderPersona).toBe('developer');
    });

    test('returns 400 when both text and files are missing', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .field('text', '   ');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            { field: 'text or files', message: 'Either text or at least one file is required' },
          ],
        },
      });
    });
  });

  describe('POST /me/chat/threads/{threadId}/important', () => {
    test('marks thread as important for developer participant', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/important`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        important_at: expect.any(String),
      });

      const readMarker = await prisma.chatThreadRead.findUnique({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: developer.id,
          },
        },
      });

      expect(readMarker).toBeTruthy();
      expect(readMarker.importantAt).toBeInstanceOf(Date);
    });
  });

  describe('GET /me/chat/threads', () => {
    test('returns only important threads when important_only=true', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const taskImportant = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Important Task',
          description: 'Description',
        },
      });

      const taskRegular = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Regular Task',
          description: 'Description',
        },
      });

      const importantThread = await prisma.chatThread.create({
        data: {
          taskId: taskImportant.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: taskRegular.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      await prisma.chatThreadRead.create({
        data: {
          threadId: importantThread.id,
          userId: developer.id,
          lastReadAt: new Date(),
          importantAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads?important_only=true')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        thread_id: importantThread.id,
        important_at: expect.any(String),
      });
    });
  });

  describe('GET /me/chat/threads/{threadId}/messages', () => {
    test('returns only important messages when important_only=true', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const importantMessage = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: developer.id,
          senderPersona: 'developer',
          text: 'Important message',
          importantAt: new Date(),
        },
      });

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Regular message',
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages?important_only=true`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        id: importantMessage.id,
        text: 'Important message',
      });
    });
  });
});
