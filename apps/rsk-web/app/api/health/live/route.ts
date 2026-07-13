import { createHealthPayload } from '@smart-fasal/health';

export function GET() {
  return Response.json(createHealthPayload('rsk-web', 'ok'), {
    headers: { 'Cache-Control': 'no-store' },
    status: 200,
  });
}
