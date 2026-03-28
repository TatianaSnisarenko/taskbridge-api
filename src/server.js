import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { startVerificationTokenCleanup } from './jobs/verification-token-cleanup.js';
import { connectRedis, disconnectRedis } from './cache/redis.js';

const app = createApp(env.appBaseUrl);

let server;
let cleanupTask;

async function start() {
  try {
    console.log(`\n🚀 Starting TeamUp Backend in ${env.nodeEnv.toUpperCase()} mode\n`);

    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');

    await connectRedis();

    const cleanup = startVerificationTokenCleanup();
    cleanupTask = cleanup.task;
    await cleanup.runOnce();

    server = app.listen(env.port, () => {
      const baseUrl = env.appBaseUrl.replace(/\/$/, '');
      const frontendUrl = env.frontendBaseUrl.replace(/\/$/, '');

      console.log('\n📍 Service URLs:');
      console.log(`  🔗 Backend:  ${baseUrl}`);
      console.log(`  🔗 Frontend: ${frontendUrl}`);
      console.log(`  📚 Swagger:  ${baseUrl}/api/v1/docs`);
      console.log(`  💚 Health:   GET ${baseUrl}/api/v1/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server during dependency initialization.');
    console.error(error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down...');
  if (!server) {
    if (cleanupTask) cleanupTask.stop();
    await disconnectRedis();
    await prisma.$disconnect();
    process.exit(0);
  }

  server.close(async () => {
    if (cleanupTask) cleanupTask.stop();
    await disconnectRedis();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
