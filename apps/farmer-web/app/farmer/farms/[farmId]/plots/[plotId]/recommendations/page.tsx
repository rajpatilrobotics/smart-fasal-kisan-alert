import { RecommendationReadinessClient } from './recommendation-readiness-client';

export default async function PlotRecommendationsPage({
  params,
}: {
  readonly params: Promise<{ readonly farmId: string; readonly plotId: string }>;
}) {
  const { farmId, plotId } = await params;
  return <RecommendationReadinessClient farmId={farmId} plotId={plotId} />;
}
