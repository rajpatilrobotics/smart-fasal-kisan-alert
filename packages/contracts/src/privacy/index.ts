import { z } from 'zod';

export const MpUnavailableResultSchema = z
  .object({
    status: z.literal('UNAVAILABLE'),
    reasonCode: z.enum(['NO_ACTIVE_RELEASE', 'RELEASE_INVALID', 'RELEASE_STALE']),
  })
  .strict()
  .meta({ id: 'MpUnavailableResult', 'x-data-classification': 'C1' });

export const MpSuppressedResultSchema = z
  .object({
    status: z.literal('SUPPRESSED'),
    reasonCode: z.enum(['COHORT_TOO_SMALL', 'COMPLEMENTARY_SUPPRESSION', 'STICKY_SUPPRESSION']),
    methodologyId: z.string().min(1).max(120),
  })
  .strict()
  .meta({ id: 'MpSuppressedResult', 'x-data-classification': 'C1' });

export const MpSafeResultSchema = z.discriminatedUnion('status', [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema,
]);
