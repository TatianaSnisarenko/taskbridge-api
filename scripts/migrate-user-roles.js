// scripts/migrate-user-roles.js
// Usage: node scripts/migrate-user-roles.js
// This script copies User.role (enum) to User.roles (string array) for all users.

import 'dotenv/config';
import { prisma } from '../src/db/prisma.js';

async function migrateRoles() {
  const users = await prisma.user.findMany({ select: { id: true, role: true, roles: true } });
  let updated = 0;

  for (const user of users) {
    // If roles already set, skip
    if (user.roles && user.roles.length > 0) continue;
    // Copy role to roles array
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: [user.role] },
    });
    updated++;
  }

  console.log(`Migrated roles for ${updated} users.`);
}

migrateRoles()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
