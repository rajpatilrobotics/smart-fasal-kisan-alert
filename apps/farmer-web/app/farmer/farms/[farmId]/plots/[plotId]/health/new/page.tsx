import { NewHealthReportClient } from '../new-health-report-client';

export default async function NewHealthReportPage({
  params,
}: {
  readonly params: Promise<{ readonly farmId: string; readonly plotId: string }>;
}) {
  const { farmId, plotId } = await params;
  return <NewHealthReportClient farmId={farmId} plotId={plotId} />;
}
