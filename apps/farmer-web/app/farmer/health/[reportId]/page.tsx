import { HealthReportDetailsClient } from './health-report-details-client';

export default async function HealthReportDetailsPage({
  params,
}: {
  readonly params: Promise<{ readonly reportId: string }>;
}) {
  const { reportId } = await params;
  return <HealthReportDetailsClient reportId={reportId} />;
}
