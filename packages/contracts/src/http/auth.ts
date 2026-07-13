import { z } from 'zod';

import {
  AuthorizationContextSchema,
  CapabilityKeySchema,
  ConsentScopeSchema,
  ConsentStateSchema,
  PurposeCodeSchema,
  RevisionSchema,
  RoleTypeSchema,
  TimestampSchema,
  UuidSchema,
} from './common.js';

export const ReturnStateRequestSchema = z
  .object({
    routeKey: z.enum(['FARMER_HOME', 'RSK_HOME', 'MP_HOME']),
  })
  .strict()
  .meta({ id: 'ReturnStateRequest', 'x-data-classification': 'C1' });

export const ReturnStateResponseSchema = z
  .object({
    returnStateId: UuidSchema,
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'ReturnStateResponse', 'x-data-classification': 'C4' });

export const RoleSummarySchema = z
  .object({
    roleGrantId: UuidSchema,
    roleType: RoleTypeSchema,
    officeId: UuidSchema.optional(),
    jurisdictionId: UuidSchema.optional(),
    destination: z.enum(['/farmer/today', '/rsk/work', '/mp/overview']),
    capabilitySetVersion: z.int().positive(),
  })
  .strict();

export const SessionResponseSchema = z
  .object({
    subjectId: UuidSchema,
    subjectType: z.enum(['FARMER', 'STAFF']),
    environment: z.enum(['local', 'preview', 'staging', 'demo', 'production']),
    mfaState: z.enum(['NOT_REQUIRED', 'CURRENT', 'REQUIRED', 'EXPIRED']),
    deviceBindingState: z.enum(['ACTIVE', 'REQUIRED', 'REVOKED']),
    authorizationVersion: z.int().positive(),
    capabilitySetVersion: z.int().positive(),
    activeRoleContext: AuthorizationContextSchema.optional(),
    roles: z.array(RoleSummarySchema).max(12),
  })
  .strict()
  .meta({ id: 'SessionResponse', 'x-data-classification': 'C2' });

export const RoleContextResponseSchema = z
  .object({
    roleContext: AuthorizationContextSchema,
    issuedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'RoleContextResponse', 'x-data-classification': 'C2' });

export const ConsentRecordSchema = z
  .object({
    consentDecisionId: UuidSchema.optional(),
    scopeKey: ConsentScopeSchema,
    purposeKey: PurposeCodeSchema,
    targetKind: z.enum(['ACCOUNT', 'ASSISTED_FARMER_CONTEXT']),
    targetId: UuidSchema,
    state: ConsentStateSchema,
    accessVersion: z.int().positive(),
    expiresAt: TimestampSchema.optional(),
  })
  .strict();

export const ConsentListResponseSchema = z
  .object({
    items: z.array(ConsentRecordSchema).max(100),
    revision: RevisionSchema,
  })
  .strict()
  .meta({ id: 'ConsentListResponse', 'x-data-classification': 'C2' });

export const FarmerBootstrapResponseSchema = z
  .object({
    subjectId: UuidSchema,
    locale: z.enum(['mr', 'hi', 'en']),
    onboardingState: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']),
    authorizationVersion: z.int().positive(),
    capabilities: z.array(CapabilityKeySchema).max(10),
    farmContextState: z.literal('UNAVAILABLE_UNTIL_SETUP'),
  })
  .strict()
  .meta({ id: 'FarmerBootstrapResponse', 'x-data-classification': 'C2' });

export const RskBootstrapResponseSchema = z
  .object({
    subjectId: UuidSchema,
    officeId: UuidSchema,
    jurisdictionId: UuidSchema,
    authorizationVersion: z.int().positive(),
    capabilities: z.array(CapabilityKeySchema).max(50),
    workState: z.literal('UNAVAILABLE_UNTIL_WORK_MILESTONE'),
  })
  .strict()
  .meta({ id: 'RskBootstrapResponse', 'x-data-classification': 'C1' });

export const ProtectedDisclosureRequestSchema = z
  .object({
    targetKind: z.literal('ASSISTED_FARMER_CONTEXT'),
    targetId: UuidSchema,
    purposeKey: z.literal('assisted.service'),
    expectedAccessVersion: z.int().positive(),
    fieldSet: z.literal('CONTACT'),
  })
  .strict()
  .meta({ id: 'ProtectedDisclosureRequest', 'x-data-classification': 'C2' });

export const ProtectedDisclosureResponseSchema = z
  .object({
    targetId: UuidSchema,
    accessVersion: z.int().positive(),
    fields: z
      .object({
        displayName: z.string().min(1).max(160),
        contact: z.string().min(1).max(160),
      })
      .strict(),
    auditedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'ProtectedDisclosureResponse', 'x-data-classification': 'C3' });

export const MpQueryContextResponseSchema = z
  .object({
    state: z.literal('UNAVAILABLE'),
    code: z.literal('DEPENDENCY_UNAVAILABLE'),
    availableMetricKeys: z.array(z.never()).max(0),
    activeRelease: z.null(),
  })
  .strict()
  .meta({ id: 'MpQueryContextResponse', 'x-data-classification': 'C1' });
