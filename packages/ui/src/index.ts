/** Shared accessible presentation primitives only; no network or policy decisions. */

export const FARMER_SYNC_STATUS_LABELS = {
  SAVED_ON_THIS_PHONE: 'Saved on This Phone',
  WAITING_FOR_INTERNET: 'Waiting for Internet',
  SYNCED: 'Synced',
  CONFLICT: 'Conflict',
  LOCKED_RECOVERY: 'Locked Recovery',
  REJECTED: 'Rejected',
} as const;

export type FarmerSyncStatus = keyof typeof FARMER_SYNC_STATUS_LABELS;
