export const OPEN_DISPUTE_ACTIONS = ['RETURN_TO_PROGRESS', 'MARK_FAILED', 'MARK_COMPLETED'];

export function mapDisputeListItem(dispute) {
  return {
    disputeId: dispute.id,
    taskId: dispute.task.id,
    taskTitle: dispute.task.title,
    taskStatus: dispute.task.status,
    projectId: dispute.task.projectId,
    companyUserId: dispute.task.ownerUserId,
    companyName: dispute.task.owner.companyProfile?.companyName || null,
    developerUserId: dispute.task.acceptedApplication?.developerUserId || null,
    developerDisplayName:
      dispute.task.acceptedApplication?.developer.developerProfile?.displayName || null,
    initiatorUserId: dispute.initiatorUserId,
    initiatorPersona: dispute.initiatorPersona,
    sourceStatus: dispute.sourceStatus,
    reasonType: dispute.reasonType,
    reasonText: dispute.reasonText,
    status: dispute.status,
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
    resolvedAt: dispute.resolvedAt,
    resolvedByUserId: dispute.resolvedByUserId,
    resolutionAction: dispute.resolutionAction,
    resolutionReason: dispute.resolutionReason,
    completionRequestedAt: dispute.task.completionRequestedAt,
    completionRequestExpiresAt: dispute.task.completionRequestExpiresAt,
    availableActions: dispute.status === 'OPEN' ? OPEN_DISPUTE_ACTIONS : [],
  };
}
