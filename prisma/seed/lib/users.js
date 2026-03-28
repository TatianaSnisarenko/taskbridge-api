import { hashPassword } from '../../../src/utils/password.js';

export async function createUser(
  prisma,
  { email, password = 'Password123!', developerProfile = null, companyProfile = null }
) {
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified: true,
      ...(developerProfile && {
        developerProfile: {
          create: developerProfile,
        },
      }),
      ...(companyProfile && {
        companyProfile: {
          create: companyProfile,
        },
      }),
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });
}

export async function createAdminIfNeeded(prisma) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('WARN: ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin creation');
    return null;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingUser) {
    const hasAdminRole = existingUser.roles.includes('ADMIN');

    if (!hasAdminRole) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { roles: ['USER', 'ADMIN'] },
      });
    }

    console.log(`Admin ensured for existing account: ${adminEmail}`);
    return existingUser;
  }

  const hashedPassword = await hashPassword(adminPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: hashedPassword,
      emailVerified: true,
      roles: ['USER', 'ADMIN'],
    },
  });

  console.log(`Admin created: ${adminEmail}`);
  return adminUser;
}
