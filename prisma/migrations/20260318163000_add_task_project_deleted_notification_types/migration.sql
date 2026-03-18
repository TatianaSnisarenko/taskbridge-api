-- Add notification types for deletion events
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_DELETED';
