import { RecommendationDetailsClient } from './recommendation-details-client';

export default async function RecommendationDetailsPage({
  params,
}: {
  readonly params: Promise<{ readonly recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  return <RecommendationDetailsClient recommendationId={recommendationId} />;
}
