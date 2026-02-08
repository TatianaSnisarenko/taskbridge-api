import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';

const app = createApp();

let server;

async function start() {
  try {
    await prisma.$connect();
    console.log('Connection to database - success');
    server = app.listen(env.port, () => {
      console.log(`API listening on http://localhost:${env.port}/`);
      console.log(`Health check: GET http://localhost:${env.port}/api/v1/health`);
      console.log(`Swagger: http://localhost:${env.port}/api/v1/docs`);
    });
  } catch (error) {
    console.error('Failed to connect to database on startup.');
    console.error(error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down...');
  if (!server) {
    await prisma.$disconnect();
    process.exit(0);
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
