import { HealthReportsClient } from './health-reports-client';

export default async function PlotHealthPage({
  params,
}: {
  readonly params: Promise<{ readonly farmId: string; readonly plotId: string }>;
}) {
  const { farmId, plotId } = await params;
  return <HealthReportsClient farmId={farmId} plotId={plotId} />;
}
