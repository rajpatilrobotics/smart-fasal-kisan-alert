import { createHmac, randomBytes } from 'node:crypto';

import { CommandResultSchema } from '@smart-fasal/contracts/schemas';
import { createSafeHttpRequestLogger } from '@smart-fasal/observability';

import { buildDomainApi } from './app.js';
import { API_BOUNDARY_CONFIG, SERVICE_CONFIG } from './config.js';
import {
  dependencyUnavailable,
  type DomainOperationAdapter,
  type DomainOperationId,
} from './boundary.js';
import { FarmerSetupOperations } from './farmer-setup-operations.js';
import { InMemoryMilestoneTwoOperations } from './milestone-two-operations.js';
import { PostgresMilestoneTwoOperations } from './postgres-milestone-two.js';
import { createProductionIdentityBoundary } from './production-identity.js';
import { createProductionDomainComposition } from './production-operations.js';
import { createProductionPostgresBoundary } from './production-postgres.js';

const identityBoundary = createProductionIdentityBoundary({
  environment: API_BOUNDARY_CONFIG.environment,
  firebaseProjectId: API_BOUNDARY_CONFIG.firebaseProjectId,
  appIds: API_BOUNDARY_CONFIG.appIds,
  databaseUrls: API_BOUNDARY_CONFIG.databaseUrls,
  staffMfaMaximumAgeSeconds: API_BOUNDARY_CONFIG.staffMfaMaximumAgeSeconds,
});

const postgresBoundary = createProductionPostgresBoundary({
  environment: API_BOUNDARY_CONFIG.environment,
  databaseUrls: API_BOUNDARY_CONFIG.databaseUrls,
  appIds: API_BOUNDARY_CONFIG.appIds,
  ...(API_BOUNDARY_CONFIG.returnStateHmacSecret === undefined
    ? {}
    : { returnStateHmacSecret: API_BOUNDARY_CONFIG.returnStateHmacSecret }),
});

const composedOperations: { current?: DomainOperationAdapter } = {};
const localTimeKey = randomBytes(32);

function operationIdForSyncCommand(operation: string): DomainOperationId {
  if (operation === 'SaveFarmerSetupDraft') return 'saveFarmerSetupDraft';
  if (operation === 'CompleteFarmerSetup') return 'completeFarmerSetup';
  if (operation === 'UpdateFarmerPreferences') return 'updateFarmerPreferences';
  if (operation === 'ChangeDeviceMode') return 'changeFarmerDeviceMode';
  return 'recordConsentDecision';
}

const localMilestoneTwoOperations =
  SERVICE_CONFIG.NODE_ENV !== 'production' && API_BOUNDARY_CONFIG.environment === 'local'
    ? new InMemoryMilestoneTwoOperations({
        signServerTime: (timestamp) =>
          createHmac('sha256', localTimeKey).update(timestamp, 'utf8').digest('base64url'),
        commandExecutor: {
          async execute({ boundary, command }) {
            if (composedOperations.current === undefined) throw dependencyUnavailable();
            const result = CommandResultSchema.parse(
              await composedOperations.current.execute({
                operationId: operationIdForSyncCommand(command.operation),
                boundary: {
                  ...boundary,
                  idempotencyKey: command.commandId,
                  expectedRevision: command.expectedRevision,
                },
                body: {
                  commandSchemaVersion: 1,
                  operation: command.operation,
                  target: command.target,
                  expectedRevision: command.expectedRevision,
                  payload: command.payload,
                  clientContext: {
                    clientRecordedAt: command.occurredAt,
                    timezone: command.timezone,
                    dataModeClaim: 'SIMULATED',
                  },
                },
              }),
            );
            return {
              authoritativeRevision: result.result?.revision ?? command.expectedRevision + 1,
              eventIds: result.eventIds,
            };
          },
        },
      })
    : undefined;
