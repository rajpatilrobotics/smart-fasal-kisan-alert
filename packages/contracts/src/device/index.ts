import { z } from 'zod';

import { TimestampSchema, UuidSchema } from '../http/common.js';

export const DeviceBatchReceiptSchema = z
  .object({
    batchId: UuidSchema,
    state: z.enum(['DURABLY_ACCEPTED', 'ALREADY_ACCEPTED', 'REJECTED']),
    receivedAt: TimestampSchema,
    explicitlyNotAgronomicTrust: z.literal(true),
  })
  .strict()
  .meta({ id: 'DeviceBatchReceipt', 'x-data-classification': 'C1' });
