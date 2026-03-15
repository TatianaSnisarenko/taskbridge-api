import { jest } from '@jest/globals';
import { Buffer } from 'node:buffer';
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
    test('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/me/chat/threads/95a53834-d6bb-4b2f-9f6b-e1a9173f12f8/messages')
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(401);
    });

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

    test('creates message successfully for company', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

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
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .send({ text: 'Hello from company!' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        thread_id: thread.id,
        sender_user_id: company.id,
        sender_persona: 'company',
        text: 'Hello from company!',
        sent_at: expect.any(String),
        read_at: null,
      });

      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
      });
      expect(message).toBeTruthy();
      expect(message.text).toBe('Hello from company!');
      expect(message.senderUserId).toBe(company.id);
      expect(message.senderPersona).toBe('company');
    });

    test('creates message with attachments via multipart form-data', async () => {
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
        .field('text', 'Files attached')
        .attach('files', Buffer.from('pdf-content'), {
          filename: 'spec.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        thread_id: thread.id,
        sender_user_id: developer.id,
        sender_persona: 'developer',
        text: 'Files attached',
        sent_at: expect.any(String),
        read_at: null,
        attachments: [
          {
            url: expect.any(String),
            name: 'spec.pdf',
            type: 'application/pdf',
          },
        ],
      });

      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
        include: { attachments: true },
      });
      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0]).toMatchObject({
        name: 'spec.pdf',
        type: 'application/pdf',
      });

      const messagesRes = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(messagesRes.status).toBe(200);
      expect(messagesRes.body.items).toEqual([
        expect.objectContaining({
          id: message.id,
          attachments: [
            {
              url: expect.any(String),
              name: 'spec.pdf',
              type: 'application/pdf',
            },
          ],
        }),
      ]);
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
});
