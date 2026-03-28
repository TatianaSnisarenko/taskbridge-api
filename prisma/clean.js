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
 * - child tables first, then parents
 * - nullify Task.acceptedApplicationId before removing applications
 * - remove pivot tables before Technology / Project / Task
 */

async function cleanDatabase() {
  console.log('Starting database cleanup...');

  try {
    const deletedCounts = {};

    const deleteModel = async (label, delegate, where = {}) => {
      const result = await delegate.deleteMany({ where });
      deletedCounts[label] = result.count;
      console.log(`Deleted ${result.count} from ${label}`);
    };

    // Break Task -> Application link to prevent FK violations while deleting applications.
    await prisma.task.updateMany({
      where: { acceptedApplicationId: { not: null } },
      data: { acceptedApplicationId: null },
    });

    await deleteModel('notifications', prisma.notification);

    await deleteModel('chatMessageAttachments', prisma.chatMessageAttachment);
    await deleteModel('chatThreadReads', prisma.chatThreadRead);
    await deleteModel('chatMessages', prisma.chatMessage);
    await deleteModel('chatThreads', prisma.chatThread);

    await deleteModel('taskFavorites', prisma.taskFavorite);
    await deleteModel('taskInvites', prisma.taskInvite);
    await deleteModel('taskReports', prisma.taskReport);
    await deleteModel('taskDisputes', prisma.taskDispute);
    await deleteModel('reviews', prisma.review);
    await deleteModel('applications', prisma.application);

    await deleteModel('taskTechnologies', prisma.taskTechnology);
    await deleteModel('projectTechnologies', prisma.projectTechnology);
    await deleteModel('developerTechnologies', prisma.developerTechnology);

    await deleteModel('tasks', prisma.task);
    await deleteModel('projectReports', prisma.projectReport);
    await deleteModel('projects', prisma.project);

    await deleteModel('platformReviews', prisma.platformReview);
    await deleteModel('userOnboardingStates', prisma.userOnboardingState);
    await deleteModel('developerProfiles', prisma.developerProfile);
    await deleteModel('companyProfiles', prisma.companyProfile);
    await deleteModel('verificationTokens', prisma.verificationToken);
    await deleteModel('refreshTokens', prisma.refreshToken);

    await deleteModel('technologySuggestions', prisma.technologySuggestion);
    await deleteModel('technologies', prisma.technology);

    await deleteModel('emailOutbox', prisma.emailOutbox);
    await deleteModel('users', prisma.user);

    console.log('Database successfully cleaned');
    console.log('Deleted records statistics:');

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    Object.entries(deletedCounts).forEach(([table, count]) => {
      console.log(`${table.padEnd(25)} -> ${count}`);
    });

    console.log(`${'TOTAL'.padEnd(25)} -> ${totalDeleted}`);
    console.log('Table structure and migrations remain intact');
  } catch (error) {
    console.error('Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanDatabase().catch((error) => {
  console.error('Critical error:', error);
  process.exit(1);
});
