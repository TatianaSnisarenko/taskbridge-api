import 'dotenv/config';
import { prisma } from '../src/db/prisma.js';

/**
 * Clean Database Script
 *
 * This script deletes ALL data from the database while preserving table structure
 * and migrations. Used before major schema changes to avoid migrating test data.
 *
 * How it works:
 * 1. Deletes data from tables in correct order (from child to parent)
 * 2. Respects foreign key constraints - first deletes records from tables
 *    that reference others, then from parent tables
 * 3. Uses deleteMany() instead of TRUNCATE so Prisma triggers work properly
 * 4. After cleanup, database remains with structure ready for new migrations
 *
 * Deletion order (important!):
 * - Notification → references User, Project, Task, ChatThread
 * - ChatThreadRead → references ChatThread, User
 * - ChatMessage → references ChatThread, User
 * - ChatThread → references Task, User
 * - Review → references Task, User
 * - Application → references Task, User
 * - Task → references Project, User, has self-reference via acceptedApplicationId
 * - ProjectReport → references Project, User
 * - Project → references User
 * - DeveloperProfile → references User
 * - CompanyProfile → references User
 * - VerificationToken → references User
 * - RefreshToken → references User
 * - User → parent table for everything
 */

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Counter for deleted records statistics
    const deletedCounts = {};

    // 1. Delete Notifications (depends on many tables)
    console.log('🗑️  Deleting notifications...');
    const notifications = await prisma.notification.deleteMany({});
    deletedCounts.notifications = notifications.count;
    console.log(`   ✓ Deleted ${notifications.count} records\n`);

    // 2. Delete ChatThreadRead
    console.log('🗑️  Deleting chat thread reads...');
    const chatThreadReads = await prisma.chatThreadRead.deleteMany({});
    deletedCounts.chatThreadReads = chatThreadReads.count;
    console.log(`   ✓ Deleted ${chatThreadReads.count} records\n`);

    // 3. Delete ChatMessage
    console.log('🗑️  Deleting chat messages...');
    const chatMessages = await prisma.chatMessage.deleteMany({});
    deletedCounts.chatMessages = chatMessages.count;
    console.log(`   ✓ Deleted ${chatMessages.count} records\n`);

    // 4. Delete ChatThread
    console.log('🗑️  Deleting chat threads...');
    const chatThreads = await prisma.chatThread.deleteMany({});
    deletedCounts.chatThreads = chatThreads.count;
    console.log(`   ✓ Deleted ${chatThreads.count} records\n`);

    // 5. Delete Reviews
    console.log('🗑️  Deleting reviews...');
    const reviews = await prisma.review.deleteMany({});
    deletedCounts.reviews = reviews.count;
    console.log(`   ✓ Deleted ${reviews.count} records\n`);

    // 6. Delete Applications
    console.log('🗑️  Deleting applications...');
    const applications = await prisma.application.deleteMany({});
    deletedCounts.applications = applications.count;
    console.log(`   ✓ Deleted ${applications.count} records\n`);

    // 7. Delete Tasks (need to nullify acceptedApplicationId first due to self-reference)
    console.log('🗑️  Deleting tasks...');
    // First nullify acceptedApplicationId to avoid foreign key issues
    await prisma.task.updateMany({
      where: { acceptedApplicationId: { not: null } },
      data: { acceptedApplicationId: null },
    });
    const tasks = await prisma.task.deleteMany({});
    deletedCounts.tasks = tasks.count;
    console.log(`   ✓ Deleted ${tasks.count} records\n`);

    // 8. Delete ProjectReports
    console.log('🗑️  Deleting project reports...');
    const projectReports = await prisma.projectReport.deleteMany({});
    deletedCounts.projectReports = projectReports.count;
    console.log(`   ✓ Deleted ${projectReports.count} records\n`);

    // 9. Delete Projects
    console.log('🗑️  Deleting projects...');
    const projects = await prisma.project.deleteMany({});
    deletedCounts.projects = projects.count;
    console.log(`   ✓ Deleted ${projects.count} records\n`);

    // 10. Delete DeveloperProfiles
    console.log('🗑️  Deleting developer profiles...');
    const developerProfiles = await prisma.developerProfile.deleteMany({});
    deletedCounts.developerProfiles = developerProfiles.count;
    console.log(`   ✓ Deleted ${developerProfiles.count} records\n`);

    // 11. Delete CompanyProfiles
    console.log('🗑️  Deleting company profiles...');
    const companyProfiles = await prisma.companyProfile.deleteMany({});
    deletedCounts.companyProfiles = companyProfiles.count;
    console.log(`   ✓ Deleted ${companyProfiles.count} records\n`);

    // 12. Delete VerificationTokens
    console.log('🗑️  Deleting verification tokens...');
    const verificationTokens = await prisma.verificationToken.deleteMany({});
    deletedCounts.verificationTokens = verificationTokens.count;
    console.log(`   ✓ Deleted ${verificationTokens.count} records\n`);

    // 13. Delete RefreshTokens
    console.log('🗑️  Deleting refresh tokens...');
    const refreshTokens = await prisma.refreshToken.deleteMany({});
    deletedCounts.refreshTokens = refreshTokens.count;
    console.log(`   ✓ Deleted ${refreshTokens.count} records\n`);

    // 14. Delete Users (parent table, delete last)
    console.log('🗑️  Deleting users...');
    const users = await prisma.user.deleteMany({});
    deletedCounts.users = users.count;
    console.log(`   ✓ Deleted ${users.count} records\n`);

    // Output summary statistics
    console.log('═══════════════════════════════════════════════');
    console.log('✨ Database successfully cleaned!\n');
    console.log('📊 Deleted records statistics:');
    console.log('═══════════════════════════════════════════════');

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    Object.entries(deletedCounts).forEach(([table, count]) => {
      console.log(`   ${table.padEnd(25)} → ${count} records`);
    });

    console.log('───────────────────────────────────────────────');
    console.log(`   ${'TOTAL'.padEnd(25)} → ${totalDeleted} records`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('ℹ️  Table structure and migrations remain intact');
    console.log('ℹ️  Database is ready for new migrations\n');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanDatabase().catch((error) => {
  console.error('❌ Critical error:', error);
  process.exit(1);
});
