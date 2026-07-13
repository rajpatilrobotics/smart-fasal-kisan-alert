import { z } from 'zod';

import { PurposeCodeSchema, RoleTypeSchema, TimestampSchema, UuidSchema } from '../http/common.js';

export const VoiceDelegationSchema = z
  .object({
    subjectId: UuidSchema,
    roleContextId: UuidSchema,
    roleType: RoleTypeSchema,
    purpose: PurposeCodeSchema,
    toolKey: z.string().min(1).max(120),
    consentAccessVersion: z.int().positive(),
    sessionId: UuidSchema,
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'VoiceDelegation', 'x-data-classification': 'C4' });
