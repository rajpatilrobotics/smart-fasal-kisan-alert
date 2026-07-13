import { createDatabaseClient } from './client';
import { seedRuns } from './schema';

const client = createDatabaseClient();

try {
  await client.db.insert(seedRuns).values({
    profile: 'synthetic-foundation',
    metadata: {
      containsPersonalData: false,
      purpose: 'Milestone 0 environment verification',
    },
  });
} finally {
  await client.close();
}
