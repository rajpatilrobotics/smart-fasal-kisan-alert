import { randomUUID } from 'node:crypto';

import {
  MediaOperationAcceptedResponseSchema,
  ProblemDetailsSchema,
  ScanMediaAssetRequestSchema,
  UuidSchema,
} from '@smart-fasal/contracts/schemas';
import { buildService, type ServiceOptions } from '@smart-fasal/service-runtime';

export interface MediaScanBoundary {
  verifyServiceIdentity(token: string): Promise<boolean>;
  scan(input: {
    assetId: string;
    storageEventId: string;
  }): Promise<{ operationId: string; assetId: string; state: 'SCANNING'; acceptedAt: string }>;
}

export interface MediaScannerAppOptions extends ServiceOptions {
  boundary?: MediaScanBoundary;
}

function problem(
  status: number,
  code: 'AUTHENTICATION_REQUIRED' | 'AUTHORIZATION_DENIED' | 'DEPENDENCY_UNAVAILABLE' | 'INVALID_STATE_TRANSITION',
  title: string,
) {
  return ProblemDetailsSchema.parse({
    type: `https://smart-fasal.invalid/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title,
    status,
    code,
    correlationId: randomUUID(),
    retryable: code === 'DEPENDENCY_UNAVAILABLE',
    fieldErrors: [],
  });
}

export function buildMediaScannerApp(options: MediaScannerAppOptions) {
  const app = buildService(options);

  app.post<{ Params: { assetWithAction: string } }>(
    '/internal/v1/media/assets/:assetWithAction',
    async (request, reply) => {
      const authorization = request.headers.authorization;
      const bearer =
        typeof authorization === 'string' ? /^Bearer ([^\s]+)$/u.exec(authorization)?.[1] : undefined;
      if (bearer === undefined) {
        return reply
          .type('application/problem+json')
          .code(401)
          .send(problem(401, 'AUTHENTICATION_REQUIRED', 'Service authentication is required.'));
      }
      if (options.boundary === undefined) {
        return reply
          .type('application/problem+json')
          .code(503)
          .send(problem(503, 'DEPENDENCY_UNAVAILABLE', 'The scanner boundary is unavailable.'));
      }
      let authenticated = false;
      try {
        authenticated = await options.boundary.verifyServiceIdentity(bearer);
      } catch {
        return reply
          .type('application/problem+json')
          .code(503)
          .send(problem(503, 'DEPENDENCY_UNAVAILABLE', 'Service identity verification is unavailable.'));
      }
      if (!authenticated) {
        return reply
          .type('application/problem+json')
          .code(403)
          .send(problem(403, 'AUTHORIZATION_DENIED', 'The scan request is denied.'));
      }

      const action = /^(.*):scan$/u.exec(request.params.assetWithAction);
      const assetId = UuidSchema.safeParse(action?.[1]);
      const body = ScanMediaAssetRequestSchema.safeParse(request.body);
      if (!assetId.success || !body.success || body.data.assetId !== assetId.data) {
        return reply
          .type('application/problem+json')
          .code(400)
          .send(problem(400, 'INVALID_STATE_TRANSITION', 'The scan request is invalid.'));
      }
      let response;
      try {
        response = MediaOperationAcceptedResponseSchema.parse(
          await options.boundary.scan({
            assetId: assetId.data,
            storageEventId: body.data.storageEventId,
          }),
        );
      } catch {
        return reply
          .type('application/problem+json')
          .code(503)
          .send(problem(503, 'DEPENDENCY_UNAVAILABLE', 'The scan operation is unavailable.'));
      }
      return reply.header('Cache-Control', 'no-store').code(202).send(response);
    },
  );

  return app;
}
