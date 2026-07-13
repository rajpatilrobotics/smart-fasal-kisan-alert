import { createSafeHttpRequestLogger } from '@smart-fasal/observability';

import { buildDomainApi } from './app.js';
import { API_BOUNDARY_CONFIG, SERVICE_CONFIG } from './config.js';
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
});

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
