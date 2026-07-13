export const DATA_CLASSIFICATIONS = ['C0', 'C1', 'C2', 'C3', 'C4', 'P1'] as const;

export const DATA_MODES = ['LIVE', 'RECORDED', 'SIMULATED'] as const;

export const PROVENANCE_TYPES = [
  'SENSOR',
  'FARMER_MANUAL',
  'RSK_MANUAL',
  'LABORATORY',
  'SOIL_HEALTH_CARD',
  'WEATHER',
  'SATELLITE',
  'PUBLIC_MARKET',
  'DERIVED',
] as const;

export const ROLE_TYPES = ['FARMER', 'RSK', 'MP'] as const;

export const DEVICE_MODES = ['PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED'] as const;

export const ACTOR_TYPES = [
  'FARMER',
  'RSK_STAFF',
  'MP_STAFF',
  'SYSTEM',
  'DEVICE',
  'PROVIDER',
] as const;

export const CONSENT_SCOPES = [
  'location.processing',
  'audio.storage',
  'case.sharing',
  'sensor.collection',
  'sensor.maintenance_location',
  'visit.access',
  'assisted_service.access',
  'channel.app_push',
  'channel.sms',
  'channel.ivr',
  'market.private_fields',
] as const;

export const PURPOSE_CODES = [
  'farmer.self_service',
  'case.expert_support',
  'field.visit',
  'sensor.maintenance',
  'assisted.service',
  'alert.delivery',
  'market.support',
  'data.rights',
] as const;

export const CAPABILITY_KEYS = [
  'case.response.draft',
  'case.care_plan.issue',
  'case.severe.resolve',
  'advisory.review.decide',
  'alert.draft',
  'alert.approve',
  'alert.publish',
  'alert.delivery.monitor',
  'alert.delivery.operate',
  'sensor.agronomic_invalidate',
  'template.draft',
  'template.approve',
  'template.publish',
  'calendar.review',
  'market.support',
  'market.mapping.review',
  'market.mapping.approve',
  'assisted_session.operate',
  'visit.manage',
  'visit.execute.field',
  'visit.execute.sensor',
  'visit.outcome.review',
  'audit.investigate_sensitive',
  'rsk.work.read',
  'rsk.work.operate',
  'rsk.work.assign',
  'rsk.protected_search',
  'rsk.access_grant.issue',
  'rsk.protected_disclose',
  'case.read',
  'case.evidence.request',
  'case.follow_up.record',
  'case.resolve.routine',
  'advisory.review.read',
  'outreach.operate',
  'sensor.issue.operate',
  'sensor.install',
  'sensor.calibration.record',
  'sensor.maintenance.execute',
  'template.read',
  'alert.read',
  'identity.role_context.select',
  'profile.correct',
  'device_mode.change',
  'farmer.setup.write',
  'farmer.setup.complete',
  'farmer.farm.write',
  'farmer.plot.write',
  'farmer.voice.setup',
] as const;

export const PROBLEM_CODES = [
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'MFA_REQUIRED',
  'AUTHORIZATION_VERSION_CHANGED',
  'CONSENT_OR_ACCESS_VERSION_CHANGED',
  'DEVICE_BINDING_MISMATCH',
  'IDEMPOTENCY_KEY_REUSED',
  'EXPECTED_REVISION_MISMATCH',
  'INVALID_STATE_TRANSITION',
  'TOMBSTONED_ENTITY',
  'SOURCE_VERSION_EXPIRED',
  'EVIDENCE_INSUFFICIENT',
  'SYNC_CURSOR_INVALID',
  'SYNC_CURSOR_EXPIRED',
  'SYNC_BOOTSTRAP_REQUIRED',
  'SYNC_SCHEMA_UNSUPPORTED',
  'SYNC_BATCH_ID_REUSED',
  'CAUSAL_DEPENDENCY_UNSATISFIED',
  'ASSIGNMENT_CHANGED',
  'CLOCK_UNTRUSTED',
  'MEDIA_INTEGRITY_MISMATCH',
  'MEDIA_NOT_VERIFIED',
  'UPLOAD_INTENT_EXPIRED',
  'VOICE_PROPOSAL_EXPIRED',
  'VOICE_PROPOSAL_HASH_MISMATCH',
  'VISUAL_REVIEW_REQUIRED',
  'RELEASE_INVALIDATED',
  'RELEASE_UNAVAILABLE',
  'DEPENDENCY_UNAVAILABLE',
  'FILTER_NOT_ALLOWLISTED',
  'COMPARISON_NOT_RELEASABLE',
  'BATCH_ID_PAYLOAD_MISMATCH',
  'RATE_LIMITED',
  'SETUP_INCOMPLETE',
  'GPS_PERMISSION_DENIED',
  'HARDWARE_SKIPPED',
] as const;

export const CONSENT_STATES = ['MISSING', 'ALLOWED', 'DENIED', 'EXPIRED', 'WITHDRAWN'] as const;

export const COMMAND_DISPOSITIONS = [
  'ACCEPTED',
  'ALREADY_ACCEPTED',
  'REJECTED',
  'CONFLICT',
  'IN_PROGRESS',
] as const;

export const EVENT_CLASSES = [
  'CLIENT_LOCAL',
  'DOMAIN',
  'TECHNICAL',
  'COMMAND_RECEIPT',
  'AUDIT',
  'PRODUCT_TELEMETRY',
  'ANALYTICS_CANDIDATE',
  'ANALYTICS_SAFE',
] as const;