const durableMilestoneTwoOperations =
  localMilestoneTwoOperations === undefined &&
  postgresBoundary.milestoneTwo !== undefined &&
  (SERVICE_CONFIG.NODE_ENV !== 'production' ||
    API_BOUNDARY_CONFIG.returnStateHmacSecret !== undefined)
    ? new PostgresMilestoneTwoOperations({
        port: postgresBoundary.milestoneTwo,
        signServerTime(timestamp) {
          const key = API_BOUNDARY_CONFIG.returnStateHmacSecret ?? localTimeKey;
          return createHmac('sha256', key)
            .update('sync-server-time\0', 'utf8')
            .update(timestamp, 'utf8')
            .digest('base64url');
        },
        commandExecutor: {
          async execute({ boundary, command }) {
            if (composedOperations.current === undefined) throw dependencyUnavailable();
            const result = CommandResultSchema.parse(
              await composedOperations.current.execute({
                operationId: operationIdForSyncCommand(command.operation),
                boundary: {
                  ...boundary,
                  idempotencyKey: command.commandId,
                  expectedRevision: command.expectedRevision,
                },
                body: {
                  commandSchemaVersion: 1,
                  operation: command.operation,
                  target: command.target,
                  expectedRevision: command.expectedRevision,
                  payload: command.payload,
                  clientContext: {
                    clientRecordedAt: command.occurredAt,
                    timezone: command.timezone,
                    dataModeClaim: 'SIMULATED',
                  },
                },
              }),
            );
            return {
              authoritativeRevision: result.result?.revision ?? command.expectedRevision + 1,
              eventIds: result.eventIds,
            };
          },
        },
      })
    : undefined;
const milestoneTwoOperations = localMilestoneTwoOperations ?? durableMilestoneTwoOperations;
const milestoneThreeOperations =
  SERVICE_CONFIG.NODE_ENV !== 'production' && API_BOUNDARY_CONFIG.environment === 'local'
    ? new FarmerSetupOperations()
    : undefined;

const operations = createProductionDomainComposition({
  ...(postgresBoundary.farmer === undefined ? {} : { farmer: postgresBoundary.farmer }),
  ...(postgresBoundary.rsk === undefined ? {} : { rsk: postgresBoundary.rsk }),
  ...(postgresBoundary.protectedDisclosure === undefined
    ? {}
    : { protectedDisclosure: postgresBoundary.protectedDisclosure }),
  ...(postgresBoundary.protectedFieldDecryptor === undefined
    ? {}
    : { protectedFieldDecryptor: postgresBoundary.protectedFieldDecryptor }),
  ...(postgresBoundary.returnState === undefined
    ? {}
    : { returnState: postgresBoundary.returnState }),
  ...(postgresBoundary.returnStateProtector === undefined
    ? {}
    : { returnStateProtector: postgresBoundary.returnStateProtector }),
  mpAppIds: API_BOUNDARY_CONFIG.appIds.mp,
  ...(milestoneTwoOperations === undefined ? {} : { milestoneTwoOperations }),
  ...(milestoneThreeOperations === undefined ? {} : { milestoneThreeOperations }),
  requireDurableMilestoneTwo: SERVICE_CONFIG.NODE_ENV === 'production',
});
composedOperations.current = operations.operations;

const requestLogger = createSafeHttpRequestLogger({
  sink: {
    write(line) {
      process.stdout.write(line);
    },
  },
});

const app = buildDomainApi({
  environment: API_BOUNDARY_CONFIG.environment,
  origins: API_BOUNDARY_CONFIG.origins,
  appIds: API_BOUNDARY_CONFIG.appIds,
  runtimeMode: SERVICE_CONFIG.NODE_ENV,
  identityVerifier: identityBoundary.identityVerifier,
  appCheckVerifier: identityBoundary.appCheckVerifier,
  authorizer: postgresBoundary.authorizer,
  operations: operations.operations,
  protectedDisclosure: operations.protectedDisclosure,
  readiness: async () =>
    identityBoundary.configured && operations.ready() && (await postgresBoundary.ready()),
  requestLogger,
});

const close = () => {
  void app.close();
};
process.once('SIGINT', close);
process.once('SIGTERM', close);
app.addHook('onClose', async () => {
  process.off('SIGINT', close);
  process.off('SIGTERM', close);
  await Promise.all([identityBoundary.close(), postgresBoundary.close()]);
});

await app.listen({ host: SERVICE_CONFIG.HOST, port: SERVICE_CONFIG.PORT });
